/**
 * 知乎平台发布集成
 * Zhihu platform publishing integration
 */

import * as https from "https";
import { PublishResult, ZhihuConfig } from "../types";

import type { OutputChannel } from "vscode";

export class ZhihuPublisher {
  private outputChannel: OutputChannel;
  private config: ZhihuConfig;

  constructor(outputChannel: OutputChannel, config: ZhihuConfig) {
    this.outputChannel = outputChannel;
    this.config = config;
  }

  /**
   * 更新配置
   * Update configuration
   */
  updateConfig(config: ZhihuConfig): void {
    this.config = config;
  }

  /**
   * 发布文章到知乎
   * Publish an article to Zhihu
   */
  async publish(
    title: string,
    content: string
  ): Promise<PublishResult> {
    if (!this.config.cookie) {
      return {
        success: false,
        platform: "zhihu",
        message:
          "知乎 Cookie 未配置。请在 .continue-doc/config.yaml 中设置 publish.zhihu.cookie。",
      };
    }

    this.outputChannel.appendLine(
      `[ZhihuPublisher] Publishing article: ${title}`
    );

    try {
      // 步骤 1：创建草稿
      const draftId = await this.createDraft(title, content);
      if (!draftId) {
        return {
          success: false,
          platform: "zhihu",
          message: "创建知乎草稿失败。请检查 Cookie 是否有效。",
        };
      }

      this.outputChannel.appendLine(
        `[ZhihuPublisher] Draft created: ${draftId}`
      );

      // 步骤 2：发布草稿
      const publishUrl = await this.publishDraft(draftId);

      if (publishUrl) {
        return {
          success: true,
          platform: "zhihu",
          url: publishUrl,
          message: `文章已发布到知乎: ${publishUrl}`,
        };
      }

      // 如果自动发布失败，至少草稿已创建
      const draftUrl = `https://zhuanlan.zhihu.com/p/${draftId}/edit`;
      return {
        success: true,
        platform: "zhihu",
        url: draftUrl,
        message: `草稿已创建，请手动发布: ${draftUrl}`,
      };
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ZhihuPublisher] Error: ${error.message}`
      );
      return {
        success: false,
        platform: "zhihu",
        message: `知乎发布失败: ${error.message}`,
      };
    }
  }

  /**
   * 创建知乎草稿
   * Create a Zhihu draft article
   */
  private async createDraft(
    title: string,
    content: string
  ): Promise<string | null> {
    const htmlContent = this.markdownToSimpleHtml(content);

    const postData = JSON.stringify({
      title: title,
      content: htmlContent,
    });

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: "zhuanlan.zhihu.com",
        path: "/api/articles/drafts",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Cookie: this.config.cookie,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://zhuanlan.zhihu.com/write",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.id) {
              resolve(String(response.id));
            } else {
              this.outputChannel.appendLine(
                `[ZhihuPublisher] Draft creation response: ${data}`
              );
              resolve(null);
            }
          } catch {
            this.outputChannel.appendLine(
              `[ZhihuPublisher] Invalid response: ${data}`
            );
            resolve(null);
          }
        });
      });

      req.on("error", (err) => reject(err));
      req.write(postData);
      req.end();
    });
  }

  /**
   * 发布已创建的草稿
   * Publish a created draft
   */
  private async publishDraft(draftId: string): Promise<string | null> {
    const postData = JSON.stringify({
      column: null,
      topic_url: "",
    });

    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        hostname: "zhuanlan.zhihu.com",
        path: `/api/articles/${draftId}/publish`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Cookie: this.config.cookie,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: `https://zhuanlan.zhihu.com/p/${draftId}/edit`,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.url) {
              resolve(response.url);
            } else {
              this.outputChannel.appendLine(
                `[ZhihuPublisher] Publish response: ${data}`
              );
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });

      req.on("error", () => resolve(null));
      req.write(postData);
      req.end();
    });
  }

  /**
   * 简单的 Markdown 转 HTML
   * Simple Markdown to HTML conversion for Zhihu
   */
  private markdownToSimpleHtml(markdown: string): string {
    let html = markdown;

    // 代码块
    html = html.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>'
    );

    // 行内代码
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 标题
    html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // 粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    html = html.replace(/\*(.+?)\*/g, "<i>$1</i>");

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 分割线
    html = html.replace(/^---$/gm, "<hr>");

    // 引用
    html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

    // 无序列表
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    // 将连续的 <li> 块包裹在 <ul> 中
    html = html.replace(
      /(?:<li>.*?<\/li>\s*)+/g,
      (match) => `<ul>${match.trim()}</ul>`
    );

    // 段落
    html = html.replace(/\n\n/g, "</p><p>");
    html = `<p>${html}</p>`;

    return html;
  }
}
