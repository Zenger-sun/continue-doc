/**
 * Continue API 交互模块
 * Interacts with the Continue extension API to read chat history
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { DocMessage } from "../types";

/**
 * Continue 会话历史中的消息格式
 */
interface ContinueHistoryMessage {
  role: string;
  content: string;
}

/**
 * Continue 会话历史格式
 */
interface ContinueSession {
  sessionId: string;
  title: string;
  dateCreated: string;
  history: ContinueHistoryMessage[];
}

export class ContinueAPI {
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * 获取 Continue 全局存储路径
   * Get the Continue global storage path (~/.continue)
   */
  private getContinueDir(): string {
    const homeDir =
      process.env.HOME || process.env.USERPROFILE || "";
    return path.join(homeDir, ".continue");
  }

  /**
   * 获取 Continue 会话历史目录
   * Get the Continue session history directory
   */
  private getSessionsDir(): string {
    return path.join(this.getContinueDir(), "sessions");
  }

  /**
   * 读取所有会话列表
   * Read all available sessions
   */
  async getSessions(): Promise<{ id: string; title: string; date: string }[]> {
    const sessionsDir = this.getSessionsDir();

    if (!fs.existsSync(sessionsDir)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Sessions directory not found: ${sessionsDir}`
      );
      return [];
    }

    try {
      const allFiles = await fsp.readdir(sessionsDir);
      const files = allFiles.filter((f) => f.endsWith(".json"));
      const sessions: { id: string; title: string; date: string }[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(sessionsDir, file);
          const content = await fsp.readFile(filePath, "utf-8");
          const session = JSON.parse(content) as ContinueSession;
          sessions.push({
            id: session.sessionId || path.basename(file, ".json"),
            title: session.title || "Untitled",
            date: session.dateCreated || "",
          });
        } catch {
          // Skip invalid session files
        }
      }

      // 按日期倒序排列
      sessions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      this.outputChannel.appendLine(
        `[ContinueAPI] Found ${sessions.length} sessions.`
      );
      return sessions;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Error reading sessions: ${error.message}`
      );
      return [];
    }
  }

  /**
   * 读取指定会话的消息
   * Read messages from a specific session
   */
  async getSessionMessages(sessionId: string): Promise<DocMessage[]> {
    const sessionsDir = this.getSessionsDir();
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);

    if (!fs.existsSync(sessionFile)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Session file not found: ${sessionFile}`
      );
      return [];
    }

    try {
      const content = await fsp.readFile(sessionFile, "utf-8");
      const session = JSON.parse(content) as ContinueSession;

      return this.convertMessages(session.history || []);
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Error reading session: ${error.message}`
      );
      return [];
    }
  }

  /**
   * 获取最近一次会话的消息
   * Get messages from the most recent session
   */
  async getLatestSessionMessages(): Promise<DocMessage[]> {
    const sessions = await this.getSessions();
    if (sessions.length === 0) {
      return [];
    }

    return this.getSessionMessages(sessions[0].id);
  }

  /**
   * 将 Continue 消息转换为 DocMessage 格式
   * Convert Continue messages to DocMessage format
   */
  private convertMessages(
    historyMessages: ContinueHistoryMessage[]
  ): DocMessage[] {
    const messages: DocMessage[] = [];
    let index = 0;

    for (const msg of historyMessages) {
      // 只处理 user 和 assistant 角色的消息
      if (msg.role !== "user" && msg.role !== "assistant") {
        continue;
      }

      // 过滤掉空消息
      const content =
        typeof msg.content === "string"
          ? msg.content.trim()
          : JSON.stringify(msg.content);

      if (!content) {
        continue;
      }

      messages.push({
        id: `msg-${index}`,
        role: msg.role as "user" | "assistant",
        content: content,
        include: true, // 默认全选
        timestamp: Date.now() - (historyMessages.length - index) * 1000,
        model: undefined,
      });

      index++;
    }

    this.outputChannel.appendLine(
      `[ContinueAPI] Converted ${messages.length} messages.`
    );
    return messages;
  }

  /**
   * 监视会话文件变化
   * Watch for session file changes
   */
  watchSessions(callback: () => void): vscode.Disposable {
    const sessionsDir = this.getSessionsDir();

    if (!fs.existsSync(sessionsDir)) {
      this.outputChannel.appendLine(
        `[ContinueAPI] Cannot watch: sessions directory not found.`
      );
      return new vscode.Disposable(() => {});
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(sessionsDir), "*.json")
    );

    watcher.onDidChange(() => callback());
    watcher.onDidCreate(() => callback());

    this.outputChannel.appendLine(
      `[ContinueAPI] Watching sessions directory: ${sessionsDir}`
    );

    return watcher;
  }
}
