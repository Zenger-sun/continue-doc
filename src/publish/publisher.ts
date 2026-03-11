import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { PublishError } from '../utils/errors';
import { ConfigLoader, PublishConfig } from '../config/configLoader';
import { ZhihuPublisher } from './zhihuPublisher';

/**
 * 发布编排器
 * 统一管理多平台发布流程
 *
 * 流程（来自 mind.md）：
 * Markdown → 转换 HTML → 调用平台 API
 */
export class Publisher {
  private zhihuPublisher: ZhihuPublisher;

  constructor(private readonly configLoader: ConfigLoader) {
    this.zhihuPublisher = new ZhihuPublisher();
  }

  /**
   * 发布文档到指定平台
   *
   * @param markdownContent Markdown 内容
   * @param platform 目标平台（可选，默认使用配置中的 target）
   */
  async publish(markdownContent: string, platform?: string): Promise<string> {
    const config = this.configLoader.getPublishConfig();
    const targetPlatform = platform || config.target || 'zhihu';
    const language = this.configLoader.getLanguage();

    logger.info(`Publisher: Publishing to ${targetPlatform}`);

    // 让用户确认
    const isZh = language === 'zh';
    const confirmMessage = isZh
      ? `确认发布到 ${targetPlatform}？`
      : `Confirm publish to ${targetPlatform}?`;
    const yesLabel = isZh ? '确认发布' : 'Confirm';
    const cancelLabel = isZh ? '取消' : 'Cancel';

    const choice = await vscode.window.showInformationMessage(
      confirmMessage,
      { modal: true },
      yesLabel,
      cancelLabel
    );

    if (choice !== yesLabel) {
      logger.info('Publisher: User cancelled publishing');
      throw new PublishError('Publishing cancelled by user', targetPlatform);
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: isZh ? `正在发布到 ${targetPlatform}...` : `Publishing to ${targetPlatform}...`,
        cancellable: false,
      },
      async () => {
        switch (targetPlatform.toLowerCase()) {
          case 'zhihu':
            return this.publishToZhihu(markdownContent, config);
          case 'medium':
            return this.publishToMedium(markdownContent, config);
          case 'devto':
            return this.publishToDevto(markdownContent, config);
          default:
            throw new PublishError(`Unsupported platform: ${targetPlatform}`, targetPlatform);
        }
      }
    );
  }

  /**
   * 选择发布平台
   */
  async selectPlatformAndPublish(markdownContent: string): Promise<void> {
    const language = this.configLoader.getLanguage();
    const isZh = language === 'zh';

    const platforms = [
      { label: isZh ? '知乎' : 'Zhihu', value: 'zhihu', description: isZh ? '已支持' : 'Supported' },
      { label: 'Medium', value: 'medium', description: isZh ? '开发中' : 'Coming soon' },
      { label: 'Dev.to', value: 'devto', description: isZh ? '计划中' : 'Planned' },
    ];

    const selected = await vscode.window.showQuickPick(platforms, {
      placeHolder: isZh ? '选择发布平台' : 'Select publishing platform',
    });

    if (!selected) {
      return;
    }

    try {
      const url = await this.publish(markdownContent, selected.value);
      const msg = isZh
        ? `发布成功！文章链接：${url}`
        : `Published successfully! Article URL: ${url}`;
      const openLabel = isZh ? '打开链接' : 'Open URL';

      const action = await vscode.window.showInformationMessage(msg, openLabel);
      if (action === openLabel) {
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    } catch (err) {
      if (err instanceof PublishError && err.message.includes('cancelled')) {
        return;
      }
      const errorMsg = isZh
        ? `发布失败：${err instanceof Error ? err.message : String(err)}`
        : `Publish failed: ${err instanceof Error ? err.message : String(err)}`;
      vscode.window.showErrorMessage(errorMsg);
    }
  }

  /**
   * 发布到知乎
   */
  private async publishToZhihu(content: string, config: PublishConfig): Promise<string> {
    if (!config.zhihu?.cookie) {
      throw new PublishError(
        'Zhihu cookie not configured. Please set it in .continue-doc/config.yaml',
        'zhihu'
      );
    }

    return this.zhihuPublisher.publish(content, {
      cookie: config.zhihu.cookie,
      tags: config.zhihu.tags,
    });
  }

  /**
   * 发布到 Medium（待实现）
   */
  private async publishToMedium(_content: string, _config: PublishConfig): Promise<string> {
    throw new PublishError(
      'Medium publishing is not yet implemented. Coming in v0.2.0',
      'medium'
    );
  }

  /**
   * 发布到 Dev.to（待实现）
   */
  private async publishToDevto(_content: string, _config: PublishConfig): Promise<string> {
    throw new PublishError(
      'Dev.to publishing is not yet implemented. Planned for future release.',
      'devto'
    );
  }
}
