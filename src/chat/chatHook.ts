import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { MessageStore } from './messageStore';
import { logger } from '../utils/logger';

/**
 * Continue 消息内容片段 (content 为数组时的元素)
 */
interface ContentPart {
  type: string;           // "text" | "imageUrl"
  text?: string;          // type === "text" 时
  imageUrl?: { url: string };  // type === "imageUrl" 时
}

/**
 * Continue 对话历史条目
 */
interface HistoryItem {
  message: {
    role: string;                        // "user" | "assistant" | "thinking" | "tool" | "system"
    content: string | ContentPart[];     // assistant → string; user → ContentPart[]
    id?: string;
  };
  contextItems?: unknown[];
  [key: string]: unknown;
}

/**
 * Continue session 文件结构
 */
interface ContinueSessionFile {
  sessionId: string;
  title: string;
  workspaceDirectory?: string;
  history: HistoryItem[];
}

/**
 * sessions.json 索引条目
 */
interface SessionIndexEntry {
  sessionId: string;
  title: string;
  dateCreated: string;           // Unix timestamp as string
  workspaceDirectory?: string;
}

/**
 * 聊天钩子 - 监听 Continue 对话
 *
 * 通过读取 ~/.continue/sessions/ 目录下的 session 文件获取对话内容
 *
 * Continue 数据格式（通过实际文件验证）：
 * - sessions.json: 索引文件，列出所有 session 及其 workspaceDirectory
 * - {uuid}.json: 单个 session 数据，包含 history 数组
 * - history[].message.role: "user" | "assistant" | "thinking" | "tool" | "system"
 * - user content: ContentPart[]  (例 [{ type: "text", text: "..." }])
 * - assistant content: string
 */
export class ChatHook {
  private pollInterval: ReturnType<typeof setInterval> | undefined;
  private lastHistoryLength = 0;
  private lastSessionId: string | undefined;
  private isPolling = false;
  private readonly continueDir: string;
  private readonly sessionsDir: string;

  constructor(
    private readonly messageStore: MessageStore,
    private readonly workspaceRoot: string | undefined,
    private readonly pollIntervalMs: number = 3000
  ) {
    this.continueDir = path.join(os.homedir(), '.continue');
    this.sessionsDir = path.join(this.continueDir, 'sessions');
  }

  /**
   * 启动监听
   */
  start(): void {
    if (this.pollInterval) {
      return;
    }

    logger.info(`ChatHook: Starting polling (interval=${this.pollIntervalMs}ms)`);
    logger.info(`ChatHook: Sessions dir = ${this.sessionsDir}`);
    logger.info(`ChatHook: Workspace root = ${this.workspaceRoot || '(none)'}`);

    // 立即执行一次（捕获异常避免静默失败）
    this.pollSession().catch(err => {
      logger.error('ChatHook: Initial poll failed', err);
    });

    // 定时轮询
    this.pollInterval = setInterval(() => {
      this.pollSession().catch(err => {
        logger.error('ChatHook: Poll interval failed', err);
      });
    }, this.pollIntervalMs);
  }

  /**
   * 停止监听
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    this.isPolling = false;
    logger.info('ChatHook: Stopped polling');
  }

  /**
   * 手动刷新
   */
  async refresh(): Promise<void> {
    logger.info('ChatHook: Manual refresh triggered');
    // 重置计数，强制重新加载
    this.lastHistoryLength = 0;
    await this.pollSession();
  }

