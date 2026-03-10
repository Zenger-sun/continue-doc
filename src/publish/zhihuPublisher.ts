/**
 * Zhihu Publisher
 * Publishes articles to Zhihu (知乎) using their web API.
 */

import * as https from "https";
import * as http from "http";
import { PublishResult } from "../types";

export class ZhihuPublisher {
  name = "Zhihu (知乎)";

  constructor(private cookie: string) {}

  /** Check if the publisher has valid configuration */
  isConfigured(): boolean {
    return this.cookie.length > 0;
  }

  /**
   * Publish an article to Zhihu.
   * Uses Zhihu's draft API to create a draft, then publish it.
   */
  async publish(title: string, content: string): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Zhihu cookie not configured. Please add your Zhihu session cookie in .aiDocExtra/config.yaml",
      };
    }

    try {
      // Step 1: Create a draft
      const draftId = await this.createDraft(title, content);

      if (!draftId) {
        return {
          success: false,
          message: "Failed to create Zhihu draft",
        };
      }

      // Step 2: Publish the draft
      const publishResult = await this.publishDraft(draftId);

      if (publishResult) {
        return {
          success: true,
          url: `https://zhuanlan.zhihu.com/p/${publishResult}`,
          message: "Article published to Zhihu successfully!",
        };
      }

      return {
        success: false,
        message: "Failed to publish Zhihu draft",
      };
    } catch (err) {
      return {
        success: false,
        message: `Zhihu publish error: ${err}`,
      };
    }
  }

  /** Create a draft on Zhihu */
  private async createDraft(
    title: string,
    content: string
  ): Promise<string | undefined> {
    const htmlContent = this.markdownToSimpleHtml(content);

    const body = JSON.stringify({
      title,
      content: htmlContent,
      delta_time: 0,
    });

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: "zhuanlan.zhihu.com",
        path: "/api/articles/drafts",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": this.cookie,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "x-requested-with": "fetch",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.id?.toString());
          } catch {
            reject(new Error(`Invalid response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  /** Publish a draft on Zhihu */
  private async publishDraft(
    draftId: string
  ): Promise<string | undefined> {
    const body = JSON.stringify({
      column: null,
      topic_url: "",
    });

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: "zhuanlan.zhihu.com",
        path: `/api/articles/${draftId}/publish`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Cookie": this.cookie,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "x-requested-with": "fetch",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.id?.toString() || draftId);
          } catch {
            // If publish is successful, it might return 200 with the article ID
            if (res.statusCode === 200) {
              resolve(draftId);
            } else {
              reject(
                new Error(
                  `Publish failed with status ${res.statusCode}: ${data.substring(0, 200)}`
                )
              );
            }
          }
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Basic Markdown to HTML conversion for Zhihu.
   * Zhihu expects HTML content for articles.
   */
  private markdownToSimpleHtml(markdown: string): string {
    let html = markdown;

    // Code blocks
    html = html.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (_, lang, code) =>
        `<pre><code class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>`
    );

    // Inline code
    html = html.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

    // Headers
    html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

    // Italic
    html = html.replace(/\*(.+?)\*/g, "<i>$1</i>");

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    // Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2">$1</a>'
    );

    // Paragraphs: wrap non-tag lines
    html = html
      .split("\n\n")
      .map((block) => {
        block = block.trim();
        if (!block) {
          return "";
        }
        if (block.startsWith("<")) {
          return block;
        }
        return `<p>${block.replace(/\n/g, "<br>")}</p>`;
      })
      .join("\n");

    // Horizontal rules
    html = html.replace(/^---$/gm, "<hr>");

    return html;
  }

  /** Escape HTML special characters */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
