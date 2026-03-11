import { logger } from '../utils/logger';
import { PublishError } from '../utils/errors';

/**
 * 知乎发布器
 * 通过知乎 API 发布文章
 *
 * 使用方式：
 * 1. 用户在浏览器中登录知乎
 * 2. 从 DevTools 获取 Cookie（z_c0 字段）
 * 3. 配置到 .continue-doc/config.yaml
 */
export class ZhihuPublisher {
  private readonly API_BASE = 'https://zhuanlan.zhihu.com/api';

  /**
   * 发布文章到知乎
   *
   * @param markdownContent Markdown 内容
   * @param options 发布选项
   * @returns 文章 URL
   */
  async publish(
    markdownContent: string,
    options: {
      cookie: string;
      tags?: string[];
      column?: string;
    }
  ): Promise<string> {
    logger.info('ZhihuPublisher: Starting publish');

    // 提取标题和内容
    const { title, content } = this.extractTitleAndContent(markdownContent);

    // 将 Markdown 转换为 HTML
    const htmlContent = this.markdownToHtml(content);

    // 发布草稿
    const draftId = await this.createDraft(title, htmlContent, options.cookie);

    // 发布文章
    const articleUrl = await this.publishDraft(draftId, options.cookie, options.tags);

    logger.info(`ZhihuPublisher: Article published at ${articleUrl}`);
    return articleUrl;
  }

  /**
   * 提取标题和正文
   */
  private extractTitleAndContent(markdown: string): { title: string; content: string } {
    const lines = markdown.trim().split('\n');
    let title = 'Untitled';
    let contentStartIndex = 0;

    // 查找第一个 # 标题
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^#\s+(.+)$/);
      if (match) {
        title = match[1].trim();
        contentStartIndex = i + 1;
        break;
      }
    }

    const content = lines.slice(contentStartIndex).join('\n').trim();
    return { title, content };
  }

  /**
   * 简单的 Markdown to HTML 转换
   * 知乎 API 需要 HTML 格式
   */
  private markdownToHtml(markdown: string): string {
    let html = markdown;

    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`;
    });

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 标题
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // 粗体和斜体
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // 分割线
    html = html.replace(/^---$/gm, '<hr>');

    // 引用
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // 段落（将连续的非空行包裹在 <p> 标签中）
    html = html.replace(/^(?!<[a-z])((?!<\/).+)$/gm, '<p>$1</p>');

    // 清理多余空行
    html = html.replace(/\n{2,}/g, '\n');

    return html;
  }

  /**
   * 创建知乎草稿
   */
  private async createDraft(
    title: string,
    htmlContent: string,
    cookie: string
  ): Promise<string> {
    const url = `${this.API_BASE}/drafts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        title,
        content: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new PublishError(
        `Failed to create Zhihu draft (${response.status}): ${errorText}`,
        'zhihu'
      );
    }

    const data = await response.json() as { id?: string };
    if (!data.id) {
      throw new PublishError('Zhihu API returned no draft ID', 'zhihu');
    }

    logger.info(`ZhihuPublisher: Draft created with ID: ${data.id}`);
    return data.id;
  }

  /**
   * 发布知乎草稿
   */
  private async publishDraft(
    draftId: string,
    cookie: string,
    tags?: string[]
  ): Promise<string> {
    const url = `${this.API_BASE}/drafts/${draftId}/publish`;

    const body: Record<string, unknown> = {};
    if (tags && tags.length > 0) {
      body.topics = tags.map(tag => ({ name: tag }));
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new PublishError(
        `Failed to publish Zhihu draft (${response.status}): ${errorText}`,
        'zhihu'
      );
    }

    const data = await response.json() as { url?: string; id?: string };

    // 返回文章 URL
    if (data.url) {
      return data.url;
    }

    // 构造 URL
    return `https://zhuanlan.zhihu.com/p/${data.id || draftId}`;
  }
}
