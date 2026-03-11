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
  private onGenerateDoc: () => Promise<{ success: boolean; message: string }>;
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
      onGenerateDoc: () => Promise<{ success: boolean; message: string }>;
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
    this.outputChannel.appendLine("[InjectUI] Webview view provider resolved.");

    webviewView.webview.options = {
      enableScripts: true,
    };

    // 监听来自 webview 的消息
    this.outputChannel.appendLine("[InjectUI] Registering onDidReceiveMessage listener...");
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this.outputChannel.appendLine(
        `[InjectUI] Received message from webview: type=${message.type}`
      );
      this.handleWebviewMessage(message);
    });

    // 监听消息存储变化
    this.storeListener?.dispose();
    this.storeListener = this.messageStore.onDidChange(() => {
      this.outputChannel.appendLine(
        `[InjectUI] MessageStore changed, updating webview (${this.messageStore.getStats().total} messages)`
      );
      this.updateWebview();
    });

    // 重置 ready 状态，进行首次全量渲染
    this.webviewReady = false;
    this.outputChannel.appendLine("[InjectUI] Rendering webview HTML...");
    this.updateWebview();

    this.outputChannel.appendLine("[InjectUI] Webview resolved successfully.");
  }

  /**
   * 处理来自 webview 的消息
   */
  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case "toggleMessage":
          this.messageStore.toggleMessage(message.payload?.id);
          break;
        case "toggleAll":
          this.messageStore.toggleAll(message.payload?.include);
          break;
        case "generateDoc":
          this.outputChannel.appendLine("[InjectUI] generateDoc button clicked.");
          this.sendToWebview({ type: "setBusy", payload: { button: "generate", busy: true } });
          try {
            const result = await this.onGenerateDoc();
            this.outputChannel.appendLine(
              `[InjectUI] generateDoc result: success=${result.success}, message=${result.message}`
            );
            this.sendToWebview({
              type: "actionResult",
              payload: {
                button: "generate",
                success: result.success,
                message: result.success ? result.message : undefined,
                error: result.success ? undefined : result.message,
              },
            });
          } catch (e: any) {
            this.outputChannel.appendLine(
              `[InjectUI] generateDoc exception: ${e.message}`
            );
            this.sendToWebview({ type: "actionResult", payload: { button: "generate", success: false, error: e.message } });
          } finally {
            this.sendToWebview({ type: "setBusy", payload: { button: "generate", busy: false } });
          }
          break;
        case "publish":
          this.outputChannel.appendLine("[InjectUI] publish button clicked.");
          this.sendToWebview({ type: "setBusy", payload: { button: "publish", busy: true } });
          try {
            await this.onPublish();
            this.sendToWebview({ type: "actionResult", payload: { button: "publish", success: true } });
          } catch (e: any) {
            this.sendToWebview({ type: "actionResult", payload: { button: "publish", success: false, error: e.message } });
            throw e;
          } finally {
            this.sendToWebview({ type: "setBusy", payload: { button: "publish", busy: false } });
          }
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
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[InjectUI] Error handling message '${message.type}': ${error.message}`
      );
      vscode.window.showErrorMessage(
        `Continue-Doc: ${error.message}`
      );
    }
  }

  /**
   * 向 webview 发送消息
   * 优化：确保消息被可靠发送，即使在webview还未ready时也会尝试发送
   */
  private sendToWebview(message: { type: string; payload?: any }): void {
    if (!this.webviewView) {
      this.outputChannel.appendLine(
        `[InjectUI] Cannot send message '${message.type}': webviewView not initialized`
      );
      return;
    }

    // 即使webviewReady为false，也尝试发送关键消息（如setBusy）
    if (!this.webviewReady && message.type !== 'setBusy' && message.type !== 'actionResult') {
      this.outputChannel.appendLine(
        `[InjectUI] Webview not ready yet, queuing message: ${message.type}`
      );
      // 将消息排队，在webview ready后立即发送
      setTimeout(() => this.sendToWebview(message), 100);
      return;
    }

    try {
      this.webviewView.webview.postMessage(message);
      this.outputChannel.appendLine(
        `[InjectUI] Message sent to webview: ${message.type}`
      );
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[InjectUI] Error sending message '${message.type}': ${error.message}`
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
      transition: opacity 0.2s, background 0.2s, box-shadow 0.2s;
      position: relative;
    }

    .action-btn:hover:not(:disabled) {
      opacity: 0.85;
      box-shadow: 0 0 8px rgba(255,255,255,0.1);
    }

    .action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-btn:active:not(:disabled) {
      opacity: 0.7;
    }

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

    /* loading 动画 */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .btn-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 4px;
    }

    /* 状态栏 */
    .status-bar {
      padding: 8px 10px;
      margin-bottom: 6px;
      border-radius: 3px;
      font-size: 12px;
      display: none;
      font-weight: 500;
      border-left: 3px solid transparent;
    }

    .status-bar.visible { display: block; animation: pulse 0.3s ease-in-out; }
    .status-bar.success { 
      background: rgba(72,199,142,0.15);
      color: #48c78e;
      border-left-color: #48c78e;
    }
    .status-bar.error {
      background: rgba(241,70,104,0.15);
      color: #f14668;
      border-left-color: #f14668;
    }
    .status-bar.info {
      background: rgba(62,142,208,0.15);
      color: #3e8ed0;
      border-left-color: #3e8ed0;
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
      max-height: calc(100vh - 180px);
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
      opacity: 0.6;
      font-size: 12px;
      line-height: 1.6;
    }

    .no-messages p {
      margin-bottom: 12px;
      opacity: 0.8;
    }

    .refresh-btn {
      background: transparent;
      border: 1px solid var(--vscode-input-border, #555);
      color: var(--vscode-foreground);
      padding: 6px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 12px;
      transition: all 0.2s;
    }

    .refresh-btn:hover {
      opacity: 0.8;
      background: rgba(255,255,255,0.05);
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .refresh-btn:active {
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <!-- 操作栏 -->
  <div class="action-bar">
    <button class="action-btn btn-generate" id="btnGenerate" onclick="generateDoc()">${texts.generateDoc}</button>
    <button class="action-btn btn-publish" id="btnPublish" onclick="publish()">${texts.publish}</button>
    <button class="action-btn btn-config" onclick="openConfig()">${texts.settings}</button>
  </div>

  <!-- 状态栏 -->
  <div class="status-bar" id="statusBar"></div>

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
             <p style="opacity: 0.5; font-size: 11px; margin-top: 8px;">${texts.clickRefreshToLoad || "Click Refresh button to load messages"}</p>
             <button class="refresh-btn" onclick="refresh()">🔄 ${texts.refresh || "Refresh"}</button>
           </div>`
    }
  </div>

  <script>
    let vscode;
    try {
      vscode = acquireVsCodeApi();
      console.log('[Webview] acquireVsCodeApi() succeeded');
    } catch (e) {
      console.error('[Webview] acquireVsCodeApi() failed:', e);
      vscode = null;
    }

    // 按钮原始文字缓存
    const btnLabels = {};

    function toggleMessage(id) {
      if (!vscode) { console.error('[Webview] vscode not available'); return; }
      console.log('[Webview] toggleMessage called:', id);
      vscode.postMessage({ type: 'toggleMessage', payload: { id } });
    }

    function toggleAll() {
      if (!vscode) { console.error('[Webview] vscode not available'); return; }
      const checked = document.getElementById('selectAll').checked;
      console.log('[Webview] toggleAll called:', checked);
      vscode.postMessage({ type: 'toggleAll', payload: { include: checked } });
    }

    function generateDoc() {
      if (!vscode) { console.error('[Webview] vscode not available'); return; }
      const btn = document.getElementById('btnGenerate');
      if (btn && btn.disabled) {
        console.log('[Webview] generateDoc: button is disabled, ignoring');
        return;
      }
      console.log('[Webview] generateDoc: posting message to extension');
      vscode.postMessage({ type: 'generateDoc' });
    }

    function publish() {
      if (!vscode) { console.error('[Webview] vscode not available'); return; }
      const btn = document.getElementById('btnPublish');
      if (btn && btn.disabled) {
        console.log('[Webview] publish: button is disabled, ignoring');
        return;
      }
      console.log('[Webview] publish: posting message to extension');
      vscode.postMessage({ type: 'publish' });
    }

    function openConfig() {
      if (!vscode) { console.error('[Webview] vscode not available'); return; }
      console.log('[Webview] openConfig: posting message to extension');
      vscode.postMessage({ type: 'openConfig' });
    }

    function refresh() {
      if (!vscode) { console.error('[Webview] vscode not available'); return; }
      console.log('[Webview] refresh: posting message to extension');
      vscode.postMessage({ type: 'ready' });
    }

    /** 设置按钮 loading 状态 */
    function setBtnBusy(btnId, busy) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      if (busy) {
        btnLabels[btnId] = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span>' + btnLabels[btnId];
      } else {
        btn.disabled = false;
        if (btnLabels[btnId]) {
          btn.innerHTML = btnLabels[btnId];
        }
      }
    }

    /** 显示状态栏 */
    function showStatus(text, type, autoHideMs) {
      const bar = document.getElementById('statusBar');
      if (!bar) return;
      bar.textContent = text;
      bar.className = 'status-bar visible ' + type;
      console.log('[UI] Status:', text, type);
      if (autoHideMs > 0) {
        setTimeout(function() {
          bar.className = 'status-bar';
        }, autoHideMs);
      }
    }

    // 按钮名称 -> DOM id 映射
    var btnMap = { generate: 'btnGenerate', publish: 'btnPublish' };

    // 监听来自扩展的消息
    window.addEventListener('message', function(event) {
      var msg = event.data;
      console.log('[UI] Received message:', msg.type, msg);

      if (msg.type === 'setBusy') {
        var id = btnMap[msg.payload.button];
        if (id) {
          setBtnBusy(id, msg.payload.busy);
          console.log('[UI] Button', msg.payload.button, msg.payload.busy ? 'busy' : 'ready');
        }
        return;
      }

      if (msg.type === 'actionResult') {
        var success = msg.payload.success;
        var text = success ? msg.payload.message : msg.payload.error;
        var type = success ? 'success' : 'error';
        console.log('[UI] Action result:', type, text);
        showStatus((success ? '✔ ' : '✘ ') + (text || (success ? 'Done' : 'Failed')), type, success ? 4000 : 6000);
        return;
      }

      if (msg.type === 'messagesUpdated') {
        var messages = msg.payload.messages;
        var stats   = msg.payload.stats;
        var allSelected = msg.payload.allSelected;
        var texts   = msg.payload.texts;

        console.log('[UI] Messages updated:', messages.length);

        // 更新全选框
        var selectAllEl = document.getElementById('selectAll');
        if (selectAllEl) {
          selectAllEl.checked = allSelected;
          selectAllEl.parentElement.querySelector('.select-label').textContent =
            allSelected ? texts.deselectAll : texts.selectAll;
        }
        // 更新统计
        var statsEl = document.querySelector('.message-stats');
        if (statsEl) {
          statsEl.textContent = stats.selected + '/' + stats.total + ' ' + texts.messageCount;
        }
        // 更新消息列表
        var listEl = document.querySelector('.message-list');
        if (listEl && messages.length > 0) {
          var html = '';
          messages.forEach(function(m) {
            var roleLabel = m.role === 'user' ? texts.user : texts.assistant;
            var preview = (m.content || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            var short = preview.length > 80 ? preview.substring(0, 80) + '...' : preview;
            var escaped = short.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            var imgBadge = (m.images && m.images.length > 0) ? ' \uD83D\uDDBC' : '';
            html += '<div class="message-item" data-id="' + m.id + '">' +
              '<label class="checkbox-wrapper">' +
              '<input type="checkbox" ' + (m.include ? 'checked' : '') +
              ' onchange="toggleMessage(\'' + m.id + '\')" />' +
              '<span class="role-tag ' + m.role + '">' + roleLabel + '</span>' +
              '<span class="content-preview">' + escaped + imgBadge + '</span>' +
              '</label></div>';
          });
          listEl.innerHTML = html;
        } else if (listEl && messages.length === 0) {
          listEl.innerHTML = '<div class="no-messages"><p>' + texts.noMessages + '</p>' +
            '<button class="refresh-btn" onclick="refresh()">\uD83D\uDD04 Refresh</button></div>';
        }
      }
    });

    // 确保 vscode API 可用
    if (vscode) {
      console.log('[Webview] Registering window message listener...');
      console.log('[Webview] Webview initialization complete, ready to receive messages');
      
      // 通知扩展 webview 已准备好
      console.log('[Webview] Posting ready message to extension');
      vscode.postMessage({ type: 'ready' });
    } else {
      console.error('[Webview] vscode API not available, webview communication will fail');
    }
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
