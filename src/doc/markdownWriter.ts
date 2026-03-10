/**
 * Markdown Writer
 * Writes generated Markdown documents to the output directory.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class MarkdownWriter {
  /**
   * Write markdown content to a file in the output directory.
   * Returns the full path of the written file.
   */
  async writeDocument(
    outputDir: string,
    content: string,
    title?: string
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename from date and optional title
    const now = new Date();
    const dateStr = this.formatDate(now);
    const slug = title ? `-${this.slugify(title)}` : "";
    const filename = `${dateStr}${slug}.md`;
    const filepath = path.join(outputDir, filename);

    // Add frontmatter
    const fullContent = this.addFrontmatter(content, title, now);

    // Write file
    fs.writeFileSync(filepath, fullContent, "utf-8");

    return filepath;
  }

  /**
   * Open a generated document in the editor
   */
  async openDocument(filepath: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(filepath);
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.One,
    });
  }

  /**
   * List all existing documents in the output directory
   */
  listDocuments(outputDir: string): string[] {
    if (!fs.existsSync(outputDir)) {
      return [];
    }
    return fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse(); // Most recent first
  }

  /** Format date as YYYY-MM-DD */
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /** Convert title to URL-friendly slug */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff-]/g, "") // Keep Chinese chars
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 60);
  }

  /** Add YAML frontmatter to the document */
  private addFrontmatter(
    content: string,
    title: string | undefined,
    date: Date
  ): string {
    const frontmatter = [
      "---",
      `title: "${title || "AI Generated Document"}"`,
      `date: ${date.toISOString()}`,
      `generator: aiDocExtra`,
      "---",
      "",
    ].join("\n");

    return frontmatter + content;
  }
}
