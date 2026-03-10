/**
 * 提示词模板生成
 * Prompt template builder for document generation
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
   */
  buildDocPrompt(messages: DocMessage[]): string {
    const rules = this.config.doc.rules || "";
    const customTemplate = this.config.doc.prompt_template || "";
    const language = this.config.language || "zh";

    // 格式化对话内容
    const conversationText = this.formatConversation(messages);

    // 构建完整的提示词
    const systemPrompt = this.buildSystemPrompt(language, rules, customTemplate);

    return `${systemPrompt}\n\n---\n\n## 对话内容 / Conversation Content\n\n${conversationText}\n\n---\n\n请根据以上对话内容生成文档。\nPlease generate a document based on the above conversation.`;
  }

  /**
   * 构建系统提示词
   * Build the system prompt
   */
  private buildSystemPrompt(
    language: string,
    rules: string,
    customTemplate: string
  ): string {
    if (customTemplate) {
      return `${customTemplate}\n\n### 生成规则 / Generation Rules:\n${rules}`;
    }

    if (language === "en") {
      return [
        "# Document Generation Task",
        "",
        "You are a professional technical writer. Generate a well-structured Markdown document from the following AI conversation.",
        "",
        "## Requirements:",
        "- Create a clear, descriptive title",
        "- Organize content logically with headings and sections",
        "- Preserve important code snippets with proper formatting",
        "- Remove unnecessary conversational elements",
        "- Add a brief summary/introduction",
        "- Use proper Markdown formatting throughout",
        "",
        "## Additional Rules:",
        rules,
        "",
        "## Output Format:",
        "- Output a complete Markdown document",
        "- Start with a title (# heading)",
        "- Include a brief introduction",
        "- Organize the main content with appropriate headings",
        "- End with a summary or conclusion if applicable",
      ].join("\n");
    }

    // Chinese (default)
    return [
      "# 文档生成任务",
      "",
      "你是一名专业的技术文档写作者。请根据以下 AI 对话内容，生成一篇结构清晰的 Markdown 文档。",
      "",
      "## 要求：",
      "- 创建一个清晰、有描述性的标题",
      "- 使用标题和章节来合理组织内容",
      "- 保留重要的代码片段并使用正确的格式",
      "- 删除不必要的对话元素",
      "- 添加简要的摘要/引言",
      "- 全文使用规范的 Markdown 格式",
      "",
      "## 额外规则：",
      rules,
      "",
      "## 输出格式：",
      "- 输出完整的 Markdown 文档",
      "- 以标题（# 标题）开头",
      "- 包含简要引言",
      "- 使用合适的标题组织主要内容",
      "- 如果适用，以总结或结论结尾",
    ].join("\n");
  }

  /**
   * 格式化对话内容
   * Format conversation messages
   */
  private formatConversation(messages: DocMessage[]): string {
    return messages
      .map((msg) => {
        const role = msg.role === "user" ? "👤 User" : "🤖 AI";
        return `### ${role}\n\n${msg.content}`;
      })
      .join("\n\n---\n\n");
  }
}
