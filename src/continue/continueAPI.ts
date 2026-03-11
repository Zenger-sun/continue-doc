/**
 * Continue API 交互模块
 * Interacts with the Continue extension API to read chat history
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { DocMessage, MessageImage } from "../types";

/**
 * Continue 会话历史中的 content 片段（新版格式）
 * type 可能是 "text"、"imageUrl" 等
 */
interface ContinueContentPart {
  type: string;
  text?: string;
  imageUrl?: { url: string };
  image_url?: { url: string };
}

/**
 * Continue 会话历史中的单条消息
 */
interface ContinueHistoryMessage {
  role: string;
  content: string | ContinueContentPart[];
}

/**
 * Continue 历史条目（新版：嵌套在 message 字段下）
 */
interface ContinueHistoryItem {
  message: ContinueHistoryMessage;
  contextItems?: any[];
}

/**
 * Continue 会话历史格式
 */
interface ContinueSession {
  sessionId: string;
  title: string;
  dateCreated: string;
  history: (ContinueHistoryItem | ContinueHistoryMessage)[];
}

/**
 * sessions.json 中的会话元数据条目
 * Session metadata entry in sessions.json (maintained by Continue)
 */
interface ContinueSessionMeta {
  sessionId: string;
  title: string;
  dateCreated: string;
  workspaceDirectory?: string;
  messageCount?: number;
}

export class ContinueAPI {
  private outputChannel: vscode.OutputChannel;
  private currentActiveSessionId: string | null = null;
  private sessionTimestamps: Map<string, number> = new Map();
  private sessionChangeListeners: Array<(sessionId: string) => void> = [];

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * 获取 Continue 全局存储路径
   * Get the Continue global storage path (~/.continue)
   */
  private getContinueDir(): string {
    const homeDir =
      process.env.HOME || process.env.USERPROFILE || "";
    const continueDir = path.join(homeDir, ".continue");
    this.outputChannel.appendLine(`[ContinueAPI] Continue dir: ${continueDir}`);
    return continueDir;
  }

  /**
   * 获取 Continue 会话历史目录
   * Get the Continue session history directory
   */
  private getSessionsDir(): string {
    const sessionsDir = path.join(this.getContinueDir(), "sessions");
    const exists = fs.existsSync(sessionsDir);
    this.outputChannel.appendLine(
      `[ContinueAPI] Sessions dir: ${sessionsDir} (exists: ${exists})`
    );
    return sessionsDir;
  }

  /**
   * 获取 sessions.json 的路径
   * Get the path to sessions.json (Continue's session index file)
   */
  private getSessionsListPath(): string {
    return path.join(this.getSessionsDir(), "sessions.json");
  }

