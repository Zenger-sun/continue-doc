/**
 * Message Store
 * Stores and manages chat messages that may be included in documentation.
 */

import * as vscode from "vscode";
import { DocMessage } from "../types";

export class MessageStore {
  private messages: DocMessage[] = [];
  private _onMessagesChanged = new vscode.EventEmitter<DocMessage[]>();
  public readonly onMessagesChanged = this._onMessagesChanged.event;

  /** Add a new message to the store */
  addMessage(
    role: "user" | "assistant",
    content: string,
    model?: string
  ): DocMessage {
    const msg: DocMessage = {
      id: this.generateId(),
      role,
      content,
      include: true, // Default: included
      timestamp: Date.now(),
      model,
    };
    this.messages.push(msg);
    this._onMessagesChanged.fire(this.messages);
    return msg;
  }

  /** Toggle include status of a message */
  toggleInclude(id: string): void {
    const msg = this.messages.find((m) => m.id === id);
    if (msg) {
      msg.include = !msg.include;
      this._onMessagesChanged.fire(this.messages);
    }
  }

  /** Set include status of a message */
  setInclude(id: string, include: boolean): void {
    const msg = this.messages.find((m) => m.id === id);
    if (msg) {
      msg.include = include;
      this._onMessagesChanged.fire(this.messages);
    }
  }

  /** Get all messages */
  getAllMessages(): DocMessage[] {
    return [...this.messages];
  }

  /** Get messages marked for inclusion */
  getIncludedMessages(): DocMessage[] {
    return this.messages.filter((m) => m.include);
  }

  /** Get a specific message by ID */
  getMessage(id: string): DocMessage | undefined {
    return this.messages.find((m) => m.id === id);
  }

  /** Remove a message */
  removeMessage(id: string): void {
    this.messages = this.messages.filter((m) => m.id !== id);
    this._onMessagesChanged.fire(this.messages);
  }

  /** Clear all messages */
  clear(): void {
    this.messages = [];
    this._onMessagesChanged.fire(this.messages);
  }

  /** Select all / deselect all */
  setAllInclude(include: boolean): void {
    this.messages.forEach((m) => (m.include = include));
    this._onMessagesChanged.fire(this.messages);
  }

  /** Get count of included messages */
  getIncludedCount(): number {
    return this.messages.filter((m) => m.include).length;
  }

  /** Get total count */
  getTotalCount(): number {
    return this.messages.length;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  dispose(): void {
    this._onMessagesChanged.dispose();
  }
}
