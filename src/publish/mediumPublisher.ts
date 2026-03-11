import { logger } from '../utils/logger';
import { PublishError } from '../utils/errors';

/**
 * Medium 发布器（开发中）
 * 通过 Medium API 发布文章
 */
export class MediumPublisher {
  private readonly API_BASE = 'https://api.medium.com/v1';

  /**
   * 发布文章到 Medium
   * @param markdownContent Markdown 内容
   * @param options 发布选项
   * @returns 文章 URL
   */
  async publish(
    markdownContent: string,
    options: {
      apiToken: string;
      publication?: string;
      tags?: string[];
    }
  ): Promise<string> {
    logger.info('MediumPublisher: Starting publish');

    // 获取用户信息
    const userId = await this.getUserId(options.apiToken);

    // 提取标题
    const title = this.extractTitle(markdownContent);

    // 发布文章
    const url = `${this.API_BASE}/users/${userId}/posts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiToken}`,
      },
      body: JSON.stringify({
        title,
        contentFormat: 'markdown',
        content: markdownContent,
        tags: options.tags || [],
        publishStatus: 'draft', // 默认发布为草稿
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new PublishError(
        `Failed to publish to Medium (${response.status}): ${errorText}`,
        'medium'
      );
    }

    const data = await response.json() as { data?: { url?: string } };
    const articleUrl = data.data?.url;

    if (!articleUrl) {
      throw new PublishError('Medium API returned no article URL', 'medium');
    }

    logger.info(`MediumPublisher: Article published at ${articleUrl}`);
    return articleUrl;
  }

  /**
   * 获取 Medium 用户 ID
   */
  private async getUserId(apiToken: string): Promise<string> {
    const url = `${this.API_BASE}/me`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new PublishError(
        `Failed to get Medium user info (${response.status})`,
        'medium'
      );
    }

    const data = await response.json() as { data?: { id?: string } };
    const userId = data.data?.id;

    if (!userId) {
      throw new PublishError('Could not get Medium user ID', 'medium');
    }

    return userId;
  }

  /**
   * 从 Markdown 提取标题
   */
  private extractTitle(markdown: string): string {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled';
  }
}