  /**
   * 读取所有会话列表（从 Continue 的 sessions.json 索引文件）
   * Read all available sessions from Continue's sessions.json index file.
   * Continue's HistoryManager.list() reverses this array, so the LAST entry
   * in sessions.json is the most recently created session.
   */
  async getSessions(): Promise<{ id: string; title: string; date: string }[]> {
    const sessionsListPath = this.getSessionsListPath();

    this.outputChannel.appendLine(
      `[ContinueAPI] Reading sessions list from: ${sessionsListPath}`
    );

    if (!fs.existsSync(sessionsListPath)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] sessions.json not found: ${sessionsListPath}`
      );
      return [];
    }

    try {
      const content = await fsp.readFile(sessionsListPath, "utf-8");
      const sessionsMeta: ContinueSessionMeta[] = JSON.parse(content);

      this.outputChannel.appendLine(
        `[ContinueAPI] sessions.json contains ${sessionsMeta.length} sessions`
      );

      if (!Array.isArray(sessionsMeta)) {
        this.outputChannel.appendLine(
          `[ContinueAPI] sessions.json is not an array.`
        );
        return [];
      }

      // Continue 的 sessions.json 按创建时间正序排列，最后一条是最新创建的
      // 我们反转它以便最新的排在前面（与 Continue 的 list() 行为一致）
      const sessions = sessionsMeta
        .filter((s) => typeof s.sessionId === "string" && s.sessionId)
        .map((s) => ({
          id: s.sessionId,
          title: s.title || "Untitled",
          date: s.dateCreated || "",
        }))
        .reverse();

      this.outputChannel.appendLine(
        `[ContinueAPI] Found ${sessions.length} sessions:`
      );
      for (const session of sessions.slice(0, 5)) {
        this.outputChannel.appendLine(
          `  - ${session.id}: "${session.title}" (${session.date})`
        );
      }
      if (sessions.length > 5) {
        this.outputChannel.appendLine(`  ... and ${sessions.length - 5} more`);
      }

      return sessions;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Error reading sessions.json: ${error.message}`
      );
      return [];
    }
  }

  /**
   * 读取指定会话的消息
   * Read messages from a specific session
   */
  async getSessionMessages(sessionId: string): Promise<DocMessage[]> {
    const sessionsDir = this.getSessionsDir();
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);

    this.outputChannel.appendLine(
      `[ContinueAPI] Reading session file: ${sessionFile}`
    );

    if (!fs.existsSync(sessionFile)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Session file not found: ${sessionFile}`
      );
      
      // 列出会话目录中的文件，帮助诊断
      try {
        if (fs.existsSync(sessionsDir)) {
          const files = fs.readdirSync(sessionsDir);
          this.outputChannel.appendLine(
            `[ContinueAPI] Files in sessions dir: ${files.join(", ")}`
          );
        }
      } catch (err: any) {
        this.outputChannel.appendLine(
          `[ContinueAPI] Could not list sessions dir: ${err.message}`
        );
      }
      
      return [];
    }

    try {
      const content = await fsp.readFile(sessionFile, "utf-8");
      const session = JSON.parse(content) as ContinueSession;

      this.outputChannel.appendLine(
        `[ContinueAPI] Session file size: ${content.length} bytes, history length: ${session.history?.length || 0}`
      );

      const messages = this.convertHistory(session.history || []);
      
      this.outputChannel.appendLine(
        `[ContinueAPI] Converted to ${messages.length} DocMessages`
      );
      
      return messages;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Error reading session: ${error.message}`
      );
      return [];
    }
  }

  /**
   * 获取当前活跃会话的消息（基于文件最后修改时间）
   * Get messages from the currently active session (based on file mtime)
   */
  async getLatestSessionMessages(): Promise<DocMessage[]> {
    const activeId = await this.getActiveSessionId();
    if (!activeId) {
      return [];
    }

    return this.getSessionMessages(activeId);
  }

  /**
   * 初始化会话时间戳缓存
   * Initialize session timestamps for tracking which sessions are most recently modified.
   * Scans all session files to populate the mtime cache.
   */
  async initializeSessionTimestamps(): Promise<void> {
    const sessionsDir = this.getSessionsDir();
    if (!fs.existsSync(sessionsDir)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Sessions directory does not exist, skipping timestamp initialization`
      );
      return;
    }

    try {
      const allFiles = await fsp.readdir(sessionsDir);
      const sessionFiles = allFiles.filter(
        (f) => f.endsWith(".json") && f !== "sessions.json"
      );

      this.outputChannel.appendLine(
        `[ContinueAPI] Initializing timestamps for ${sessionFiles.length} session files`
      );

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(sessionsDir, file);
          const stats = await fsp.stat(filePath);
          const sessionId = path.basename(file, ".json");
          this.sessionTimestamps.set(sessionId, stats.mtimeMs || 0);
        } catch {
          // Skip if file not accessible
        }
      }

      this.outputChannel.appendLine(
        `[ContinueAPI] Initialized timestamps for ${this.sessionTimestamps.size} session files.`
      );
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Error initializing timestamps: ${error.message}`
      );
    }
  }

  /**
   * 获取当前活跃的会话ID（基于文件最后修改时间）
   * Get the currently active session ID based on file modification time.
   * The session file most recently written to is the one currently open in Continue.
   */
  async getActiveSessionId(): Promise<string | null> {
    if (this.currentActiveSessionId) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Returning cached active session: ${this.currentActiveSessionId}`
      );
      return this.currentActiveSessionId;
    }

    // 通过文件修改时间找到当前活跃的会话
    const activeId = await this.findMostRecentlyModifiedSession();
    if (activeId) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Found most recently modified session: ${activeId}`
      );
      this.currentActiveSessionId = activeId;
      return activeId;
    }

    // 兜底：取 sessions.json 中最后一条（最新创建的）
    this.outputChannel.appendLine(
      `[ContinueAPI] No recently modified session found, falling back to latest from sessions.json`
    );
    const sessions = await this.getSessions();
    if (sessions.length === 0) {
      this.outputChannel.appendLine(
        `[ContinueAPI] No sessions available`
      );
      return null;
    }

    this.currentActiveSessionId = sessions[0].id;
    this.outputChannel.appendLine(
      `[ContinueAPI] Using first session from sessions.json: ${this.currentActiveSessionId}`
    );
    return this.currentActiveSessionId;
  }

  /**
   * 查找最近修改的会话文件（即 Continue 当前正在打开的对话）
   * Find the most recently modified session file.
   * When a user interacts with or switches to a session in Continue,
   * Continue writes to that session file, making its mtime the most recent.
   */
  private async findMostRecentlyModifiedSession(): Promise<string | null> {
    const sessionsDir = this.getSessionsDir();
    if (!fs.existsSync(sessionsDir)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Sessions directory does not exist: ${sessionsDir}`
      );
      return null;
    }

    try {
      const allFiles = await fsp.readdir(sessionsDir);
      const sessionFiles = allFiles.filter(
        (f) => f.endsWith(".json") && f !== "sessions.json"
      );

      this.outputChannel.appendLine(
        `[ContinueAPI] Found ${sessionFiles.length} session files in ${sessionsDir}`
      );

      let latestId: string | null = null;
      let latestMtime = 0;

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(sessionsDir, file);
          const stats = await fsp.stat(filePath);
          const mtime = stats.mtimeMs || 0;
          if (mtime > latestMtime) {
            latestMtime = mtime;
            latestId = path.basename(file, ".json");
          }
        } catch {
          // Skip inaccessible files
        }
      }

      if (latestId) {
        this.outputChannel.appendLine(
          `[ContinueAPI] Most recently modified session: ${latestId} (mtime: ${new Date(latestMtime).toISOString()})`
        );
      } else {
        this.outputChannel.appendLine(
          `[ContinueAPI] No session files found with valid mtime`
        );
      }

      return latestId;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Error finding most recent session: ${error.message}`
      );
      return null;
    }
  }

  /**
   * 注册会话变化监听器
   * Register a listener for when sessions change
   */
  onSessionChange(listener: (sessionId: string) => void): { dispose: () => void } {
    this.sessionChangeListeners.push(listener);
    return {
      dispose: () => {
        const idx = this.sessionChangeListeners.indexOf(listener);
        if (idx >= 0) {
          this.sessionChangeListeners.splice(idx, 1);
        }
      },
    };
  }

  /**
   * 通知所有监听器会话已变化
   * Notify all listeners that a session has changed
   */
  private notifySessionChange(sessionId: string): void {
    this.currentActiveSessionId = sessionId;
    for (const listener of this.sessionChangeListeners) {
      try {
        listener(sessionId);
      } catch (error: any) {
        this.outputChannel.appendLine(
          `[ContinueAPI] Error in session change listener: ${error.message}`
        );
      }
    }
  }

  /**
   * 更新会话时间戳并检测变化
   * Update session timestamps and detect which session was modified.
   * Scans all session files and finds the one with the most recently changed mtime.
   * Returns the session ID of the most recently modified session if a change was detected.
   */
  async updateSessionTimestamps(): Promise<string | null> {
    const sessionsDir = this.getSessionsDir();
    if (!fs.existsSync(sessionsDir)) {
      return null;
    }

    try {
      const allFiles = await fsp.readdir(sessionsDir);
      const sessionFiles = allFiles.filter(
        (f) => f.endsWith(".json") && f !== "sessions.json"
      );

      let mostRecentChangedId: string | null = null;
      let mostRecentChangedMtime = 0;

      for (const file of sessionFiles) {
        const sessionId = path.basename(file, ".json");
        const filePath = path.join(sessionsDir, file);
        try {
          const stats = await fsp.stat(filePath);
          const currentMtime = stats.mtimeMs || 0;
          const previousMtime = this.sessionTimestamps.get(sessionId) || 0;

          // 检测到文件有新的修改
          if (currentMtime > previousMtime) {
            // 追踪所有变化文件中 mtime 最新的那个
            if (currentMtime > mostRecentChangedMtime) {
              mostRecentChangedMtime = currentMtime;
              mostRecentChangedId = sessionId;
            }
          }

          // 更新缓存
          this.sessionTimestamps.set(sessionId, currentMtime);
        } catch {
          // Skip if file not accessible
        }
      }

      // 如果检测到变化，通知监听器
      if (mostRecentChangedId) {
        this.outputChannel.appendLine(
          `[ContinueAPI] Detected session change: ${mostRecentChangedId}`
        );
        this.notifySessionChange(mostRecentChangedId);
        return mostRecentChangedId;
      }

    return null;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Error updating timestamps: ${error.message}`
      );
      return null;
    }
  }

  /**
   * 将 Continue 历史条目转换为 DocMessage 格式
   * 兼容两种格式：
   *  旧版: history[i] = { role, content }
   *  新版: history[i] = { message: { role, content } }
   */
  private convertHistory(
    historyItems: (ContinueHistoryItem | ContinueHistoryMessage)[]
  ): DocMessage[] {
    const messages: DocMessage[] = [];
    let index = 0;

    for (const item of historyItems) {
      // 兼容新旧格式：新版在 item.message 下，旧版直接在 item 上
      const msg: ContinueHistoryMessage =
        (item as ContinueHistoryItem).message ?? (item as ContinueHistoryMessage);

      if (!msg || !msg.role) {
        continue;
      }

      // 只处理 user 和 assistant 角色的消息
      if (msg.role !== "user" && msg.role !== "assistant") {
        continue;
      }

      // 提取文本内容和图片：content 可能是 string 或 [{type,text}] 数组
      const { text: content, images } = this.extractContentAndImages(msg.content);

      if (!content && images.length === 0) {
        continue;
      }

      messages.push({
        id: `msg-${index}`,
        role: msg.role as "user" | "assistant",
        content: content || "",
        images: images.length > 0 ? images : undefined,
        include: true,
        timestamp: Date.now() - (historyItems.length - index) * 1000,
        model: undefined,
      });

      index++;
    }

    this.outputChannel.appendLine(
      `[ContinueAPI] Converted ${messages.length} messages from ${historyItems.length} history items.`
    );
    return messages;
  }

  /**
   * 从 content 字段提取文本和图片
   * content 可能是：
   *   - string（旧版 / assistant 消息）
   *   - [{type:"text", text:"..."}]（新版 user 消息）
   *   - [{type:"imageUrl", imageUrl:{url:"..."}}]（新版图片消息）
   */
  private extractContentAndImages(
    content: string | ContinueContentPart[] | any
  ): { text: string; images: MessageImage[] } {
    if (typeof content === "string") {
      return { text: content.trim(), images: [] };
    }
    if (Array.isArray(content)) {
      const textParts: string[] = [];
      const images: MessageImage[] = [];

      for (const part of content) {
        if (part.type === "text" && part.text) {
          textParts.push(part.text);
        } else if (
          part.type === "imageUrl" ||
          part.type === "image_url" ||
          part.type === "image"
        ) {
          // Continue 使用 imageUrl 或 image_url 字段存储图片 URL
          const url =
            part.imageUrl?.url ||
            part.image_url?.url ||
            (typeof part.url === "string" ? part.url : undefined);
          if (url) {
            images.push({ url });
          }
        }
      }

      return {
        text: textParts.join("\n").trim(),
        images,
      };
    }
    // 未知格式，尝试 JSON
    try {
      return { text: JSON.stringify(content), images: [] };
    } catch {
      return { text: "", images: [] };
    }
  }

  /**
   * 监视会话文件变化
   * Watch for session file changes
   */
  watchSessions(callback: () => void): vscode.Disposable {
    const sessionsDir = this.getSessionsDir();

    if (!fs.existsSync(sessionsDir)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Cannot watch: sessions directory not found.`
      );
      return new vscode.Disposable(() => {});
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(sessionsDir), "*.json")
    );

    watcher.onDidChange(() => callback());
    watcher.onDidCreate(() => callback());

    this.outputChannel.appendLine(
      `[ContinueAPI] Watching sessions directory: ${sessionsDir}`
    );

    return watcher;
  }
}
