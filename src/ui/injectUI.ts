/**
 * Webview UI - aiDocExtra Panel
 * Provides a sidebar webview for managing messages, generating docs, and publishing.
 */

import * as vscode from "vscode";
import { MessageStore } from "../chat/messageStore";
import { DocMessage } from "../types";

export class AiDocPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = "aiDocExtra.panel";

  private view?: vscode.WebviewView;
  private _onAction = new vscode.EventEmitter<string>();
  public readonly onAction = this._onAction.event;

  constructor(
    private extensionUri: vscode.Uri,
    private messageStore: MessageStore
  ) {
    // Update the webview when messages change
    this.messageStore.onMessagesChanged(() => {
      this.updateWebview();
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message);
    });
  }

  /** Handle messages from the webview */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case "addMessage":
        this.messageStore.addMessage(
          message.role,
          message.content,
          message.model
        );
        break;

      case "toggleInclude":
        this.messageStore.toggleInclude(message.id);
        break;

      case "removeMessage":
        this.messageStore.removeMessage(message.id);
        break;

      case "selectAll":
        this.messageStore.setAllInclude(true);
        break;

      case "deselectAll":
        this.messageStore.setAllInclude(false);
        break;

      case "clearAll":
        this.messageStore.clear();
        break;

      case "generateDoc":
        this._onAction.fire("generateDoc");
        break;

      case "publish":
        this._onAction.fire("publish");
        break;

      case "openConfig":
        this._onAction.fire("openConfig");
        break;

      case "pasteFromClipboard":
        this.pasteFromClipboard(message.role);
        break;
    }
  }

  /** Paste content from clipboard as a message */
  private async pasteFromClipboard(
    role: "user" | "assistant"
  ): Promise<void> {
    const text = await vscode.env.clipboard.readText();
    if (text.trim()) {
      this.messageStore.addMessage(role, text.trim());
      vscode.window.showInformationMessage(
        `aiDocExtra: ${role === "user" ? "User" : "Assistant"} message added from clipboard.`
      );
    } else {
      vscode.window.showWarningMessage(
        "aiDocExtra: Clipboard is empty."
      );
    }
  }

  /** Update the webview with current messages */
  private updateWebview(): void {
    if (this.view) {
      this.view.webview.postMessage({
        command: "updateMessages",
        messages: this.messageStore.getAllMessages(),
        includedCount: this.messageStore.getIncludedCount(),
        totalCount: this.messageStore.getTotalCount(),
      });
    }
  }

  /** Generate the HTML content for the webview */
  private getHtmlContent(): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border);
      --btn-bg: var(--vscode-button-background);
      --btn-fg: var(--vscode-button-foreground);
      --btn-hover: var(--vscode-button-hoverBackground);
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --input-border: var(--vscode-input-border);
      --badge-bg: var(--vscode-badge-background);
      --badge-fg: var(--vscode-badge-foreground);
      --success: #4caf50;
      --warning: #ff9800;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--fg);
      background: var(--bg);
      padding: 8px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .header h2 {
      font-size: 14px;
      font-weight: 600;
    }

    .badge {
      background: var(--badge-bg);
      color: var(--badge-fg);
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 11px;
    }

    .actions {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .btn {
      background: var(--btn-bg);
      color: var(--btn-fg);
      border: none;
      padding: 6px 12px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn:hover {
      background: var(--btn-hover);
    }

    .btn.secondary {
      background: transparent;
      color: var(--fg);
      border: 1px solid var(--border);
    }

    .btn.secondary:hover {
      background: var(--input-bg);
    }

    .btn.primary {
      background: var(--success);
      color: white;
    }

    .btn.small {
      padding: 3px 8px;
      font-size: 11px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      margin: 12px 0 6px 0;
      text-transform: uppercase;
      opacity: 0.8;
    }

    .add-message-area {
      margin-bottom: 12px;
    }

    .input-group {
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }

    textarea {
      width: 100%;
      min-height: 60px;
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      border-radius: 3px;
      padding: 6px 8px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      resize: vertical;
    }

    textarea:focus {
      outline: 1px solid var(--btn-bg);
    }

    .role-selector {
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }

    .role-btn {
      flex: 1;
      padding: 4px;
      text-align: center;
      border: 1px solid var(--border);
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      background: transparent;
      color: var(--fg);
    }

    .role-btn.active {
      background: var(--btn-bg);
      color: var(--btn-fg);
      border-color: var(--btn-bg);
    }

    .message-list {
      margin-top: 8px;
    }

    .message-item {
      display: flex;
      gap: 8px;
      padding: 8px;
      margin-bottom: 6px;
      border: 1px solid var(--border);
      border-radius: 4px;
      align-items: flex-start;
    }

    .message-item.excluded {
      opacity: 0.5;
    }

    .message-item input[type="checkbox"] {
      margin-top: 3px;
      cursor: pointer;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-role {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 2px;
      color: var(--btn-bg);
    }

    .message-text {
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120px;
      overflow-y: auto;
    }

    .message-meta {
      font-size: 10px;
      opacity: 0.6;
      margin-top: 4px;
    }

    .message-actions {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: var(--fg);
      cursor: pointer;
      opacity: 0.5;
      font-size: 14px;
      padding: 2px;
    }

    .delete-btn:hover {
      opacity: 1;
      color: #f44336;
    }

    .empty-state {
      text-align: center;
      padding: 24px 12px;
      opacity: 0.6;
    }

    .empty-state p {
      margin-bottom: 8px;
      font-size: 12px;
    }

    .divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 12px 0;
    }

    .stats {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>aiDocExtra</h2>
    <span class="badge" id="badge">0 / 0</span>
  </div>

  <!-- Action Buttons -->
  <div class="actions">
    <button class="btn primary" onclick="action('generateDoc')" title="Generate document from selected messages">
      Generate Doc
    </button>
    <button class="btn" onclick="action('publish')" title="Publish a document">
      Publish
    </button>
    <button class="btn secondary" onclick="action('openConfig')" title="Open configuration file">
      Config
    </button>
  </div>

  <hr class="divider">

  <!-- Add Message Area -->
  <div class="add-message-area">
    <div class="section-title">Add Message</div>
    <div class="role-selector">
      <button class="role-btn active" id="roleUser" onclick="setRole('user')">User</button>
      <button class="role-btn" id="roleAssistant" onclick="setRole('assistant')">Assistant</button>
    </div>
    <textarea id="messageInput" placeholder="Paste or type a message here..."></textarea>
    <div class="input-group" style="margin-top: 6px;">
      <button class="btn small" onclick="addMessage()">Add</button>
      <button class="btn small secondary" onclick="pasteAndAdd()">Paste from Clipboard</button>
    </div>
  </div>

  <hr class="divider">

  <!-- Message List -->
  <div class="section-title">
    Messages
    <span class="stats" id="stats"></span>
  </div>
  <div class="actions" style="margin-bottom: 6px;">
    <button class="btn small secondary" onclick="action('selectAll')">Select All</button>
    <button class="btn small secondary" onclick="action('deselectAll')">Deselect All</button>
    <button class="btn small secondary" onclick="action('clearAll')">Clear</button>
  </div>
  <div class="message-list" id="messageList">
    <div class="empty-state" id="emptyState">
      <p>No messages yet.</p>
      <p>Add messages from your AI conversations to generate documentation.</p>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let currentRole = 'user';
    let messages = [];

    function setRole(role) {
      currentRole = role;
      document.getElementById('roleUser').classList.toggle('active', role === 'user');
      document.getElementById('roleAssistant').classList.toggle('active', role === 'assistant');
    }

    function addMessage() {
      const input = document.getElementById('messageInput');
      const content = input.value.trim();
      if (!content) return;

      vscode.postMessage({
        command: 'addMessage',
        role: currentRole,
        content: content,
      });

      input.value = '';
    }

    function pasteAndAdd() {
      vscode.postMessage({
        command: 'pasteFromClipboard',
        role: currentRole,
      });
    }

    function action(cmd) {
      vscode.postMessage({ command: cmd });
    }

    function toggleInclude(id) {
      vscode.postMessage({ command: 'toggleInclude', id: id });
    }

    function removeMessage(id) {
      vscode.postMessage({ command: 'removeMessage', id: id });
    }

    function renderMessages(msgs, includedCount, totalCount) {
      messages = msgs;
      const list = document.getElementById('messageList');
      const empty = document.getElementById('emptyState');
      const badge = document.getElementById('badge');
      const stats = document.getElementById('stats');

      badge.textContent = includedCount + ' / ' + totalCount;
      stats.textContent = '(' + includedCount + ' selected of ' + totalCount + ')';

      if (msgs.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.style.display = 'block';
        return;
      }

      empty.style.display = 'none';
      list.innerHTML = msgs.map(function(msg) {
        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString();
        const included = msg.include;

        return '<div class="message-item ' + (included ? '' : 'excluded') + '">'
          + '<input type="checkbox" ' + (included ? 'checked' : '') + ' onchange="toggleInclude(\\'' + msg.id + '\\')" title="Include in document">'
          + '<div class="message-content">'
          + '<div class="message-role">' + escapeHtml(msg.role) + '</div>'
          + '<div class="message-text">' + escapeHtml(msg.content) + '</div>'
          + '<div class="message-meta">' + timeStr + (msg.model ? ' · ' + escapeHtml(msg.model) : '') + '</div>'
          + '</div>'
          + '<div class="message-actions">'
          + '<button class="delete-btn" onclick="removeMessage(\\'' + msg.id + '\\')" title="Remove">×</button>'
          + '</div>'
          + '</div>';
      }).join('');
    }

    function escapeHtml(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Handle messages from the extension
    window.addEventListener('message', function(event) {
      const message = event.data;
      if (message.command === 'updateMessages') {
        renderMessages(message.messages, message.includedCount, message.totalCount);
      }
    });

    // Handle Enter key in textarea (Ctrl+Enter to add)
    document.getElementById('messageInput').addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 'Enter') {
        addMessage();
      }
    });
  </script>
</body>
</html>`;
  }

  /** Generate a random nonce for CSP */
  private getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  dispose(): void {
    this._onAction.dispose();
  }
}