  /**
   * 轮询获取 Continue 会话
   */
  private async pollSession(): Promise<void> {
    if (this.isPolling) {
      return;
    }
    this.isPolling = true;

    try {
      await this.loadSessionFromFile();
    } catch (err) {
      logger.error('ChatHook: Poll cycle error', err);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * 从 Continue session 文件读取对话
   *
   * 策略：
   * 1. 读取 sessions.json 索引文件
   * 2. 优先匹配当前工作区的最新 session
   * 3. 如果没有匹配，取最新的 session
   * 4. 读取 session 文件，提取 user 和 assistant 消息
   */
  private async loadSessionFromFile(): Promise<void> {
    // Step 1: 找到目标 session ID
    const sessionId = await this.findActiveSessionId();
    if (!sessionId) {
      logger.debug('ChatHook: No active session found');
      return;
    }
    logger.debug(`ChatHook: Active session ID = ${sessionId}`);

    // Step 2: 如果 session 变了，重置
    if (sessionId !== this.lastSessionId) {
      logger.info(`ChatHook: Switching to session ${sessionId}`);
      this.lastSessionId = sessionId;
      this.lastHistoryLength = 0;
    }

    // Step 3: 读取 session 文件
    const sessionFilePath = path.join(this.sessionsDir, `${sessionId}.json`);
    let rawData: Uint8Array;
    try {
      rawData = await vscode.workspace.fs.readFile(vscode.Uri.file(sessionFilePath));
    } catch {
      logger.debug(`ChatHook: Session file not found: ${sessionFilePath}`);
      return;
    }

    let session: ContinueSessionFile;
    try {
      session = JSON.parse(Buffer.from(rawData).toString('utf-8'));
    } catch (err) {
      logger.warn('ChatHook: Failed to parse session JSON', err);
      return;
    }

    if (!session.history || session.history.length === 0) {
      logger.debug('ChatHook: Session has empty history');
      return;
    }
    logger.debug(`ChatHook: Session has ${session.history.length} history items`);

    // Step 4: 检查是否有新消息
    const historyLength = session.history.length;
    if (historyLength === this.lastHistoryLength) {
      return; // 没有变化
    }

    logger.info(`ChatHook: History changed ${this.lastHistoryLength} → ${historyLength}`);
    this.lastHistoryLength = historyLength;

    // Step 5: 提取 user 和 assistant 消息
    const messages = this.extractMessages(session.history);
    logger.info(`ChatHook: Extracted ${messages.length} user/assistant messages`);

    if (messages.length > 0) {
      this.messageStore.setMessages(messages);
    }
  }

  /**
   * 查找当前活跃的 session ID
   *
   * 优先级：
   * 1. sessions.json 中匹配当前工作区 + 最新创建的
   * 2. sessions.json 中最新创建的
   * 3. 目录中最近修改的 json 文件
   */
  private async findActiveSessionId(): Promise<string | null> {
    // 尝试读取 sessions.json 索引
    const indexPath = path.join(this.sessionsDir, 'sessions.json');
    try {
      const rawData = await vscode.workspace.fs.readFile(vscode.Uri.file(indexPath));
      const index = JSON.parse(Buffer.from(rawData).toString('utf-8')) as SessionIndexEntry[];

      if (!Array.isArray(index) || index.length === 0) {
        logger.debug('ChatHook: sessions.json is empty');
        return this.findSessionByModTime();
      }

      // 按 dateCreated 降序排序（取最新）
      const sorted = [...index].sort(
        (a, b) => Number(b.dateCreated) - Number(a.dateCreated)
      );

      // 优先匹配当前工作区
      if (this.workspaceRoot) {
        const workspaceUri = vscode.Uri.file(this.workspaceRoot).toString();
        // Continue 存的是 file:///d%3A/work/... 格式，做宽松匹配
        const normalizedRoot = this.workspaceRoot.replace(/\\/g, '/').toLowerCase();

        const matched = sorted.find(s => {
          if (!s.workspaceDirectory) return false;
          const decoded = decodeURIComponent(s.workspaceDirectory)
            .replace('file:///', '')
            .replace(/\//g, '/')
            .toLowerCase();
          return decoded === normalizedRoot ||
                 decoded.endsWith(normalizedRoot) ||
                 normalizedRoot.endsWith(decoded) ||
                 s.workspaceDirectory === workspaceUri;
        });

        if (matched) {
          logger.debug(`ChatHook: Found workspace-matched session: ${matched.sessionId} (${matched.title})`);
          return matched.sessionId;
        }
      }

      // 没匹配到工作区，用最新的
      logger.debug(`ChatHook: No workspace match, using latest session: ${sorted[0].sessionId}`);
      return sorted[0].sessionId;

    } catch {
      logger.debug('ChatHook: sessions.json not found, falling back to file mod time');
      return this.findSessionByModTime();
    }
  }

  /**
   * 备用方案：通过文件修改时间找最新 session
   */
  private async findSessionByModTime(): Promise<string | null> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(this.sessionsDir));
      const uuidJsonFiles = entries
        .filter(([name, type]) =>
          type === vscode.FileType.File &&
          name.endsWith('.json') &&
          name !== 'sessions.json' &&
          name.match(/^[0-9a-f]{8}-/)
        )
        .map(([name]) => name);

      if (uuidJsonFiles.length === 0) {
        logger.debug('ChatHook: No session files found');
        return null;
      }

      // 获取每个文件的修改时间
      const withStats = await Promise.all(
        uuidJsonFiles.map(async (name) => {
          const filePath = path.join(this.sessionsDir, name);
          const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
          return { name, mtime: stat.mtime };
        })
      );

      // 按修改时间降序
      withStats.sort((a, b) => b.mtime - a.mtime);
      const latest = withStats[0].name.replace('.json', '');
      logger.debug(`ChatHook: Latest session by mtime: ${latest}`);
      return latest;
    } catch (err) {
      logger.warn('ChatHook: Cannot read sessions directory', err);
      return null;
    }
  }

  /**
   * 从 history 数组中提取 user/assistant 消息
   *
   * Continue 数据格式：
   * - user: content 是 ContentPart[] → 提取 text 部分
   * - assistant: content 是 string（可能为空字符串表示 thinking 开始）
   * - thinking/tool/system: 忽略
   */
  private extractMessages(
    history: HistoryItem[]
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const item of history) {
      if (!item.message) continue;

      const role = item.message.role;

      // 只处理 user 和 assistant
      if (role !== 'user' && role !== 'assistant') {
        continue;
      }

      const content = this.resolveContent(item.message.content);

      // 跳过空内容（assistant 的空 content 通常是 thinking 标记前的占位）
      if (!content || content.trim().length === 0) {
        continue;
      }

      result.push({
        role: role as 'user' | 'assistant',
        content,
      });
    }

    return result;
  }

  /**
   * 统一解析 message.content
   *
   * Continue 实际格式：
   * - user: [{ type: "text", text: "..." }, { type: "imageUrl", imageUrl: { url: "..." } }]
   * - assistant: "plain string"
   */
  private resolveContent(content: string | ContentPart[] | unknown): string {
    // 情况 1: 已经是字符串
    if (typeof content === 'string') {
      return content;
    }

    // 情况 2: 是数组 (ContentPart[])
    if (Array.isArray(content)) {
      const textParts: string[] = [];

      for (const part of content) {
        if (part && typeof part === 'object') {
          const p = part as ContentPart;
          if (p.type === 'text' && p.text) {
            textParts.push(p.text);
          } else if (p.type === 'imageUrl' && p.imageUrl?.url) {
            textParts.push(`[Image: ${p.imageUrl.url.substring(0, 50)}...]`);
          }
        }
      }

      return textParts.join('\n');
    }

    // 情况 3: 其他类型，尝试 JSON 序列化
    if (content !== null && content !== undefined) {
      try {
        return JSON.stringify(content);
      } catch {
        return String(content);
      }
    }

    return '';
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.stop();
  }
}
