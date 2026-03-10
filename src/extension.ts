/**
 * aiDocExtra - Extension Entry Point
 *
 * AI-powered documentation generation and publishing for Continue chats.
 * This extension enhances the Continue plugin with document generation
 * and multi-platform publishing capabilities.
 */

import * as vscode from "vscode";
import { ContinueDetector } from "./continue/continueDetector";
import { ContinueAPI } from "./continue/continueAPI";
import { ConfigLoader } from "./config/configLoader";
import { MessageStore } from "./chat/messageStore";
import { ChatHook } from "./chat/chatHook";
import { DocGenerator } from "./doc/docGenerator";
import { Publisher } from "./publish/publisher";
import { AiDocPanel } from "./ui/injectUI";

let outputChannel: vscode.OutputChannel;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel("aiDocExtra");
  outputChannel.appendLine("[aiDocExtra] Activating extension...");

  // ── Step 1: Detect Continue ──────────────────────────────────────────
  if (!ContinueDetector.isInstalled()) {
    outputChannel.appendLine(
      "[aiDocExtra] Continue extension not found. Prompting installation."
    );
    await ContinueDetector.promptInstall();
    // Continue without blocking - user can still use doc generation manually
  } else {
    outputChannel.appendLine("[aiDocExtra] Continue extension detected.");
    // Wait for Continue to activate (non-blocking)
    ContinueDetector.waitForActivation().then((active) => {
      if (active) {
        outputChannel.appendLine(
          "[aiDocExtra] Continue extension is active."
        );
      } else {
        outputChannel.appendLine(
          "[aiDocExtra] Continue extension did not activate within timeout."
        );
      }
    });
  }

  // ── Step 2: Initialize Config ────────────────────────────────────────
  const configLoader = new ConfigLoader();
  await configLoader.initialize();
  outputChannel.appendLine("[aiDocExtra] Configuration loaded.");

  // ── Step 3: Initialize Message Store ─────────────────────────────────
  const messageStore = new MessageStore();

  // ── Step 4: Initialize Chat Hook ─────────────────────────────────────
  const chatHook = new ChatHook(messageStore);
  chatHook.activate(context);
  outputChannel.appendLine("[aiDocExtra] Chat hook activated.");

  // ── Step 5: Initialize Doc Generator ─────────────────────────────────
  const docGenerator = new DocGenerator(
    messageStore,
    configLoader,
    outputChannel
  );

  // ── Step 6: Initialize Publisher ─────────────────────────────────────
  const publisher = new Publisher(configLoader, outputChannel);

  // ── Step 7: Initialize UI Panel ──────────────────────────────────────
  // 创建面板动作处理函数
  const handlePanelAction = (action: string) => {
    switch (action) {
      case "generateDoc":
        vscode.commands.executeCommand("aiDocExtra.generateDocument");
        break;
      case "publish":
        vscode.commands.executeCommand("aiDocExtra.publishArticle");
        break;
      case "openConfig":
        vscode.commands.executeCommand("aiDocExtra.openConfig");
        break;
    }
  };

  // 独立侧边栏面板
  const panelProvider = new AiDocPanel(context.extensionUri, messageStore);
  panelProvider.onAction(handlePanelAction);

  // Continue 侧边栏内嵌面板（共享同一个 messageStore）
  const continuePanelProvider = new AiDocPanel(context.extensionUri, messageStore);
  continuePanelProvider.onAction(handlePanelAction);

  // 注册两个 webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AiDocPanel.viewType,       // "aiDocExtra.panel" — 独立侧边栏
      panelProvider
    ),
    vscode.window.registerWebviewViewProvider(
      "aiDocExtra.continuePanel", // Continue 侧边栏内嵌
      continuePanelProvider
    )
  );

  // ── Step 8: Register Commands ────────────────────────────────────────

  // Generate Document command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocExtra.generateDocument",
      async () => {
        outputChannel.appendLine("[aiDocExtra] Generate Document command invoked.");
        await docGenerator.generateDocument();
      }
    )
  );

  // Publish Article command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocExtra.publishArticle",
      async () => {
        outputChannel.appendLine("[aiDocExtra] Publish Article command invoked.");
        await publisher.publishInteractive();
      }
    )
  );

  // Open Configuration command
  context.subscriptions.push(
    vscode.commands.registerCommand("aiDocExtra.openConfig", async () => {
      outputChannel.appendLine("[aiDocExtra] Open Config command invoked.");
      await configLoader.openConfigFile();
    })
  );

  // Toggle Message Include command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocExtra.toggleMessageInclude",
      async () => {
        // Show quick pick of messages to toggle
        const messages = messageStore.getAllMessages();
        if (messages.length === 0) {
          vscode.window.showInformationMessage(
            "aiDocExtra: No messages to toggle."
          );
          return;
        }

        const items = messages.map((m) => ({
          label: `${m.include ? "☑" : "☐"} [${m.role}] ${m.content.substring(0, 60)}`,
          description: m.include ? "included" : "excluded",
          id: m.id,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select a message to toggle inclusion",
          title: "aiDocExtra: Toggle Message",
        });

        if (selected) {
          messageStore.toggleInclude(selected.id);
          vscode.window.showInformationMessage(
            `aiDocExtra: Message ${messageStore.getMessage(selected.id)?.include ? "included" : "excluded"}.`
          );
        }
      }
    )
  );

  // ── Step 9: Status Bar ───────────────────────────────────────────────
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(notebook) aiDocExtra";
  statusBarItem.tooltip = "aiDocExtra - AI Documentation Generator";
  statusBarItem.command = "aiDocExtra.generateDocument";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update status bar with message count
  messageStore.onMessagesChanged((messages) => {
    const included = messages.filter((m) => m.include).length;
    statusBarItem.text = `$(notebook) aiDocExtra [${included}/${messages.length}]`;
  });

  // ── Step 10: Register Disposables ────────────────────────────────────
  context.subscriptions.push(
    { dispose: () => configLoader.dispose() },
    { dispose: () => messageStore.dispose() },
    { dispose: () => chatHook.dispose() },
    { dispose: () => panelProvider.dispose() },
    { dispose: () => continuePanelProvider.dispose() },
    outputChannel
  );

  outputChannel.appendLine("[aiDocExtra] Extension activated successfully.");
}

export function deactivate(): void {
  outputChannel?.appendLine("[aiDocExtra] Extension deactivated.");
}
