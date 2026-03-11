/**
 * 文档生成编排
 * Document generation orchestration
 *
 * 生成策略：
 *  将选中的对话内容（包括文字和图片）直接保存为 Markdown 文档，
 *  后续可以使用 AI 来总结这个文档。
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { MessageStore } from "../chat/messageStore";
import { MarkdownWriter } from "./markdownWriter";
import { ConfigLoader } from "../config/configLoader";
import { GenerateResult, DocMessage } from "../types";
import { getTexts } from "../i18n";

export class DocGenerator {
  private outputChannel: vscode.OutputChannel;
  private messageStore: MessageStore;
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
    this.markdownWriter = new MarkdownWriter(outputChannel);
  }

  /**
   * 生成文档：将当前对话内容（含图片）保存为 md 文件
   */
  async generate(): Promise<GenerateResult> {
    const config = this.configLoader.getConfig();
    const lang = config.language || "zh";
    const texts = getTexts(lang);

    this.outputChannel.appendLine("[DocGenerator] generate() called.");

    // 获取已选中的消息
    const selectedMessages = this.messageStore.getSelectedMessages();
    this.outputChannel.appendLine(
      `[DocGenerator] Selected messages: ${selectedMessages.length}`
    );

    // 打印详细的消息数据用于调试
    const allMessages = this.messageStore.getMessages();
    this.outputChannel.appendLine(
      `[DocGenerator] Total messages: ${allMessages.length}`
    );
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      this.outputChannel.appendLine(
        `  - Message ${i}: id=${msg.id}, role=${msg.role}, content_length=${msg.content?.length || 0}, included=${msg.include}`
      );
    }

    if (selectedMessages.length === 0) {
      const warnMsg = texts.noSelectedMessages;
      this.outputChannel.appendLine(`[DocGenerator] Warning: ${warnMsg}`);
      vscode.window.showWarningMessage(warnMsg);
      return { success: false, message: warnMsg };
    }

    // 1. 确保输出目录存在
    const outputDir = this.configLoader.ensureOutputDir();
    if (!outputDir) {
      const errMsg = lang === "zh"
        ? "未找到工作区目录，无法保存文档。"
        : "No workspace folder found. Cannot save document.";
      this.outputChannel.appendLine(`[DocGenerator] Error: ${errMsg}`);
      vscode.window.showErrorMessage(errMsg);
      return { success: false, message: errMsg };
    }

    this.outputChannel.appendLine(
      `[DocGenerator] Output directory: ${outputDir}`
    );

    // 使用进度条展示生成过程
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: lang === "zh" ? "正在生成文档..." : "Generating document...",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ increment: 10, message: lang === "zh" ? "准备目录..." : "Preparing..." });
          this.outputChannel.appendLine("[DocGenerator] Preparing directories...");

          // 2. 创建图片存储目录
          const imagesDir = path.join(outputDir, "images");
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
            this.outputChannel.appendLine(`[DocGenerator] Created images directory: ${imagesDir}`);
          }

          // 3. 处理图片：保存 base64 图片到本地，生成相对路径
          progress.report({ increment: 20, message: lang === "zh" ? "处理图片..." : "Processing images..." });
          this.outputChannel.appendLine("[DocGenerator] Processing images...");
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
          await this.processImages(selectedMessages, imagesDir, timestamp);
          this.outputChannel.appendLine("[DocGenerator] Images processed successfully.");

          // 4. 组装 Markdown 内容
          progress.report({ increment: 30, message: lang === "zh" ? "组装文档..." : "Building markdown..." });
          this.outputChannel.appendLine("[DocGenerator] Building markdown content...");
          const markdownContent = this.buildMarkdown(selectedMessages, timestamp);
          this.outputChannel.appendLine(
            `[DocGenerator] Markdown built, length=${markdownContent.length}`
          );

          // 5. 写入 md 文件
          progress.report({ increment: 20, message: lang === "zh" ? "写入文件..." : "Writing file..." });
          this.outputChannel.appendLine("[DocGenerator] Writing markdown file...");
          const title = this.extractTitle(selectedMessages);
          this.outputChannel.appendLine(`[DocGenerator] Document title: "${title}"`);
          const filePath = await this.markdownWriter.writeDocument(
            markdownContent,
            outputDir,
            title
          );

          this.outputChannel.appendLine(
            `[DocGenerator] Document saved to: ${filePath}`
          );

          // 6. 在编辑器中打开生成的文档
          progress.report({ increment: 20, message: lang === "zh" ? "打开文档..." : "Opening document..." });
          this.outputChannel.appendLine("[DocGenerator] Opening document in editor...");
          try {
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
            this.outputChannel.appendLine("[DocGenerator] Document opened successfully.");
          } catch (err: any) {
            this.outputChannel.appendLine(
              `[DocGenerator] Failed to open document: ${err.message}`
            );
            // 不返回错误，因为文件已经成功保存
          }

          const successMsg = lang === "zh"
            ? `文档已保存: ${path.basename(filePath)}`
            : `Document saved: ${path.basename(filePath)}`;
          this.outputChannel.appendLine(`[DocGenerator] Success: ${successMsg}`);
          vscode.window.showInformationMessage(successMsg);

          return {
            success: true,
            filePath,
            message: successMsg,
            title,
          };
        } catch (error: any) {
          this.outputChannel.appendLine(
            `[DocGenerator] Error during generation: ${error.message}\n${error.stack || ""}`
          );
          const errMsg = lang === "zh"
            ? `文档生成失败: ${error.message}`
            : `Document generation failed: ${error.message}`;
          this.outputChannel.appendLine(`[DocGenerator] Showing error: ${errMsg}`);
          vscode.window.showErrorMessage(errMsg);
          return { success: false, message: errMsg };
        }
      }
    );
  }

  /**
   * 处理消息中的图片：将 base64 图片保存到本地文件
   */
  private async processImages(
    messages: DocMessage[],
    imagesDir: string,
    timestamp: string
  ): Promise<void> {
    let imageIndex = 0;

    for (const msg of messages) {
      if (!msg.images || msg.images.length === 0) {
        continue;
      }

      for (const image of msg.images) {
        imageIndex++;
        const imageFileName = `${timestamp}-img-${imageIndex}`;

        if (image.url.startsWith("data:")) {
          // base64 图片：解析并保存到本地
          const { ext, buffer } = this.parseBase64Image(image.url);
          const localFileName = `${imageFileName}.${ext}`;
          const localPath = path.join(imagesDir, localFileName);
          fs.writeFileSync(localPath, buffer);
          image.localPath = `images/${localFileName}`;
          this.outputChannel.appendLine(
            `[DocGenerator] Saved base64 image to: ${localPath}`
          );
        } else if (
          image.url.startsWith("http://") ||
          image.url.startsWith("https://")
        ) {
          // URL 图片：直接在 md 中引用远程 URL
          image.localPath = image.url;
        } else {
          // 其他格式（可能是本地路径）
          image.localPath = image.url;
        }
      }
    }
  }

  /**
   * 解析 base64 data URI 图片
   */
  private parseBase64Image(dataUrl: string): { ext: string; buffer: Buffer } {
    // data:image/png;base64,iVBOR...
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) {
      return {
        ext: match[1] === "jpeg" ? "jpg" : match[1],
        buffer: Buffer.from(match[2], "base64"),
      };
    }
    // 默认当 png 处理
    const base64Data = dataUrl.replace(/^data:[^;]*;base64,/, "");
    return {
      ext: "png",
      buffer: Buffer.from(base64Data, "base64"),
    };
  }

  /**
   * 将对话消息组装为 Markdown 格式
   */
  private buildMarkdown(messages: DocMessage[], timestamp: string): string {
    const config = this.configLoader.getConfig();
    const lang = config.language || "zh";
    const parts: string[] = [];

    // 文档头部
    const title = this.extractTitle(messages) || (lang === "zh" ? "对话记录" : "Chat Record");
    parts.push(`# ${title}`);
    parts.push("");
    parts.push(
      `> ${lang === "zh" ? "生成时间" : "Generated at"}: ${new Date().toLocaleString()}`
    );
    parts.push(
      `> ${lang === "zh" ? "消息数" : "Messages"}: ${messages.length}`
    );
    parts.push("");
    parts.push("---");
    parts.push("");

    // 每条消息
    for (const msg of messages) {
      const roleLabel = msg.role === "user"
        ? (lang === "zh" ? "👤 用户" : "👤 User")
        : (lang === "zh" ? "🤖 AI" : "🤖 AI");

      parts.push(`## ${roleLabel}`);
      parts.push("");

      // 文字内容
      if (msg.content) {
        parts.push(msg.content);
        parts.push("");
      }

      // 图片
      if (msg.images && msg.images.length > 0) {
        for (const image of msg.images) {
          const imgPath = image.localPath || image.url;
          const altText = lang === "zh" ? "对话图片" : "Chat image";
          parts.push(`![${altText}](${imgPath})`);
          parts.push("");
        }
      }

      parts.push("---");
      parts.push("");
    }

    return parts.join("\n");
  }

  /**
   * 从对话中提取标题：使用第一条用户消息的前 30 个字符
   */
  private extractTitle(messages: DocMessage[]): string | undefined {
    const firstUserMsg = messages.find((m) => m.role === "user" && m.content);
    if (!firstUserMsg) {
      return undefined;
    }
    const singleLine = firstUserMsg.content
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return singleLine.length > 30
      ? singleLine.substring(0, 30) + "..."
      : singleLine;
  }
}
