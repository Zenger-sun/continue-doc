import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * 聊天消息数据结构
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  include: boolean;      // 是否纳入文档
  timestamp: number;
  model?: string;
  images?: string[];     // base64 或路径
}

/**
 * 消息存储管理
 * 负责保存对话记录，支持内存 + JSON 文件持久化
 */
export class MessageStore {
  private messages: ChatMessage[] = [];
  private readonly _onMessagesChanged = new vscode.EventEmitter<ChatMessage[]>();
  public readonly onMessagesChanged = this._onMessagesChanged.event;

  private sessionFilePath: string | undefined;

  constructor(private workspaceRoot?: string) {
    if (workspaceRoot) {
      this.sessionFilePath = path.join(workspaceRoot, '.continue-doc', 'session.json');
    }
  }

  /**
   * 初始化：从磁盘加载已保存的会话
   */
  async initialize(): Promise<void> {
    if (!this.sessionFilePath) {
      return;
    }

    try {
      const uri = vscode.Uri.file(this.sessionFilePath);
      const data = await vscode.workspace.fs.readFile(uri);
      const parsed = JSON.parse(Buffer.from(data).toString('utf-8'));
      if (Array.isArray(parsed)) {
        this.messages = parsed;
        logger.info(`Loaded ${this.messages.length} messages from session file`);
      }
    } catch {
      // 文件不存在或解析失败，使用空数组
      logger.debug('No existing session file found, starting fresh');
    }
  }

  /**
   * 添加消息
   */
  addMessage(role: 'user' | 'assistant', content: string, model?: string): ChatMessage {
    const msg: ChatMessage = {
      id: this.generateId(),
      role,
      content,
      include: true,  // 默认勾选
      timestamp: Date.now(),
      model,
    };
    this.messages.push(msg);
    this._onMessagesChanged.fire(this.messages);
    this.persistSession();
    logger.debug(`Added ${role} message, total: ${this.messages.length}`);
    return msg;
  }

  /**
   * 批量设置消息（用于从 Continue 同步整个对话）
   */
  setMessages(messages: Array<{ role: 'user' | 'assistant'; content: string; model?: string }>): void {
    // 保留现有消息的 include 状态
    const existingIncludes = new Map<string, boolean>();
    for (const msg of this.messages) {
      // 用 role+content hash 作为 key 来匹配
      existingIncludes.set(`${msg.role}:${msg.content.substring(0, 100)}`, msg.include);
    }

    const newMessages: ChatMessage[] = messages.map((m, index) => {
      const key = `${m.role}:${m.content.substring(0, 100)}`;
      const existingInclude = existingIncludes.get(key);

      // 尝试复用已有消息的 ID 和状态
      const existing = this.messages[index];
      if (existing && existing.role === m.role && existing.content === m.content) {
        return existing;
      }

      return {
        id: this.generateId(),
        role: m.role,
        content: m.content,
        include: existingInclude ?? true,
        timestamp: existing?.timestamp ?? Date.now(),
        model: m.model,
      };
    });

    this.messages = newMessages;
    this._onMessagesChanged.fire(this.messages);
    this.persistSession();
  }

  /**
   * 获取所有消息
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * 获取已选中的消息
   */
  getSelectedMessages(): ChatMessage[] {
    return this.messages.filter(m => m.include);
  }

  /**
   * 切换消息的 include 状态
   */
  toggleMessageInclude(messageId: string): void {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.include = !msg.include;
      this._onMessagesChanged.fire(this.messages);
      this.persistSession();
    }
  }

  /**
   * 全选 / 全不选
   */
  toggleSelectAll(): void {
    const allSelected = this.messages.every(m => m.include);
    const newState = !allSelected;
    for (const msg of this.messages) {
      msg.include = newState;
    }
    this._onMessagesChanged.fire(this.messages);
    this.persistSession();
  }

  /**
   * 清空消息
   */
  clear(): void {
    this.messages = [];
    this._onMessagesChanged.fire(this.messages);
    this.persistSession();
  }

  /**
   * 消息数量
   */
  get count(): number {
    return this.messages.length;
  }

  /**
   * 持久化到 JSON 文件
   */
  private async persistSession(): Promise<void> {
    if (!this.sessionFilePath) {
      return;
    }

    try {
      const dirUri = vscode.Uri.file(path.dirname(this.sessionFilePath));
      try {
        await vscode.workspace.fs.stat(dirUri);
      } catch {
        await vscode.workspace.fs.createDirectory(dirUri);
      }

      const uri = vscode.Uri.file(this.sessionFilePath);
      const data = Buffer.from(JSON.stringify(this.messages, null, 2), 'utf-8');
      await vscode.workspace.fs.writeFile(uri, data);
    } catch (err) {
      logger.error('Failed to persist session', err);
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this._onMessagesChanged.dispose();
  }
}
