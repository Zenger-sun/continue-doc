/**
 * Webview 注入和消息拦截
 * Webview injection and message interception from Continue chat
 */

import * as vscode from "vscode";
import { ContinueAPI } from "../continue/continueAPI";
import { MessageStore } from "./messageStore";
import { DocMessage } from "../types";

export class ChatHook {
  private outputChannel: vscode.OutputChannel;
  private continueAPI: ContinueAPI;
  private messageStore: MessageStore;
  private watcher: vscode.Disposable | undefined;
  private sessionChangeListener: { dispose: () => void } | undefined;
  private refreshInterval: ReturnType<typeof setInterval> | undefined;
  private refreshing = false; // 防止并发刷新
  private currentSessionId: string | null = null; // 追踪当前会话

  constructor(
    outputChannel: vscode.OutputChannel,
    continueAPI: ContinueAPI,
    messageStore: MessageStore
  ) {
    this.outputChannel = outputChannel;
    this.continueAPI = continueAPI;
    this.messageStore = messageStore;
  }

  /**
   * 初始化钩接
   * Initialize the hook to watch Continue chat messages and detect session changes
   */
  async initialize(): Promise<void> {
    this.outputChannel.appendLine("[ChatHook] Initializing chat hook...");

    // 初始化会话时间戳缓存
    await this.continueAPI.initializeSessionTimestamps();

    // 加载当前会话
    this.outputChannel.appendLine("[ChatHook] Getting active session ID...");
    this.currentSessionId = await this.continueAPI.getActiveSessionId();
    
    if (this.currentSessionId) {
      this.outputChannel.appendLine(
        `[ChatHook] Active session found: ${this.currentSessionId}`
      );
      await this.loadSession(this.currentSessionId);
    } else {
      this.outputChannel.appendLine(
        "[ChatHook] No active session found. Waiting for user to open a session..."
      );
    }

    // 监听会话变化（当Continue中用户切换对话时）
    this.sessionChangeListener = this.continueAPI.onSessionChange((sessionId: string) => {
      this.outputChannel.appendLine(
        `[ChatHook] Session changed in Continue: ${sessionId}`
      );
      this.currentSessionId = sessionId;
      this.loadSession(sessionId);
    });

    // 监视会话文件变化（防抖：500ms 内多次变化只刷新一次）
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    this.watcher = this.continueAPI.watchSessions(async () => {
      if (debounceTimer) { clearTimeout(debounceTimer); }
      debounceTimer = setTimeout(async () => {
        this.outputChannel.appendLine(
          "[ChatHook] Session files changed, checking for active session change..."
        );
        // 检测会话是否切换
        const changedSessionId = await this.continueAPI.updateSessionTimestamps();
        if (changedSessionId && changedSessionId !== this.currentSessionId) {
          // 会话已切换
          this.currentSessionId = changedSessionId;
          await this.loadSession(changedSessionId);
        } else {
          // 当前会话有更新，刷新消息
          await this.refreshMessages();
        }
      }, 500);
    });

    // 定时刷新（作为兜底方案，15 秒检查一次）
    this.refreshInterval = setInterval(async () => {
      // 检测会话是否切换
      const changedSessionId = await this.continueAPI.updateSessionTimestamps();
      if (changedSessionId && changedSessionId !== this.currentSessionId) {
        // 会话已切换
        this.currentSessionId = changedSessionId;
        await this.loadSession(changedSessionId);
      }
    }, 15000);

    this.outputChannel.appendLine("[ChatHook] Chat hook initialized.");
  }

