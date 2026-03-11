import * as vscode from 'vscode';

/**
 * Continue-Doc 日志工具
 * 通过 VSCode OutputChannel 输出日志，方便调试和故障排除
 */
export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Continue-Doc');
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 普通信息日志
   */
  info(message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formatted = args.length > 0
      ? `[${timestamp}] [INFO] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
      : `[${timestamp}] [INFO] ${message}`;
    this.outputChannel.appendLine(formatted);
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formatted = args.length > 0
      ? `[${timestamp}] [WARN] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
      : `[${timestamp}] [WARN] ${message}`;
    this.outputChannel.appendLine(formatted);
  }

  /**
   * 错误日志
   */
  error(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [ERROR] ${message}`;
    if (error instanceof Error) {
      formatted += `\n  → ${error.message}\n  → ${error.stack}`;
    } else if (error !== undefined) {
      formatted += `\n  → ${JSON.stringify(error)}`;
    }
    this.outputChannel.appendLine(formatted);
  }

  /**
   * 调试日志
   */
  debug(message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formatted = args.length > 0
      ? `[${timestamp}] [DEBUG] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
      : `[${timestamp}] [DEBUG] ${message}`;
    this.outputChannel.appendLine(formatted);
  }

  /**
   * 显示日志面板
   */
  show(): void {
    this.outputChannel.show(true);
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = Logger.getInstance();
