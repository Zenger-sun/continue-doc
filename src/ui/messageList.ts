import * as vscode from 'vscode';
import { ChatMessage, MessageStore } from '../chat/messageStore';

/**
 * 消息列表 Webview 提供者
 * 在 VSCode 侧边栏中显示 Continue 对话消息列表
 *
 * UI 结构：
 * ┌──────────────────────────────────────────┐
 * │  ✅ [全选]           📊 已选 3 / 总计 5   │
 * │──────────────────────────────────────────│
 * │  ✅ 用户   │ 如何处理 SSH 公钥认证错误？   │
 * │  ✅ AI助手 │ 需要检查多个方面...            │
 * │  ❌ 用户   │ 能举个例子吗？                 │
 * │  ✅ AI助手 │ 当然，这是一个实例...           │
 * │  ✅ 用户   │ 非常感谢！                     │
 * │──────────────────────────────────────────│
 * │  [📝 生成文档]  [🚀 发布]  [⚙️ 配置]      │
 * └──────────────────────────────────────────┘
 */
export class MessageListProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'continue-doc.panel';

  private webviewView?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly messageStore: MessageStore,
    private currentLanguage: string
  ) {
    // 监听消息变更，更新 UI
    this.disposables.push(
      this.messageStore.onMessagesChanged(() => {
        this.updateWebview();
      })
    );
  }

  /**
   * 生成 nonce 用于 CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 解析 Webview 视图
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getWebviewContent(this.messageStore.getMessages());

    // 处理 Webview 消息
    webviewView.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
      undefined,
      this.disposables
    );
  }

  /**
   * 处理来自 Webview 的消息
   */
  private handleWebviewMessage(message: {
    type: string;
    messageId?: string;
    role?: string;
    content?: string;
  }): void {
    switch (message.type) {
      case 'toggleInclude':
        if (message.messageId) {
          this.messageStore.toggleMessageInclude(message.messageId);
        }
        break;

      case 'toggleSelectAll':
        this.messageStore.toggleSelectAll();
        break;

      case 'generateDocument':
        vscode.commands.executeCommand('continue-doc.generateDocument');
        break;

      case 'publishArticle':
        vscode.commands.executeCommand('continue-doc.publishArticle');
        break;

      case 'openConfig':
        vscode.commands.executeCommand('continue-doc.openConfig');
        break;

      case 'refresh':
        vscode.commands.executeCommand('continue-doc.refreshMessages');
        break;

      case 'addManualMessage':
        if (message.role && message.content) {
          const role = message.role as 'user' | 'assistant';
          this.messageStore.addMessage(role, message.content);
        }
        break;
    }
  }

  /**
   * 更新 Webview 内容
   * 使用 postMessage 增量更新，保留滚动位置和视图状态
   * 仅在 Webview 未初始化时使用全量 HTML 重写
   */
  updateWebview(): void {
    if (!this.webviewView) {
      return;
    }

    const messages = this.messageStore.getMessages();

    // 如果 Webview 已经初始化，通过 postMessage 增量更新
    this.webviewView.webview.postMessage({
      type: 'updateMessages',
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        include: msg.include,
        timestamp: msg.timestamp,
        imageCount: msg.images?.length ?? 0,
      })),
    });
  }

  /**
   * 更新语言设置
   */
  updateLanguage(language: string): void {
    this.currentLanguage = language;
    this.updateWebview();
  }

  /**
   * 生成 Webview HTML 内容
   */
  private getWebviewContent(messages: ChatMessage[]): string {
    const isZh = this.currentLanguage === 'zh';
    const selectedCount = messages.filter(m => m.include).length;
    const totalCount = messages.length;
    const allSelected = totalCount > 0 && selectedCount === totalCount;

    // i18n 文案
    const i18n = {
      title: isZh ? 'Continue-Doc' : 'Continue-Doc',
      selectAll: isZh ? '全选' : 'Select All',
      selected: isZh ? '已选' : 'Selected',
      total: isZh ? '总计' : 'Total',
      generate: isZh ? '📝 生成文档' : '📝 Generate Doc',
      publish: isZh ? '🚀 发布' : '🚀 Publish',
      config: isZh ? '⚙️ 配置' : '⚙️ Config',
      refresh: isZh ? '🔄 刷新' : '🔄 Refresh',
      noMessages: isZh ? '暂无消息，请在 Continue 中开始对话' : 'No messages yet. Start a conversation in Continue.',
      user: isZh ? '用户' : 'User',
      assistant: isZh ? 'AI 助手' : 'AI Assistant',
      addTestUser: isZh ? '添加测试用户消息' : 'Add test user message',
      addTestAI: isZh ? '添加测试AI消息' : 'Add test AI message',
    };

    const messagesHtml = messages.length > 0
      ? messages.map(msg => this.renderMessageItem(msg, i18n)).join('')
      : `<div class="empty-state">${i18n.noMessages}</div>`;

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>${i18n.title}</title>
  <style>
    :root {
      --bg-primary: var(--vscode-editor-background);
      --bg-secondary: var(--vscode-sideBar-background);
      --text-primary: var(--vscode-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --border-color: var(--vscode-panel-border);
      --accent-color: var(--vscode-button-background);
      --accent-hover: var(--vscode-button-hoverBackground);
      --accent-text: var(--vscode-button-foreground);
      --badge-bg: var(--vscode-badge-background);
      --badge-fg: var(--vscode-badge-foreground);
      --input-bg: var(--vscode-input-background);
      --input-border: var(--vscode-input-border);
      --checkbox-bg: var(--vscode-checkbox-background);
      --checkbox-border: var(--vscode-checkbox-border);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 0;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    /* 顶部工具栏 */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .select-all-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid var(--border-color);
      background: var(--input-bg);
      color: var(--text-primary);
      font-size: 12px;
    }

    .select-all-btn:hover {
      background: var(--accent-color);
      color: var(--accent-text);
    }

    .stats {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .stats .count {
      color: var(--accent-color);
      font-weight: bold;
    }

    .refresh-btn {
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid var(--border-color);
      background: var(--input-bg);
      color: var(--text-primary);
      font-size: 12px;
    }

    .refresh-btn:hover {
      background: var(--accent-color);
      color: var(--accent-text);
    }

    /* 消息列表 */
    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .message-item {
      display: flex;
      align-items: flex-start;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background 0.1s;
    }

    .message-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .message-item.excluded {
      opacity: 0.5;
    }

    .message-checkbox {
      margin-right: 8px;
      margin-top: 2px;
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: var(--accent-color);
    }

    .message-role {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 8px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .message-role.user {
      background: #2b5797;
      color: #fff;
    }

    .message-role.assistant {
      background: #1a7f37;
      color: #fff;
    }

    .message-content {
      flex: 1;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }

    .message-time {
      font-size: 10px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .image-badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
      background: var(--badge-bg);
      color: var(--badge-fg);
      margin-left: 4px;
      vertical-align: middle;
    }

    /* 空状态 */
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--text-secondary);
      font-size: 13px;
      text-align: center;
      padding: 20px;
    }

    /* 操作栏 */
    .action-bar {
      padding: 10px 12px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .action-row {
      display: flex;
      gap: 6px;
    }

    .action-btn {
      flex: 1;
      padding: 6px 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      transition: background 0.15s, transform 0.1s;
    }

    .action-btn:active {
      transform: scale(0.97);
    }

    .action-btn.primary {
      background: var(--accent-color);
      color: var(--accent-text);
    }

    .action-btn.primary:hover {
      background: var(--accent-hover);
    }

    .action-btn.secondary {
      background: var(--input-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* 测试区域 */
    .test-area {
      padding: 8px 12px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }

    .test-area summary {
      font-size: 11px;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .test-buttons {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }

    .test-btn {
      flex: 1;
      padding: 4px 8px;
      border: 1px dashed var(--border-color);
      border-radius: 3px;
      background: transparent;
      color: var(--text-secondary);
      font-size: 11px;
      cursor: pointer;
    }

    .test-btn:hover {
      border-color: var(--accent-color);
      color: var(--text-primary);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="select-all-btn" id="selectAllBtn">
          ${allSelected ? '✅' : '☐'} ${i18n.selectAll}
        </button>
        <span class="stats">
          <span class="count">${selectedCount}</span> ${i18n.selected} / ${totalCount} ${i18n.total}
        </span>
      </div>
      <div class="toolbar-right">
        <button class="refresh-btn" id="refreshBtn">🔄</button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list">
      ${messagesHtml}
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-row">
        <button class="action-btn primary" id="generateBtn" ${totalCount === 0 ? 'disabled' : ''}>
          ${i18n.generate}
        </button>
      </div>
      <div class="action-row">
        <button class="action-btn secondary" id="publishBtn" ${totalCount === 0 ? 'disabled' : ''}>
          ${i18n.publish}
        </button>
        <button class="action-btn secondary" id="configBtn">
          ${i18n.config}
        </button>
      </div>
    </div>

    <!-- 测试/调试区域 -->
    <div class="test-area">
      <details>
        <summary>🧪 Debug / Test</summary>
        <div class="test-buttons">
          <button class="test-btn" id="testUserBtn">
            + ${i18n.addTestUser}
          </button>
          <button class="test-btn" id="testAIBtn">
            + ${i18n.addTestAI}
          </button>
        </div>
      </details>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // i18n labels (injected at render time)
    const i18nLabels = {
      user: '${i18n.user}',
      assistant: '${i18n.assistant}',
      selectAll: '${i18n.selectAll}',
      selected: '${i18n.selected}',
      total: '${i18n.total}',
      noMessages: '${i18n.noMessages}',
    };

    // ─── 使用 addEventListener 绑定事件（避免 CSP 阻止 inline onclick） ───

    document.getElementById('selectAllBtn').addEventListener('click', function() {
      vscode.postMessage({ type: 'toggleSelectAll' });
    });

    document.getElementById('refreshBtn').addEventListener('click', function() {
      vscode.postMessage({ type: 'refresh' });
    });

    document.getElementById('generateBtn').addEventListener('click', function() {
      vscode.postMessage({ type: 'generateDocument' });
    });

    document.getElementById('publishBtn').addEventListener('click', function() {
      vscode.postMessage({ type: 'publishArticle' });
    });

    document.getElementById('configBtn').addEventListener('click', function() {
      vscode.postMessage({ type: 'openConfig' });
    });

    document.getElementById('testUserBtn').addEventListener('click', function() {
      addTestMessage('user');
    });

    document.getElementById('testAIBtn').addEventListener('click', function() {
      addTestMessage('assistant');
    });

    // ─── 消息列表使用事件委托 ───

    document.querySelector('.message-list').addEventListener('click', function(e) {
      var target = e.target;
      // 向上查找 message-item
      var item = target.closest('.message-item');
      if (!item) return;
      var msgId = item.getAttribute('data-msg-id');
      if (msgId) {
        vscode.postMessage({ type: 'toggleInclude', messageId: msgId });
      }
    });

    function addTestMessage(role) {
      var testMessages = {
        user: [
          'How do I fix SSH public key authentication errors?',
          'Can you show me an example of a React custom hook?',
          'What is the best way to handle errors in TypeScript?',
          'How to optimize Docker image size?',
        ],
        assistant: [
          'To fix SSH public key authentication errors, you need to check several things:\\n1. Ensure your public key is in ~/.ssh/authorized_keys\\n2. Check file permissions: chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys\\n3. Verify sshd_config has PubkeyAuthentication yes',
          'Here is an example of a React custom hook for data fetching:\\n\`\`\`tsx\\nfunction useFetch<T>(url: string) {\\n  const [data, setData] = useState<T | null>(null);\\n  useEffect(() => { fetch(url).then(r => r.json()).then(setData); }, [url]);\\n  return data;\\n}\\n\`\`\`',
          'In TypeScript, you can handle errors using:\\n1. Try-catch blocks with type guards\\n2. Custom error classes\\n3. Result/Either pattern\\n4. Error boundaries in React',
          'To optimize Docker image size:\\n1. Use multi-stage builds\\n2. Choose Alpine or distroless base images\\n3. Combine RUN commands\\n4. Use .dockerignore\\n5. Remove unnecessary dependencies',
        ],
      };

      var messages = testMessages[role];
      var content = messages[Math.floor(Math.random() * messages.length)];

      vscode.postMessage({ type: 'addManualMessage', role: role, content: content });
    }

    /**
     * Handle incremental updates from extension via postMessage
     * This preserves scroll position and view state
     */
    function escapeHtml(str) {
      return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderMessageItemHtml(msg) {
      var roleLabel = msg.role === 'user' ? i18nLabels.user : i18nLabels.assistant;
      var roleClass = msg.role;
      var time = new Date(msg.timestamp).toLocaleTimeString();
      var contentPreview = escapeHtml(msg.content).substring(0, 200);
      var imageBadge = msg.imageCount > 0
        ? '<span class="image-badge">\uD83D\uDDBC\uFE0F ' + msg.imageCount + '</span>'
        : '';

      return '<div class="message-item ' + (msg.include ? '' : 'excluded') + '" data-msg-id="' + msg.id + '">' +
        '<input type="checkbox" class="message-checkbox" ' + (msg.include ? 'checked' : '') + ' />' +
        '<span class="message-role ' + roleClass + '">' + roleLabel + imageBadge + '</span>' +
        '<div><div class="message-content">' + contentPreview + '</div>' +
        '<div class="message-time">' + time + '</div></div></div>';
    }

    window.addEventListener('message', function(event) {
      var message = event.data;
      if (message.type === 'updateMessages') {
        var messages = message.messages;
        var messageList = document.querySelector('.message-list');
        var generateBtnEl = document.getElementById('generateBtn');
        var publishBtnEl = document.getElementById('publishBtn');

        if (!messageList) return;

        // Update message list content
        if (messages.length === 0) {
          messageList.innerHTML = '<div class="empty-state">' + i18nLabels.noMessages + '</div>';
        } else {
          messageList.innerHTML = messages.map(renderMessageItemHtml).join('');
        }

        // Update toolbar stats
        var selectedCount = messages.filter(function(m) { return m.include; }).length;
        var totalCount = messages.length;
        var allSelected = totalCount > 0 && selectedCount === totalCount;

        var selectAllBtn = document.getElementById('selectAllBtn');
        var stats = document.querySelector('.stats');
        if (selectAllBtn) {
          selectAllBtn.innerHTML = (allSelected ? '\u2705' : '\u2610') + ' ' + i18nLabels.selectAll;
        }
        if (stats) {
          stats.innerHTML = '<span class="count">' + selectedCount + '</span> ' +
            i18nLabels.selected + ' / ' + totalCount + ' ' + i18nLabels.total;
        }

        // Update button disabled state
        if (generateBtnEl) generateBtnEl.disabled = totalCount === 0;
        if (publishBtnEl) publishBtnEl.disabled = totalCount === 0;
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * 渲染单条消息 HTML
   */
  private renderMessageItem(
    msg: ChatMessage,
    i18n: { user: string; assistant: string }
  ): string {
    const roleLabel = msg.role === 'user' ? i18n.user : i18n.assistant;
    const roleClass = msg.role;
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const contentPreview = msg.content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .substring(0, 200);

    const imageCount = msg.images?.length ?? 0;
    const imageBadge = imageCount > 0
      ? `<span class="image-badge">🖼️ ${imageCount}</span>`
      : '';

    return `
      <div class="message-item ${msg.include ? '' : 'excluded'}" data-msg-id="${msg.id}">
        <input
          type="checkbox"
          class="message-checkbox"
          ${msg.include ? 'checked' : ''}
        />
        <span class="message-role ${roleClass}">${roleLabel}${imageBadge}</span>
        <div>
          <div class="message-content">${contentPreview}</div>
          <div class="message-time">${time}</div>
        </div>
      </div>
    `;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
