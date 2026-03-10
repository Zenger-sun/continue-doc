/**
 * 文档生成编排
 * Document generation orchestration
 */

import * as vscode from "vscode";
import { MessageStore } from "../chat/messageStore";
import { PromptBuilder } from "./promptBuilder";
import { MarkdownWriter } from "./markdownWriter";
import { ConfigLoader } from "../config/configLoader";
import { GenerateResult } from "../types";
import { getTexts } from "../i18n";

export class DocGenerator {
  private outputChannel: vscode.OutputChannel;
  private messageStore: MessageStore;
  private promptBuilder: PromptBuilder;
  private markdownWriter: MarkdownWriter;
  private configLoader: ConfigLoader;

  constructor(
    outputChannel: vscode.OutputChannel,
    messageStore: MessageStore,
    configLoader: ConfigLoader
  ) {
    this.outputChannel = outputChannel;
    this.messageStore = messageStore;
    this.configLoader = configLoader;
    this.promptBuilder = new PromptBuilder(configLoader.getConfig());
    this.markdownWriter = new MarkdownWriter(outputChannel);
  }

  /**
   * 生成文档
   * Generate a document from selected messages
   */
  async generate(): Promise<GenerateResult> {
    const config = this.configLoader.getConfig();
    const texts = getTexts(config.language || "zh");

    // 更新 PromptBuilder 的配置
    this.promptBuilder.updateConfig(config);

    // 获取已选中的消息
    const selectedMessages = this.messageStore.getSelectedMessages();

    if (selectedMessages.length === 0) {
      vscode.window.showWarningMessage(texts.noSelectedMessages);
      return {
        success: false,
        message: texts.noSelectedMessages,
      };
    }

    this.outputChannel.appendLine(
      `[DocGenerator] Generating document from ${selectedMessages.length} messages...`
    );

    try {
      // 显示进度
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: texts.generating,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 10, message: "Building prompt..." });

          // 1. 构建提示词
          const prompt = this.promptBuilder.buildDocPrompt(selectedMessages);

          progress.report({ increment: 20, message: "Sending to AI..." });

          // 2. 使用 AI 模型生成文档
          let generatedContent: string;

          try {
            generatedContent = await this.callAIModel(prompt);
          } catch (aiError: any) {
            // 如果 AI 调用失败，使用简单的格式化作为回退
            this.outputChannel.appendLine(
              `[DocGenerator] AI call failed, using fallback: ${aiError.message}`
            );
            generatedContent = this.fallbackGenerate(selectedMessages);
          }

          progress.report({ increment: 50, message: "Writing file..." });

          // 3. 提取标题
          const title = this.markdownWriter.extractTitle(generatedContent);

          // 4. 写入文件
          const outputDir = this.configLoader.ensureOutputDir();
          const filePath = await this.markdownWriter.writeDocument(
            generatedContent,
            outputDir,
            title
          );

          progress.report({ increment: 20, message: "Done!" });

          // 5. 在编辑器中打开文件
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc, { preview: false });

          vscode.window.showInformationMessage(
            `${texts.docGeneratedSuccess}${filePath}`
          );

          return {
            success: true,
            filePath,
            title: title || "Untitled",
            message: texts.docGeneratedSuccess,
          };
        }
      );
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[DocGenerator] Error: ${error.message}`
      );
      vscode.window.showErrorMessage(`${texts.error}: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 调用 AI 模型生成文档
   * Call AI model to generate documentation
   *
   * 尝试通过 VSCode Language Model API (Copilot) 或其他方式调用 AI
   */
  private async callAIModel(prompt: string): Promise<string> {
    // 方式 1：尝试使用 VSCode Chat API（vscode.lm）
    try {
      const models = await vscode.lm.selectChatModels({ family: "gpt-4" });
      if (models.length > 0) {
        const model = models[0];
        const messages = [vscode.LanguageModelChatMessage.User(prompt)];
        const response = await model.sendRequest(messages);

        let result = "";
        for await (const chunk of response.text) {
          result += chunk;
        }

        if (result.trim()) {
          this.outputChannel.appendLine(
            "[DocGenerator] Document generated via VSCode LM API."
          );
          return result;
        }
      }
    } catch (lmError: any) {
      this.outputChannel.appendLine(
        `[DocGenerator] VSCode LM API not available: ${lmError.message}`
      );
    }

    // 方式 2：尝试通过 Continue 的命令调用
    try {
      // Continue 可能暴露了命令来发送请求
      const result = await vscode.commands.executeCommand<string>(
        "continue.sendToModel",
        prompt
      );
      if (result && typeof result === "string" && result.trim()) {
        this.outputChannel.appendLine(
          "[DocGenerator] Document generated via Continue command."
        );
        return result;
      }
    } catch {
      this.outputChannel.appendLine(
        "[DocGenerator] Continue command not available."
      );
    }

    // 如果都不可用，抛出错误让调用者使用 fallback
    throw new Error("No AI model available. Using fallback generation.");
  }

  /**
   * 回退生成：简单地格式化对话内容
   * Fallback generation: simply format the conversation content
   */
  private fallbackGenerate(
    messages: { role: string; content: string }[]
  ): string {
    const now = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];

    lines.push(`# AI 对话记录 - ${now}`);
    lines.push("");
    lines.push("> 本文档由 Continue-Doc 自动生成");
    lines.push("");
    lines.push("---");
    lines.push("");

    for (const msg of messages) {
      const role = msg.role === "user" ? "👤 用户" : "🤖 AI";
      lines.push(`## ${role}`);
      lines.push("");
      lines.push(msg.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    return lines.join("\n");
  }
}
