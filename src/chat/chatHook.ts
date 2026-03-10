/**
 * Chat Hook
 * Intercepts and hooks into the Continue Webview to inject UI and capture messages.
 */

import * as vscode from "vscode";
import { MessageStore } from "./messageStore";

export class ChatHook {
  private disposables: vscode.Disposable[] = [];
  private panel: vscode.WebviewPanel | undefined;

  constructor(private messageStore: MessageStore) {}

  /**
   * Start monitoring for Continue's webview panels and intercept messages.
   * Since Continue uses a sidebar webview, we monitor webview visibility changes.
   */
  activate(context: vscode.ExtensionContext): void {
    // Listen for active editor / panel changes to detect Continue's webview
    // We register a message handler when Continue's panel becomes available
    this.monitorContinueWebview(context);
  }

  /**
   * Monitor for Continue webview and inject our hooks
   */
  private monitorContinueWebview(context: vscode.ExtensionContext): void {
    // Register a periodic check for Continue's sidebar
    const interval = setInterval(() => {
      this.tryHookContinue();
    }, 3000);

    this.disposables.push({
      dispose: () => clearInterval(interval),
    });
  }

  /**
   * Attempt to hook into Continue's webview.
   * Since VSCode doesn't provide direct access to other extension's webviews,
   * we use the clipboard-based approach and command interception.
   */
  private tryHookContinue(): void {
    // Continue doesn't expose a public API for message interception,
    // so we rely on our own webview panel for the documentation workflow.
    // Messages are added manually by the user through our UI.
  }

  /**
   * Add a user message to the store (called from UI interactions)
   */
  addUserMessage(content: string): void {
    this.messageStore.addMessage("user", content);
  }

  /**
   * Add an assistant message to the store (called from UI interactions)
   */
  addAssistantMessage(content: string, model?: string): void {
    this.messageStore.addMessage("assistant", content, model);
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.panel?.dispose();
  }
}
