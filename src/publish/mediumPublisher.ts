/**
 * Medium 平台发布集成（待实现）
 * Medium platform publishing integration (coming soon)
 */

import * as https from "https";
import type { OutputChannel } from "vscode";
import { PublishResult, MediumConfig } from "../types";

export class MediumPublisher {
  private outputChannel: OutputChannel;
  private config: MediumConfig;

  constructor(outputChannel: OutputChannel, config: MediumConfig) {
    this.outputChannel = outputChannel;
    this.config = config;
  }

  /**
   * 更新配置
   * Update configuration
   */
  updateConfig(config: MediumConfig): void {
    this.config = config;
  }

  /**
   * 发布文章到 Medium
   * Publish an article to Medium
   */
  async publish(
    title: string,
    content: string,
    tags?: string[]
  ): Promise<PublishResult> {
    if (!this.config.api_token) {
      return {
        success: false,
        platform: "medium",
        message:
          "Medium API Token 未配置。请在 .continue-doc/config.yaml 中设置 publish.medium.api_token。",
      };
    }

    this.outputChannel.appendLine(
      `[MediumPublisher] Publishing article: ${title}`
    );

    try {
      // 获取用户信息
      const userId = await this.getUserId();
      if (!userId) {
        return {
          success: false,
          platform: "medium",
          message: "无法获取 Medium 用户信息，请检查 API Token 是否有效。",
        };
      }

      // 创建文章
      const result = await this.createPost(userId, title, content, tags);
      return result;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[MediumPublisher] Error: ${error.message}`
      );
      return {
        success: false,
        platform: "medium",
        message: `Medium 发布失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取 Medium 用户 ID
   * Get Medium user ID
   */
  private async getUserId(): Promise<string | null> {
    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        hostname: "api.medium.com",
        path: "/v1/me",
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.api_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.data?.id) {
              resolve(response.data.id);
            } else {
              this.outputChannel.appendLine(
                `[MediumPublisher] User info response: ${data}`
              );
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });

      req.on("error", () => resolve(null));
      req.end();
    });
  }

  /**
   * 创建 Medium 文章
   * Create a Medium post
   */
  private async createPost(
    userId: string,
    title: string,
    content: string,
    tags?: string[]
  ): Promise<PublishResult> {
    const postData = JSON.stringify({
      title: title,
      contentFormat: "markdown",
      content: content,
      tags: tags || [],
      publishStatus: "draft", // 默认保存为草稿
    });

    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        hostname: "api.medium.com",
        path: `/v1/users/${userId}/posts`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.api_token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Accept: "application/json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.data?.url) {
              resolve({
                success: true,
                platform: "medium",
                url: response.data.url,
                message: `文章已发布到 Medium (草稿): ${response.data.url}`,
              });
            } else {
              this.outputChannel.appendLine(
                `[MediumPublisher] Post creation response: ${data}`
              );
              resolve({
                success: false,
                platform: "medium",
                message: `Medium 发布失败: ${data}`,
              });
            }
          } catch {
            resolve({
              success: false,
              platform: "medium",
              message: `Medium 发布失败: 无效的响应`,
            });
          }
        });
      });

      req.on("error", (err) => {
        resolve({
          success: false,
          platform: "medium",
          message: `Medium 发布失败: ${err.message}`,
        });
      });

      req.write(postData);
      req.end();
    });
  }
}
