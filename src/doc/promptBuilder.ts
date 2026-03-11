/**
 * 提示词模板生成
 * Prompt template builder for document generation
 *
 * 组装结构：
 *   prompt_template（配置项）
 *   + rules（配置项）
 *   + 对话内容（选中的消息）
 */

import { DocMessage, ContinueDocConfig } from "../types";

export class PromptBuilder {
  private config: ContinueDocConfig;

  constructor(config: ContinueDocConfig) {
    this.config = config;
  }

  /**
   * 更新配置
   * Update configuration
   */
  updateConfig(config: ContinueDocConfig): void {
    this.config = config;
  }

  /**
   * 构建文档生成提示词
   * Build the prompt for document generation
   *
   * 组装顺序：
   *   1. prompt_template  —— 告诉 AI 做什么
   *   2. rules            —— 生成规则
   *   3. 对话内容          —— 选中的消息全文
   */
  buildDocPrompt(messages: DocMessage[]): string {
    const promptTemplate = this.config.doc.prompt_template || "";
    const rules = this.config.doc.rules || "";

    // 格式化对话内容
    const conversationText = this.formatConversation(messages);

    const parts: string[] = [];

    // prompt_template
    if (promptTemplate) {
      parts.push(promptTemplate);
    }

    // rules
    if (rules) {
      parts.push(`规则：\n${rules}`);
    }

    // 对话内容
    parts.push(`对话内容：\n${conversationText}`);

    return parts.join("\n\n");
  }

  /**
   * 格式化对话内容：保留完整原文
   * Format conversation messages: keep full original text
   */
  private formatConversation(messages: DocMessage[]): string {
    return messages
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "AI";
        return `[${role}]\n${msg.content}`;
      })
      .join("\n\n---\n\n");
  }
}
