import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * 操作栏状态栏项
 * 在 VSCode 底部状态栏显示快捷操作按钮
 *
 * 显示效果：
 *   [$(notebook) Continue-Doc: 5 msgs] [$(markdown) Generate] [$(cloud-upload) Publish]
 */
export class ActionBar {
  private statusBarItem: vscode.StatusBarItem;
  private generateItem: vscode.StatusBarItem;
  private publishItem: vscode.StatusBarItem;

  constructor() {
    // 主状态栏项：显示消息计数
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'continue-doc.selectSession';
    this.statusBarItem.tooltip = 'Continue-Doc: Click to manage sessions';

    // 生成文档按钮
    this.generateItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      99
    );
    this.generateItem.command = 'continue-doc.generateDocument';
    this.generateItem.text = '$(markdown) Generate';
    this.generateItem.tooltip = 'Generate document from selected messages';

    // 发布按钮
    this.publishItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      98
    );
    this.publishItem.command = 'continue-doc.publishArticle';
    this.publishItem.text = '$(cloud-upload) Publish';
    this.publishItem.tooltip = 'Publish document to platform';
  }

  /**
   * 显示操作栏
   */
  show(): void {
    this.statusBarItem.show();
    this.generateItem.show();
    this.publishItem.show();
    logger.debug('Action bar shown');
  }

  /**
   * 隐藏操作栏
   */
  hide(): void {
    this.statusBarItem.hide();
    this.generateItem.hide();
    this.publishItem.hide();
  }

  /**
   * 更新消息计数
   */
  updateMessageCount(total: number, selected: number): void {
    if (total === 0) {
      this.statusBarItem.text = '$(notebook) Continue-Doc';
    } else {
      this.statusBarItem.text = `$(notebook) Continue-Doc: ${selected}/${total} msgs`;
    }
  }

  /**
   * 设置加载状态
   */
  setLoading(isLoading: boolean): void {
    if (isLoading) {
      this.generateItem.text = '$(loading~spin) Generating...';
      this.generateItem.command = undefined;
    } else {
      this.generateItem.text = '$(markdown) Generate';
      this.generateItem.command = 'continue-doc.generateDocument';
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.generateItem.dispose();
    this.publishItem.dispose();
  }
}
