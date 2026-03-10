/**
 * Medium Publisher (Placeholder)
 * Publishes articles to Medium using their API.
 * NOTE: This is a stub for future implementation.
 */

import { PublishResult } from "../types";

export class MediumPublisher {
  name = "Medium";

  constructor(private apiToken: string) {}

  /** Check if the publisher has valid configuration */
  isConfigured(): boolean {
    return this.apiToken.length > 0;
  }

  /**
   * Publish an article to Medium.
   * Uses Medium's REST API.
   */
  async publish(title: string, content: string): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message:
          "Medium API token not configured. Please add your token in .aiDocExtra/config.yaml",
      };
    }

    try {
      // Step 1: Get the authenticated user ID
      const userId = await this.getAuthenticatedUser();
      if (!userId) {
        return {
          success: false,
          message: "Failed to authenticate with Medium. Check your API token.",
        };
      }

      // Step 2: Create a post
      const result = await this.createPost(userId, title, content);
      return result;
    } catch (err) {
      return {
        success: false,
        message: `Medium publish error: ${err}`,
      };
    }
  }

  /** Get the authenticated Medium user */
  private async getAuthenticatedUser(): Promise<string | undefined> {
    const https = await import("https");

    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.medium.com",
        path: "/v1/me",
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.data?.id);
          } catch {
            resolve(undefined);
          }
        });
      });

      req.on("error", () => resolve(undefined));
      req.end();
    });
  }

  /** Create a post on Medium */
  private async createPost(
    userId: string,
    title: string,
    content: string
  ): Promise<PublishResult> {
    const https = await import("https");

    const body = JSON.stringify({
      title,
      contentFormat: "markdown",
      content: `# ${title}\n\n${content}`,
      publishStatus: "draft", // Create as draft for safety
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.medium.com",
        path: `/v1/users/${userId}/posts`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.data?.id) {
              resolve({
                success: true,
                url: json.data.url,
                message: "Article published as draft on Medium!",
              });
            } else {
              resolve({
                success: false,
                message: `Medium API error: ${JSON.stringify(json.errors || json)}`,
              });
            }
          } catch {
            resolve({
              success: false,
              message: `Invalid Medium response: ${data.substring(0, 200)}`,
            });
          }
        });
      });

      req.on("error", (err) => {
        resolve({
          success: false,
          message: `Medium network error: ${err.message}`,
        });
      });

      req.write(body);
      req.end();
    });
  }
}
