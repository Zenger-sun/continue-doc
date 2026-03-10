/**
 * Continue Installation Detector
 * Checks whether the Continue extension is installed and active.
 */

import * as vscode from "vscode";

const CONTINUE_EXTENSION_ID = "continue.continue";

export class ContinueDetector {
  /** Check if Continue extension is installed */
  static isInstalled(): boolean {
    const ext = vscode.extensions.getExtension(CONTINUE_EXTENSION_ID);
    return ext !== undefined;
  }

  /** Check if Continue extension is active */
  static isActive(): boolean {
    const ext = vscode.extensions.getExtension(CONTINUE_EXTENSION_ID);
    return ext?.isActive ?? false;
  }

  /** Get Continue extension API (if it exposes one) */
  static getApi(): unknown | undefined {
    const ext = vscode.extensions.getExtension(CONTINUE_EXTENSION_ID);
    if (ext?.isActive) {
      return ext.exports;
    }
    return undefined;
  }

  /** Wait for Continue to activate, with timeout */
  static async waitForActivation(
    timeoutMs: number = 10000
  ): Promise<boolean> {
    const ext = vscode.extensions.getExtension(CONTINUE_EXTENSION_ID);
    if (!ext) {
      return false;
    }
    if (ext.isActive) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);

      const checkInterval = setInterval(() => {
        if (ext.isActive) {
          clearTimeout(timer);
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 500);

      // Also clear interval on timeout
      setTimeout(() => clearInterval(checkInterval), timeoutMs);
    });
  }

  /** Prompt user to install Continue if not found */
  static async promptInstall(): Promise<void> {
    const action = await vscode.window.showWarningMessage(
      "aiDocExtra requires the Continue extension. Would you like to install it?",
      "Install Continue",
      "Dismiss"
    );

    if (action === "Install Continue") {
      await vscode.commands.executeCommand(
        "workbench.extensions.installExtension",
        CONTINUE_EXTENSION_ID
      );
    }
  }
}
