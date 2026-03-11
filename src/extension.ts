import * as vscode from 'vscode';
import { ContinueDetector } from './continue/continueDetector';
import { ContinueAPI } from './continue/continueAPI';
import { ChatHook } from './chat/chatHook';
import { MessageStore } from './chat/messageStore';
import { MessageListProvider } from './ui/messageList';
import { ActionBar } from './ui/actionBar';
import { DocGenerator } from './doc/docGenerator';
import { ConfigLoader } from './config/configLoader';
import { Publisher } from './publish/publisher';
import { logger } from './utils/logger';
import {
  ContinueNotFoundError,
  NoMessagesSelectedError,
  DocGenerationError,
} from './utils/errors';

/**
 * Continue-Doc 插件主入口
 *
 * 激活流程：
 * 1. 检测 Continue 是否安装
 * 2. 初始化核心模块
 * 3. 注册命令和视图
 * 4. 开始监听 Continue 对话
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('Continue-Doc: Activating extension...');

  // ─── 1. 检测 Continue ────────────────────────────────────
  if (!ContinueDetector.isInstalled()) {
    const diagnostics = ContinueDetector.getDiagnostics();
    logger.warn('Continue extension not found', diagnostics);
    vscode.window.showWarningMessage(
      'Continue-Doc: Continue extension not found. Please install Continue first.',
      'Install Continue'
    ).then(action => {
      if (action === 'Install Continue') {
        vscode.commands.executeCommand(
          'workbench.extensions.installExtension',
          'continue.continue'
        );
      }
    });
    // 即使 Continue 未安装也继续激活（可使用测试消息功能）
  } else {
    const version = ContinueDetector.getVersion();
    logger.info(`Continue detected: v${version}`);
  }

  // ─── 2. 获取工作区根目录 ──────────────────────────────────
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    logger.warn('No workspace folder open');
  }

  // ─── 3. 初始化核心模块 ────────────────────────────────────

  // 配置加载器
  const configLoader = new ConfigLoader(workspaceRoot || '');
  await configLoader.load();
  const language = configLoader.getLanguage();

  // 消息存储
  const messageStore = new MessageStore(workspaceRoot);
  await messageStore.initialize();

  // Continue API
  const continueAPI = new ContinueAPI();
  await continueAPI.initialize();

  // 聊天钩子（传入 workspaceRoot 用于匹配当前工作区的 session）
  const chatHook = new ChatHook(messageStore, workspaceRoot);

  // 文档生成器
  const docGenerator = new DocGenerator(
    messageStore,
    continueAPI,
    configLoader,
    workspaceRoot || ''
  );

  // 发布器
  const publisher = new Publisher(configLoader);

  // ─── 4. 注册 Webview 视图 ─────────────────────────────────
  const messageListProvider = new MessageListProvider(
    context.extensionUri,
    messageStore,
    language
  );

  const webviewRegistration = vscode.window.registerWebviewViewProvider(
    MessageListProvider.viewType,
    messageListProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  // ─── 5. 注册状态栏 ───────────────────────────────────────
  const actionBar = new ActionBar();
  actionBar.show();

  // 监听消息变化，更新状态栏
  messageStore.onMessagesChanged(messages => {
    const total = messages.length;
    const selected = messages.filter(m => m.include).length;
    actionBar.updateMessageCount(total, selected);
  });

  // ─── 6. 注册命令 ─────────────────────────────────────────

  // 生成文档命令
  const generateCmd = vscode.commands.registerCommand(
    'continue-doc.generateDocument',
    async () => {
      try {
        actionBar.setLoading(true);
        await docGenerator.generate();
      } catch (err) {
        handleError(err, language);
      } finally {
        actionBar.setLoading(false);
      }
    }
  );

  // 发布文章命令
  const publishCmd = vscode.commands.registerCommand(
    'continue-doc.publishArticle',
    async () => {
      try {
        // 获取已选消息生成的最近文档，或让用户选择
        const selectedMessages = messageStore.getSelectedMessages();
        if (selectedMessages.length === 0) {
          throw new NoMessagesSelectedError();
        }

        // 先生成文档，再发布
        const isZh = language === 'zh';
        const choice = await vscode.window.showQuickPick(
          [
            {
              label: isZh ? '先生成文档再发布' : 'Generate doc then publish',
              value: 'generate',
            },
            {
              label: isZh ? '选择已有文档发布' : 'Select existing doc to publish',
              value: 'select',
            },
          ],
          { placeHolder: isZh ? '选择发布方式' : 'Select publish method' }
        );

        if (!choice) {
          return;
        }

        let markdownContent: string;

        if (choice.value === 'generate') {
          // 先生成文档
          actionBar.setLoading(true);
          const filePath = await docGenerator.generate();
          actionBar.setLoading(false);

          // 读取生成的文档
          const uri = vscode.Uri.file(filePath);
          const data = await vscode.workspace.fs.readFile(uri);
          markdownContent = Buffer.from(data).toString('utf-8');
        } else {
          // 选择已有文档
          const content = await selectExistingDocument(workspaceRoot || '', configLoader);
          if (!content) {
            return;
          }
          markdownContent = content;
        }

        // 发布
        await publisher.selectPlatformAndPublish(markdownContent);

      } catch (err) {
        handleError(err, language);
      } finally {
        actionBar.setLoading(false);
      }
    }
  );

  // 打开配置命令
  const configCmd = vscode.commands.registerCommand(
    'continue-doc.openConfig',
    async () => {
      await configLoader.openConfigFile();
    }
  );

  // 切换消息选中状态命令
  const toggleCmd = vscode.commands.registerCommand(
    'continue-doc.toggleMessageInclude',
    (messageId: string) => {
      messageStore.toggleMessageInclude(messageId);
    }
  );

  // 选择会话命令
  const selectSessionCmd = vscode.commands.registerCommand(
    'continue-doc.selectSession',
    async () => {
      const isZh = language === 'zh';
      vscode.window.showInformationMessage(
        isZh
          ? 'Continue-Doc 正在监听当前 Continue 会话'
          : 'Continue-Doc is monitoring the current Continue session'
      );
    }
  );

  // 刷新消息命令
  const refreshCmd = vscode.commands.registerCommand(
    'continue-doc.refreshMessages',
    async () => {
      const isZh = language === 'zh';
      await chatHook.refresh();
      vscode.window.showInformationMessage(
        isZh ? '消息已刷新' : 'Messages refreshed'
      );
    }
  );

  // 诊断命令
  const diagnosticsCmd = vscode.commands.registerCommand(
    'continue-doc.showDiagnostics',
    async () => {
      const diag = ContinueDetector.getDiagnostics();
      const models = continueAPI.getAvailableModels();
      const msgCount = messageStore.count;
      const config = configLoader.getConfig();

      const info = [
        `Continue Installed: ${diag.installed}`,
        `Continue Active: ${diag.active}`,
        `Continue Version: ${diag.version || 'N/A'}`,
        `Messages in Store: ${msgCount}`,
        `Available Models: ${models.length > 0 ? models.map(m => m.title).join(', ') : 'None detected'}`,
        `Language: ${config.language}`,
        `Output Dir: ${config.doc.output_dir}`,
        `Publish Target: ${config.publish.target}`,
      ].join('\n');

      logger.info('Diagnostics:\n' + info);
      logger.show();

      vscode.window.showInformationMessage(
        'Continue-Doc diagnostics written to output panel',
        'Show Output'
      ).then(action => {
        if (action === 'Show Output') {
          logger.show();
        }
      });
    }
  );

  // ─── 7. 启动对话监听 ─────────────────────────────────────
  // 立即启动 ChatHook（直接读取 ~/.continue/sessions/ 文件，不依赖 Continue 运行状态）
  chatHook.start();
  logger.info('ChatHook started immediately (reads session files directly)');

  // ─── 8. 注册到上下文 ─────────────────────────────────────
  context.subscriptions.push(
    webviewRegistration,
    actionBar,
    messageStore,
    chatHook,
    messageListProvider,
    generateCmd,
    publishCmd,
    configCmd,
    toggleCmd,
    selectSessionCmd,
    refreshCmd,
    diagnosticsCmd,
    logger
  );

  logger.info('Continue-Doc: Extension activated successfully');
}

/**
 * 插件停用
 */
