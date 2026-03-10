/**
 * 消息存储和管理
 * Message storage and management
 */

import { DocMessage } from "../types";

export class MessageStore {
  private messages: DocMessage[] = [];
  private listeners: Array<() => void> = [];

  /**
   * 设置消息列表（替换所有消息）
   * Set the message list (replaces all messages)
   */
  setMessages(messages: DocMessage[]): void {
    this.messages = messages.map((msg) => ({ ...msg }));
    this.notifyListeners();
  }

  /**
   * 获取所有消息
   * Get all messages
   */
  getMessages(): DocMessage[] {
    return this.messages.map((msg) => ({ ...msg }));
  }

  /**
   * 获取已选中的消息
   * Get selected messages (include=true)
   */
  getSelectedMessages(): DocMessage[] {
    return this.messages.filter((msg) => msg.include).map((msg) => ({ ...msg }));
  }

  /**
   * 切换单条消息的选中状态
   * Toggle a single message's include state
   */
  toggleMessage(messageId: string): void {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.include = !msg.include;
      this.notifyListeners();
    }
  }

  /**
   * 全选/全不选
   * Select all / Deselect all
   */
  toggleAll(include?: boolean): void {
    const newState = include ?? !this.isAllSelected();
    for (const msg of this.messages) {
      msg.include = newState;
    }
    this.notifyListeners();
  }

  /**
   * 检查是否全选
   * Check if all messages are selected
   */
  isAllSelected(): boolean {
    return this.messages.length > 0 && this.messages.every((m) => m.include);
  }

  /**
   * 获取消息数量统计
   * Get message count statistics
   */
  getStats(): { total: number; selected: number } {
    return {
      total: this.messages.length,
      selected: this.messages.filter((m) => m.include).length,
    };
  }

  /**
   * 清空消息
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
    this.notifyListeners();
  }

  /**
   * 添加变化监听器
   * Add a change listener
   */
  onDidChange(listener: () => void): { dispose: () => void } {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const idx = this.listeners.indexOf(listener);
        if (idx >= 0) {
          this.listeners.splice(idx, 1);
        }
      },
    };
  }

  /**
   * 通知所有监听器
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
