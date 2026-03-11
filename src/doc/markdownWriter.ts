import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Markdown 文件写入器
 *
 * 负责将 AI 生成的文档保存为 Markdown 文件
 *
 * 文件命名规则（来自 mind.md）：
 * YYYY-MM-DD-topic.md
 * 示例：2026-03-11-fix-ssh-auth.md
 */
export class MarkdownWriter {
  constructor(private workspaceRoot: string) {}

  /**
   * 保存 Markdown 文档
   *
   * @param content Markdown 内容
   * @param outputDir 输出目录（相对于工作区根目录）
   * @returns 保存的文件路径
   */
  async save(content: string, outputDir: string): Promise<string> {
    // 构建输出目录的完整路径
    const fullOutputDir = path.join(this.workspaceRoot, outputDir);

    // 确保输出目录存在
    const dirUri = vscode.Uri.file(fullOutputDir);
    try {
      await vscode.workspace.fs.stat(dirUri);
    } catch {
      await vscode.workspace.fs.createDirectory(dirUri);
      logger.info(`Created output directory: ${fullOutputDir}`);
    }

    // 生成文件名
    const fileName = this.generateFileName(content);
    const filePath = path.join(fullOutputDir, fileName);

    // 写入文件
    const uri = vscode.Uri.file(filePath);
    const data = Buffer.from(content, 'utf-8');
    await vscode.workspace.fs.writeFile(uri, data);

    logger.info(`Document saved: ${filePath}`);
    return filePath;
  }

  /**
   * 生成文件名
   * 格式：YYYY-MM-DD-topic.md
   * 从内容的第一个标题提取 topic
   */
  private generateFileName(content: string): string {
    const now = new Date();
    const datePart = this.formatDate(now);

    // 尝试从 Markdown 内容提取标题
    const topic = this.extractTopic(content);

    return `${datePart}-${topic}.md`;
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 从 Markdown 内容提取主题作为文件名
   */
  private extractTopic(content: string): string {
    // 尝试匹配 # 开头的标题
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return this.slugify(titleMatch[1]);
    }

    // 尝试匹配 ## 开头的标题
    const subtitleMatch = content.match(/^##\s+(.+)$/m);
    if (subtitleMatch) {
      return this.slugify(subtitleMatch[1]);
    }

    // 使用前20个字符
    const firstLine = content.trim().split('\n')[0] || 'untitled';
    return this.slugify(firstLine.substring(0, 30));
  }

  /**
   * 将文本转换为 URL 友好的 slug
   * 支持中英文
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // 移除 Markdown 标记
      .replace(/[#*`\[\]()]/g, '')
      // 将空格和特殊字符替换为连字符
      .replace(/[\s/\\:;,!?@#$%^&*()+=<>{}|~`"']+/g, '-')
      // 移除连续连字符
      .replace(/-+/g, '-')
      // 移除首尾连字符
      .replace(/^-|-$/g, '')
      // 截断长度
      .substring(0, 50)
      || 'untitled';
  }

  /**
   * 在 VSCode 中打开生成的文档
   */
  async openInEditor(filePath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: false,
      });
    } catch (err) {
      logger.error('Failed to open document in editor', err);
    }
  }
}
