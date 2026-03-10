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
  private refreshInterval: ReturnType<typeof setInterval> | undefined;
  private refreshing = false; // 防止并发刷新

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
   * Initialize the hook to watch Continue chat messages
   */
  async initialize(): Promise<void> {
    this.outputChannel.appendLine("[ChatHook] Initializing chat hook...");

    // 加载最新会话的消息
    await this.refreshMessages();

    // 监视会话文件变化（防抖：500ms 内多次变化只刷新一次）
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    this.watcher = this.continueAPI.watchSessions(() => {
      if (debounceTimer) { clearTimeout(debounceTimer); }
      debounceTimer = setTimeout(() => {
        this.outputChannel.appendLine(
          "[ChatHook] Session file changed, refreshing messages..."
        );
        this.refreshMessages();
      }, 500);
    });

    // 定时刷新（作为兜底方案，30 秒刷新一次）
    this.refreshInterval = setInterval(() => {
      this.refreshMessages();
    }, 30000);

    this.outputChannel.appendLine("[ChatHook] Chat hook initialized.");
  }

  /**
   * 刷新消息列表
   * Refresh the message list from Continue
   */
  async refreshMessages(): Promise<void> {
    if (this.refreshing) {
      return; // 跳过并发刷新
    }
    this.refreshing = true;
    try {
      const messages = await this.continueAPI.getLatestSessionMessages();

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
      const messages = await this.continueAPI.getSessionMessages(sessionId);
      this.messageStore.setMessages(messages);
      this.outputChannel.appendLine(
        `[ChatHook] Loaded session: ${sessionId} (${messages.length} messages)`
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
      await this.loadSession(selected.sessionId);
    }
  }

  /**
   * 释放资源
   * Dispose resources
   */
  dispose(): void {
    this.watcher?.dispose();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