  /**
   * 刷新消息列表（刷新当前正在追踪的会话）
   * Refresh the message list from the currently tracked session
   */
  async refreshMessages(): Promise<void> {
    if (this.refreshing) {
      return; // 跳过并发刷新
    }
    this.refreshing = true;
    try {
      // 优先使用当前追踪的会话ID，否则重新检测活跃会话
      const sessionId = this.currentSessionId || await this.continueAPI.getActiveSessionId();
      if (!sessionId) {
        this.outputChannel.appendLine(
          "[ChatHook] No active session to refresh."
        );
        return;
      }

      const messages = await this.continueAPI.getSessionMessages(sessionId);

      if (messages.length > 0) {
        // 保留之前的选择状态
        const oldMessages = this.messageStore.getMessages();
        const oldIncludeMap = new Map<string, boolean>();
        for (const msg of oldMessages) {
          // 用内容 hash 作为 key 保留选择状态
          const key = `${msg.role}:${msg.content.substring(0, 100)}`;
          oldIncludeMap.set(key, msg.include);
        }

        // 应用旧的选择状态到新消息
        const mergedMessages: DocMessage[] = messages.map((msg) => {
          const key = `${msg.role}:${msg.content.substring(0, 100)}`;
          const prevInclude = oldIncludeMap.get(key);
          return {
            ...msg,
            include: prevInclude !== undefined ? prevInclude : true,
          };
        });

        this.messageStore.setMessages(mergedMessages);
      }
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ChatHook] Error refreshing messages: ${error.message}`
      );
    } finally {
      this.refreshing = false;
    }
  }

  /**
   * 手动加载指定会话
   * Manually load a specific session
   */
  async loadSession(sessionId: string): Promise<void> {
    try {
      this.outputChannel.appendLine(
        `[ChatHook] Loading session: ${sessionId}...`
      );
      
      const messages = await this.continueAPI.getSessionMessages(sessionId);
      
      this.outputChannel.appendLine(
        `[ChatHook] Got ${messages.length} messages from session: ${sessionId}`
      );
      
      // 打印消息的详细信息用于调试
      for (let i = 0; i < Math.min(messages.length, 3); i++) {
        const msg = messages[i];
        this.outputChannel.appendLine(
          `  - Message ${i}: role=${msg.role}, content_length=${msg.content?.length || 0}`
        );
      }
      if (messages.length > 3) {
        this.outputChannel.appendLine(`  ... and ${messages.length - 3} more messages`);
      }
      
      if (messages.length > 0) {
        // 保留之前的选择状态（如果是同一会话）
        if (sessionId === this.currentSessionId) {
          const oldMessages = this.messageStore.getMessages();
          const oldIncludeMap = new Map<string, boolean>();
          for (const msg of oldMessages) {
            const key = `${msg.role}:${msg.content.substring(0, 100)}`;
            oldIncludeMap.set(key, msg.include);
          }

          // 应用旧的选择状态到新消息
          const mergedMessages: DocMessage[] = messages.map((msg) => {
            const key = `${msg.role}:${msg.content.substring(0, 100)}`;
            const prevInclude = oldIncludeMap.get(key);
            return {
              ...msg,
              include: prevInclude !== undefined ? prevInclude : true,
            };
          });

          this.messageStore.setMessages(mergedMessages);
          this.outputChannel.appendLine(
            `[ChatHook] Updated messages in store (preserved selection state)`
          );
        } else {
          // 新会话，不保留选择状态，默认全选
          this.messageStore.setMessages(messages);
          this.outputChannel.appendLine(
            `[ChatHook] Loaded new session messages (all selected by default)`
          );
        }
      } else {
        this.outputChannel.appendLine(
          `[ChatHook] Session has no messages yet`
        );
      }
      
      this.outputChannel.appendLine(
        `[ChatHook] Loaded session: ${sessionId} (${messages.length} messages, messageStore now has ${this.messageStore.getStats().total} messages)`
      );
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ChatHook] Error loading session: ${error.message}`
      );
    }
  }

  /**
   * 选择会话（让用户从列表中选择）
   * Let the user select a session from a list
   */
  async selectSession(): Promise<void> {
    const sessions = await this.continueAPI.getSessions();

    if (sessions.length === 0) {
      vscode.window.showInformationMessage(
        "No Continue sessions found."
      );
      return;
    }

    const items = sessions.map((s) => ({
      label: s.title,
      description: s.date,
      sessionId: s.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a Continue session",
    });

    if (selected) {
      this.currentSessionId = selected.sessionId;
      await this.loadSession(selected.sessionId);
    }
  }

  /**
   * 释放资源
   * Dispose resources
   */
  dispose(): void {
    this.watcher?.dispose();
    this.sessionChangeListener?.dispose();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
