/**
 * Webview UI 注入模块
 * Webview UI injection - provides the Continue-Doc panel UI
 */

import * as vscode from "vscode";
import { MessageStore } from "../chat/messageStore";
import { DocMessage, WebviewMessage } from "../types";
import { getTexts } from "../i18n";

export class InjectUI implements vscode.WebviewViewProvider {
  public static readonly viewType = "continue-doc.panel";

  private outputChannel: vscode.OutputChannel;
  private messageStore: MessageStore;
  private language: string;
  private webviewView: vscode.WebviewView | undefined;
  private onGenerateDoc: () => Promise<void>;
  private onPublish: () => Promise<void>;
  private onOpenConfig: () => Promise<void>;
  private onRefresh: () => Promise<void>;
  private storeListener: { dispose: () => void } | undefined;
  private webviewReady = false;

  constructor(
    outputChannel: vscode.OutputChannel,
    messageStore: MessageStore,
    language: string,
    callbacks: {
      onGenerateDoc: () => Promise<void>;
      onPublish: () => Promise<void>;
      onOpenConfig: () => Promise<void>;
      onRefresh: () => Promise<void>;
    }
  ) {
    this.outputChannel = outputChannel;
    this.messageStore = messageStore;
    this.language = language;
    this.onGenerateDoc = callbacks.onGenerateDoc;
    this.onPublish = callbacks.onPublish;
    this.onOpenConfig = callbacks.onOpenConfig;
    this.onRefresh = callbacks.onRefresh;
  }

  /**
   * 更新语言
   */
  updateLanguage(language: string): void {
    this.language = language;
    this.updateWebview();
  }

