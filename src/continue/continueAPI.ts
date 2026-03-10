/**
 * Continue API Interaction Layer
 * Provides methods to interact with Continue's functionality via VSCode APIs.
 */

import * as vscode from "vscode";

export class ContinueAPI {
  /**
   * Send a prompt to Continue's AI model via the Continue command.
   * Uses the "continue.sendMainUserInput" command if available.
   */
  static async sendPrompt(prompt: string): Promise<void> {
    try {
      await vscode.commands.executeCommand(
        "continue.sendMainUserInput",
        prompt
      );
    } catch (err) {
      throw new Error(`Failed to send prompt to Continue: ${err}`);
    }
  }

  /**
   * Focus the Continue sidebar panel
   */
  static async focusPanel(): Promise<void> {
    try {
      await vscode.commands.executeCommand("continue.focusContinueInput");
    } catch {
      // Fallback: try focusing the view container
      try {
        await vscode.commands.executeCommand("workbench.view.extension.continue");
      } catch {
        // Silently fail - Continue may not be available
      }
    }
  }

  /**
   * Get all available Continue commands for discovery
   */
  static async getAvailableCommands(): Promise<string[]> {
    const allCommands = await vscode.commands.getCommands(true);
    return allCommands.filter((cmd) => cmd.startsWith("continue."));
  }
}
