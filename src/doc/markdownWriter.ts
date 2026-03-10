/**
 * Markdown 文件输出
 * Markdown file output writer
 */

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export class MarkdownWriter {
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * 将内容写入 Markdown 文件
   * Write content to a Markdown file
   *
   * @param content - Markdown 内容
   * @param outputDir - 输出目录
   * @param title - 可选的文档标题（用于文件名）
   * @returns 写入的文件路径
   */
  async writeDocument(
    content: string,
    outputDir: string,
    title?: string
  ): Promise<string> {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成文件名
    const fileName = this.generateFileName(title);
    const filePath = path.join(outputDir, fileName);

    // 写入文件
    try {
      fs.writeFileSync(filePath, content, "utf-8");
      this.outputChannel.appendLine(
        `[MarkdownWriter] Document written to: ${filePath}`
      );
      return filePath;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[MarkdownWriter] Error writing file: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * 生成文件名
   * Generate a file name based on timestamp and optional title
   */
  private generateFileName(title?: string): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    if (title) {
      // 从标题中提取简短的 slug
      const slug = this.slugify(title);
      return `${dateStr}-${slug}.md`;
    }

    // 使用时间戳
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
    return `${dateStr}-${timeStr}.md`;
  }

  /**
   * 将标题转换为文件名安全的 slug
   * Convert title to a filename-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, "") // 保留中文字符
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);
  }

  /**
   * 从生成的 Markdown 中提取标题
   * Extract the title from generated Markdown content
   */
  extractTitle(content: string): string | undefined {
    // 匹配第一个 # 标题
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim();
  }

  /**
   * 列出输出目录中的所有文档
   * List all documents in the output directory
   */
  listDocuments(outputDir: string): string[] {
    if (!fs.existsSync(outputDir)) {
      return [];
    }

    return fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse(); // 最新的在前
  }

  /**
   * 读取文档内容
   * Read document content
   */
  readDocument(filePath: string): string {
    return fs.readFileSync(filePath, "utf-8");
  }
}
