import { logger } from '../utils/logger';
import { PublishError } from '../utils/errors';

/**
 * Dev.to 发布器（计划中）
 * 通过 Dev.to API 发布文章
 */
export class DevtoPublisher {
  private readonly API_BASE = 'https://dev.to/api';

  /**
   * 发布文章到 Dev.to
   * @param markdownContent Markdown 内容
   * @param options 发布选项
   * @returns 文章 URL
   */
  async publish(
    markdownContent: string,
    options: {
      apiToken: string;
      tags?: string[];
      series?: string;
    }
  ): Promise<string> {
    logger.info('DevtoPublisher: Starting publish');

    const title = this.extractTitle(markdownContent);
    const body = this.removeTitle(markdownContent);

    const url = `${this.API_BASE}/articles`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': options.apiToken,
      },
      body: JSON.stringify({
        article: {
          title,
          body_markdown: body,
          published: false, // 默认为草稿
          tags: options.tags || [],
          series: options.series,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new PublishError(
        `Failed to publish to Dev.to (${response.status}): ${errorText}`,
        'devto'
      );
    }

    const data = await response.json() as { url?: string };

    if (!data.url) {
      throw new PublishError('Dev.to API returned no article URL', 'devto');
    }

    logger.info(`DevtoPublisher: Article published at ${data.url}`);
    return data.url;
  }

  /**
   * 从 Markdown 提取标题
   */
  private extractTitle(markdown: string): string {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled';
  }

  /**
   * 移除 Markdown 中的第一个标题（Dev.to API 单独接收 title）
   */
  private removeTitle(markdown: string): string {
    return markdown.replace(/^#\s+.+\n?/, '').trim();
  }
}