export function deactivate(): void {
  logger.info('Continue-Doc: Extension deactivated');
}

/**
 * 统一错误处理
 */
function handleError(err: unknown, language: string): void {
  const isZh = language === 'zh';

  if (err instanceof NoMessagesSelectedError) {
    vscode.window.showWarningMessage(
      isZh
        ? '请先选择至少一条消息'
        : 'Please select at least one message first'
    );
    return;
  }

  if (err instanceof DocGenerationError) {
    vscode.window.showErrorMessage(
      isZh
        ? `文档生成失败：${err.message}`
        : `Document generation failed: ${err.message}`
    );
    return;
  }

  if (err instanceof ContinueNotFoundError) {
    vscode.window.showErrorMessage(
      isZh
        ? 'Continue 插件未找到，请先安装 Continue'
        : 'Continue extension not found. Please install Continue first.'
    );
    return;
  }

  // 通用错误
  const message = err instanceof Error ? err.message : String(err);
  vscode.window.showErrorMessage(
    isZh
      ? `操作失败：${message}`
      : `Operation failed: ${message}`
  );
  logger.error('Unhandled error', err);
}

/**
 * 选择已有的 Markdown 文档
 */
async function selectExistingDocument(
  workspaceRoot: string,
  configLoader: ConfigLoader
): Promise<string | null> {
  const path = await import('path');
  const outputDir = configLoader.getDocConfig().output_dir;
  const fullDir = path.join(workspaceRoot, outputDir);
  const isZh = configLoader.getLanguage() === 'zh';

  try {
    const dirUri = vscode.Uri.file(fullDir);
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    const mdFiles = entries
      .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.md'))
      .map(([name]) => name)
      .sort()
      .reverse();

    if (mdFiles.length === 0) {
      vscode.window.showWarningMessage(
        isZh
          ? `在 ${outputDir} 目录中未找到 Markdown 文件`
          : `No Markdown files found in ${outputDir}`
      );
      return null;
    }

    const selected = await vscode.window.showQuickPick(mdFiles, {
      placeHolder: isZh ? '选择要发布的文档' : 'Select document to publish',
    });

    if (!selected) {
      return null;
    }

    const filePath = path.join(fullDir, selected);
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
    return Buffer.from(data).toString('utf-8');
  } catch {
    vscode.window.showWarningMessage(
      isZh
        ? `无法读取 ${outputDir} 目录`
        : `Cannot read ${outputDir} directory`
    );
    return null;
  }
}
