/**
 * Continue 安装检测器
 * Detects whether the Continue extension is installed and enabled
 */

import * as vscode from "vscode";

/** Continue 扩展的可能 ID */
const CONTINUE_EXTENSION_IDS = [
  "Continue.continue",
  "continue.continue",
];

export class ContinueDetector {
  private outputChannel: vscode.OutputChannel;
  private continueExtension: vscode.Extension<any> | undefined;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * 检测 Continue 是否已安装
   * Detect whether Continue is installed
   */
  detect(): boolean {
    for (const id of CONTINUE_EXTENSION_IDS) {
      const ext = vscode.extensions.getExtension(id);
      if (ext) {
        this.continueExtension = ext;
        this.outputChannel.appendLine(
          `[ContinueDetector] Found Continue extension: ${id} (active: ${ext.isActive})`
        );
        return true;
      }
    }

    this.outputChannel.appendLine(
      "[ContinueDetector] Continue extension not found."
    );
    return false;
  }

  /**
   * 获取 Continue 扩展实例
   * Get the Continue extension instance
   */
  getExtension(): vscode.Extension<any> | undefined {
    return this.continueExtension;
  }

  /**
   * 检查 Continue 是否已激活
   * Check if Continue is active
   */
  isActive(): boolean {
    return this.continueExtension?.isActive ?? false;
  }

  /**
   * 等待 Continue 激活
   * Wait for Continue to be activated
   */
  async waitForActivation(timeoutMs: number = 10000): Promise<boolean> {
    if (this.continueExtension?.isActive) {
      return true;
    }

    if (!this.continueExtension) {
      return false;
    }

    try {
      const activatePromise = this.continueExtension.activate();
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      );

      const result = await Promise.race([activatePromise, timeoutPromise]);
      if (result === null) {
        this.outputChannel.appendLine(
          "[ContinueDetector] Timeout waiting for Continue activation."
        );
        return false;
      }

      this.outputChannel.appendLine(
        "[ContinueDetector] Continue extension activated."
      );
      return true;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueDetector] Error activating Continue: ${error.message}`
      );
      return false;
    }
  }
}
