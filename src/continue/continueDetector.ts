import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Continue 插件检测器
 * 检查 Continue 是否已安装并处于可用状态
 */
export class ContinueDetector {
  private static readonly CONTINUE_EXTENSION_ID = 'continue.continue';

  /**
   * 检查 Continue 是否已安装
   */
  static isInstalled(): boolean {
    const ext = vscode.extensions.getExtension(this.CONTINUE_EXTENSION_ID);
    return ext !== undefined;
  }

  /**
   * 检查 Continue 是否已激活
   */
  static isActive(): boolean {
    const ext = vscode.extensions.getExtension(this.CONTINUE_EXTENSION_ID);
    return ext?.isActive ?? false;
  }

  /**
   * 获取 Continue 扩展实例
   */
  static getExtension(): vscode.Extension<unknown> | undefined {
    return vscode.extensions.getExtension(this.CONTINUE_EXTENSION_ID);
  }

  /**
   * 等待 Continue 激活
   */
  static async waitForActivation(timeoutMs: number = 10000): Promise<boolean> {
    const ext = vscode.extensions.getExtension(this.CONTINUE_EXTENSION_ID);
    if (!ext) {
      logger.warn('Continue extension not found');
      return false;
    }

    if (ext.isActive) {
      logger.info('Continue extension is already active');
      return true;
    }

    logger.info('Waiting for Continue extension to activate...');

    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(() => {
        if (ext.isActive) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          logger.info('Continue extension activated');
          resolve(true);
        }
      }, 500);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        logger.warn(`Continue extension did not activate within ${timeoutMs}ms`);
        resolve(false);
      }, timeoutMs);
    });
  }

  /**
   * 获取 Continue 版本
   */
  static getVersion(): string | undefined {
    const ext = vscode.extensions.getExtension(this.CONTINUE_EXTENSION_ID);
    return ext?.packageJSON?.version;
  }

  /**
   * 执行诊断检查，返回状态报告
   */
  static getDiagnostics(): {
    installed: boolean;
    active: boolean;
    version?: string;
  } {
    return {
      installed: this.isInstalled(),
      active: this.isActive(),
      version: this.getVersion(),
    };
  }
}
