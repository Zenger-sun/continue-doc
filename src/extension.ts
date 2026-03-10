/**
 * Continue-Doc 扩展主入口
 * Extension main entry point
 *
 * 激活流程：
 * 1. 检测 Continue 安装
 * 2. 加载配置
 * 3. 初始化消息存储
 * 4. 钩接 Continue 聊天
 * 5. 注入 UI 组件
 * 6. 注册命令
 */

import * as vscode from "vscode";
import { ContinueDetector } from "./continue/continueDetector";
import { ContinueAPI } from "./continue/continueAPI";
import { ChatHook } from "./chat/chatHook";
import { MessageStore } from "./chat/messageStore";
import { DocGenerator } from "./doc/docGenerator";
import { Publisher } from "./publish/publisher";
import { ConfigLoader } from "./config/configLoader";
import { InjectUI } from "./ui/injectUI";
import { getTexts } from "./i18n";

let outputChannel: vscode.OutputChannel;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // 创建输出通道
  outputChannel = vscode.window.createOutputChannel("Continue-Doc");
  outputChannel.appendLine("Continue-Doc is activating...");

  // ───────────────────────────────────────
  // 1. 加载配置
  // ───────────────────────────────────────
  const configLoader = new ConfigLoader(outputChannel);
  const config = await configLoader.loadConfig();
  const language = configLoader.getLanguage();
  const texts = getTexts(language);

  outputChannel.appendLine(`[Extension] Language: ${language}`);

  // ───────────────────────────────────────
  // 2. 检测 Continue 安装
  // ───────────────────────────────────────
  const detector = new ContinueDetector(outputChannel);
  const continueFound = detector.detect();

  if (!continueFound) {
    outputChannel.appendLine("[Extension] Continue not found.");
    vscode.window.showWarningMessage(texts.continueNotFound);
    // 即使 Continue 不在也继续激活，只是功能受限
  } else {
    // 等待 Continue 激活
    await detector.waitForActivation(5000);
  }

  // ───────────────────────────────────────
  // 3. 初始化核心模块
  // ───────────────────────────────────────
  const continueAPI = new ContinueAPI(outputChannel);
  const messageStore = new MessageStore();
  const chatHook = new ChatHook(outputChannel, continueAPI, messageStore);
  const docGenerator = new DocGenerator(outputChannel, messageStore, configLoader);
  const publisher = new Publisher(outputChannel, configLoader);

  // ───────────────────────────────────────
  // 4. 初始化聊天钩接
  // ───────────────────────────────────────
  if (continueFound) {
    await chatHook.initialize();
  }

  // ───────────────────────────────────────
  // 5. 注册 Webview 面板
  // ───────────────────────────────────────
  const uiProvider = new InjectUI(outputChannel, messageStore, language, {
    onGenerateDoc: async () => {
      await docGenerator.generate();
    },
    onPublish: async () => {
      await publisher.publish();
    },
    onOpenConfig: async () => {
      await openConfigFile(configLoader, texts);
    },
    onRefresh: async () => {
      await chatHook.refreshMessages();
    },
  });

  const panelRegistration = vscode.window.registerWebviewViewProvider(
    InjectUI.viewType,
    uiProvider
  );
  context.subscriptions.push(panelRegistration);

  // ───────────────────────────────────────
  // 6. 注册命令
  // ───────────────────────────────────────

  // 生成文档命令
  const generateCmd = vscode.commands.registerCommand(
    "continue-doc.generateDocument",
    async () => {
      outputChannel.appendLine("[Command] generateDocument triggered.");
      await docGenerator.generate();
    }
  );

  // 发布文章命令
  const publishCmd = vscode.commands.registerCommand(
    "continue-doc.publishArticle",
    async () => {
      outputChannel.appendLine("[Command] publishArticle triggered.");
      await publisher.publish();
    }
  );

  // 打开配置命令
  const configCmd = vscode.commands.registerCommand(
    "continue-doc.openConfig",
    async () => {
      outputChannel.appendLine("[Command] openConfig triggered.");
      await openConfigFile(configLoader, texts);
    }
  );

  // 切换消息选择命令
  const toggleCmd = vscode.commands.registerCommand(
    "continue-doc.toggleMessageInclude",
    (messageId?: string) => {
      if (messageId) {
        messageStore.toggleMessage(messageId);
      } else {
        messageStore.toggleAll();
      }
      uiProvider.updateWebview();
    }
  );

  // 选择会话命令
  const selectSessionCmd = vscode.commands.registerCommand(
    "continue-doc.selectSession",
    async () => {
      await chatHook.selectSession();
      uiProvider.updateWebview();
    }
  );

  // 刷新消息命令
  const refreshCmd = vscode.commands.registerCommand(
    "continue-doc.refreshMessages",
    async () => {
      await chatHook.refreshMessages();
      uiProvider.updateWebview();
    }
  );

  context.subscriptions.push(
    generateCmd,
    publishCmd,
    configCmd,
    toggleCmd,
    selectSessionCmd,
    refreshCmd
  );

  // ───────────────────────────────────────
  // 7. 创建状态栏项
  // ───────────────────────────────────────
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(notebook) Continue-Doc";
  statusBarItem.tooltip = "Continue-Doc - Document Generator";
  statusBarItem.command = "continue-doc.generateDocument";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // ───────────────────────────────────────
  // 8. 监听配置变化
  // ───────────────────────────────────────
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("continue-doc")) {
      outputChannel.appendLine("[Extension] Configuration changed, reloading...");
      configLoader.loadConfig().then(() => {
        const newLang = configLoader.getLanguage();
        uiProvider.updateLanguage(newLang);
        uiProvider.updateWebview();
      });
    }
  });
  context.subscriptions.push(configWatcher);

  // ───────────────────────────────────────
  // 9. 清理
  // ───────────────────────────────────────
  context.subscriptions.push(
    new vscode.Disposable(() => {
      chatHook.dispose();
      uiProvider.dispose();
      outputChannel.appendLine("Continue-Doc deactivated.");
    })
  );

  outputChannel.appendLine("Continue-Doc activated successfully!");
}

/**
 * 打开配置文件
 */
async function openConfigFile(
  configLoader: ConfigLoader,
  texts: { configOpenFailed: string }
): Promise<void> {
  const configUri = configLoader.getConfigUri();
  if (configUri) {
    const doc = await vscode.workspace.openTextDocument(configUri);
    await vscode.window.showTextDocument(doc);
  } else {
    // 如果配置文件不存在，先加载（这会创建默认配置）然后打开
    await configLoader.loadConfig();
    const newUri = configLoader.getConfigUri();
    if (newUri) {
      const doc = await vscode.workspace.openTextDocument(newUri);
      await vscode.window.showTextDocument(doc);
    } else {
      vscode.window.showErrorMessage(texts.configOpenFailed);
    }
  }
}

export function deactivate(): void {
  outputChannel?.appendLine("Continue-Doc deactivated.");
}