  /**
   * 实现 WebviewViewProvider 接口
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    // 监听来自 webview 的消息
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this.handleWebviewMessage(message);
    });

    // 监听消息存储变化
    this.storeListener?.dispose();
    this.storeListener = this.messageStore.onDidChange(() => {
      this.updateWebview();
    });

    // 重置 ready 状态，进行首次全量渲染
    this.webviewReady = false;
    this.updateWebview();

    this.outputChannel.appendLine("[InjectUI] Webview resolved.");
  }

  /**
   * 处理来自 webview 的消息
   */
  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "toggleMessage":
        this.messageStore.toggleMessage(message.payload?.id);
        break;
      case "toggleAll":
        this.messageStore.toggleAll(message.payload?.include);
        break;
      case "generateDoc":
        await this.onGenerateDoc();
        break;
      case "publish":
        await this.onPublish();
        break;
      case "openConfig":
        await this.onOpenConfig();
        break;
      case "ready":
        this.webviewReady = true;
        await this.onRefresh();
        this.updateWebview();
        break;
      default:
        this.outputChannel.appendLine(
          `[InjectUI] Unknown message type: ${message.type}`
        );
    }
  }

  /**
   * 更新 webview 内容
   * 使用 postMessage 进行增量更新以保留滚动位置；
   * 仅在首次或强制时使用全量 HTML 替换。
   */
  updateWebview(): void {
    if (!this.webviewView) {
      return;
    }

    const messages = this.messageStore.getMessages();
    const stats = this.messageStore.getStats();
    const allSelected = this.messageStore.isAllSelected();
    const texts = getTexts(this.language);

    // 尝试通过 postMessage 增量更新
    if (this.webviewReady) {
      this.webviewView.webview.postMessage({
        type: "messagesUpdated",
        payload: { messages, stats, allSelected, texts },
      });
      return;
    }

    // 首次全量渲染
    this.webviewView.webview.html = this.getHtml(
      messages,
      stats,
      allSelected,
      texts
    );
  }

  /**
   * 生成 webview HTML
   */
  private getHtml(
    messages: DocMessage[],
    stats: { total: number; selected: number },
    allSelected: boolean,
    texts: any
  ): string {
    const messageListHtml = messages
      .map(
        (msg) => `
        <div class="message-item" data-id="${msg.id}">
          <label class="checkbox-wrapper">
            <input type="checkbox" ${msg.include ? "checked" : ""} 
                   onchange="toggleMessage('${msg.id}')" />
            <span class="role-tag ${msg.role}">${msg.role === "user" ? texts.user : texts.assistant}</span>
            <span class="content-preview">${this.escapeHtml(this.truncate(msg.content, 80))}</span>
          </label>
        </div>`
      )
      .join("");

    return /* html */ `<!DOCTYPE html>
<html lang="${this.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 8px;
    }

    /* 操作栏 */
    .action-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      min-width: 80px;
      padding: 6px 8px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      text-align: center;
      transition: opacity 0.2s;
    }

    .action-btn:hover { opacity: 0.85; }

    .btn-generate {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-publish {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
    }

    .btn-config {
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border, #555);
    }

    /* 全选栏 */
    .select-all-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      border-bottom: 1px solid var(--vscode-panel-border, #333);
      margin-bottom: 6px;
    }

    .select-all-bar label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }

    .message-stats {
      font-size: 11px;
      opacity: 0.7;
    }

    /* 消息列表 */
    .message-list {
      max-height: calc(100vh - 140px);
      overflow-y: auto;
    }

    .message-item {
      padding: 4px 0;
      border-bottom: 1px solid var(--vscode-panel-border, #2a2a2a);
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
    }

    .checkbox-wrapper input[type="checkbox"] {
      flex-shrink: 0;
      cursor: pointer;
    }

    .role-tag {
      flex-shrink: 0;
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
    }

    .role-tag.user {
      background: var(--vscode-badge-background, #4fc1ff);
      color: var(--vscode-badge-foreground, #000);
    }

    .role-tag.assistant {
      background: var(--vscode-statusBarItem-prominentBackground, #9b59b6);
      color: #fff;
    }

    .content-preview {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      opacity: 0.85;
    }

    .no-messages {
      text-align: center;
      padding: 30px 10px;
      opacity: 0.5;
      font-size: 12px;
    }

    .refresh-btn {
      background: transparent;
      border: 1px solid var(--vscode-input-border, #555);
      color: var(--vscode-foreground);
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      margin-top: 8px;
    }

    .refresh-btn:hover { opacity: 0.8; }
  </style>
</head>
<body>
  <!-- 操作栏 -->
  <div class="action-bar">
    <button class="action-btn btn-generate" onclick="generateDoc()">${texts.generateDoc}</button>
    <button class="action-btn btn-publish" onclick="publish()">${texts.publish}</button>
    <button class="action-btn btn-config" onclick="openConfig()">${texts.settings}</button>
  </div>

  <!-- 全选栏 -->
  <div class="select-all-bar">
    <label>
      <input type="checkbox" id="selectAll" ${allSelected ? "checked" : ""} onchange="toggleAll()" />
      <span class="select-label">${allSelected ? texts.deselectAll : texts.selectAll}</span>
    </label>
    <span class="message-stats">${stats.selected}/${stats.total} ${texts.messageCount}</span>
  </div>

  <!-- 消息列表 -->
  <div class="message-list">
    ${
      messages.length > 0
        ? messageListHtml
        : `<div class="no-messages">
             <p>${texts.noMessages}</p>
             <button class="refresh-btn" onclick="refresh()">🔄 Refresh</button>
           </div>`
    }
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function toggleMessage(id) {
      vscode.postMessage({ type: 'toggleMessage', payload: { id } });
    }

    function toggleAll() {
      const checked = document.getElementById('selectAll').checked;
      vscode.postMessage({ type: 'toggleAll', payload: { include: checked } });
    }

    function generateDoc() {
      vscode.postMessage({ type: 'generateDoc' });
    }

    function publish() {
      vscode.postMessage({ type: 'publish' });
    }

    function openConfig() {
      vscode.postMessage({ type: 'openConfig' });
    }

    function refresh() {
      vscode.postMessage({ type: 'ready' });
    }

    // 监听来自扩展的增量更新消息
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'messagesUpdated') {
        const { messages, stats, allSelected, texts } = msg.payload;
        // 更新全选框
        const selectAllEl = document.getElementById('selectAll');
        if (selectAllEl) {
          selectAllEl.checked = allSelected;
          selectAllEl.parentElement.querySelector('.select-label').textContent =
            allSelected ? texts.deselectAll : texts.selectAll;
        }
        // 更新统计
        const statsEl = document.querySelector('.message-stats');
        if (statsEl) {
          statsEl.textContent = stats.selected + '/' + stats.total + ' ' + texts.messageCount;
        }
        // 更新消息列表
        const listEl = document.querySelector('.message-list');
        if (listEl && messages.length > 0) {
          let html = '';
          messages.forEach(function(m) {
            const roleLabel = m.role === 'user' ? texts.user : texts.assistant;
            const preview = m.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            const short = preview.length > 80 ? preview.substring(0, 80) + '...' : preview;
            const escaped = short.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            html += '<div class="message-item" data-id="' + m.id + '">' +
              '<label class="checkbox-wrapper">' +
              '<input type="checkbox" ' + (m.include ? 'checked' : '') +
              ' onchange="toggleMessage(\'' + m.id + '\')" />' +
              '<span class="role-tag ' + m.role + '">' + roleLabel + '</span>' +
              '<span class="content-preview">' + escaped + '</span>' +
              '</label></div>';
          });
          listEl.innerHTML = html;
        } else if (listEl && messages.length === 0) {
          listEl.innerHTML = '<div class="no-messages"><p>' + texts.noMessages + '</p>' +
            '<button class="refresh-btn" onclick="refresh()">🔄 Refresh</button></div>';
        }
      }
    });

    // 通知扩展 webview 已准备好
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * 截断文本
   */
  private truncate(text: string, maxLength: number): string {
    // 先把换行去掉变成单行
    const singleLine = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (singleLine.length <= maxLength) {
      return singleLine;
    }
    return singleLine.substring(0, maxLength) + "...";
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.storeListener?.dispose();
  }
}
