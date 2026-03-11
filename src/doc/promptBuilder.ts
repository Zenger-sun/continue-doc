import { ChatMessage } from '../chat/messageStore';
import { DocConfig } from '../config/configLoader';

/**
 * AI 提示构造器
 *
 * 负责将对话消息 + 配置规则构造为 AI 提示
 *
 * 流程（来自 mind.md）：
 * 原始对话消息
 *     ↓
 * 应用生成规则
 *     ↓
 * 添加格式指令
 *     ↓
 * 发送到 AI 模型
 */
export class PromptBuilder {
  constructor(private docConfig: DocConfig) {}

  /**
   * 构建完整的文档生成提示
   */
  buildDocumentPrompt(messages: ChatMessage[], language: string): string {
    const isZh = language === 'zh';

    // 如果用户配置了自定义模板，使用自定义模板
    if (this.docConfig.prompt_template) {
      return this.buildCustomPrompt(messages, this.docConfig.prompt_template);
    }

    // 使用默认提示模板
    return isZh
      ? this.buildChinesePrompt(messages)
      : this.buildEnglishPrompt(messages);
  }

  /**
   * 使用自定义模板构建提示
   */
  private buildCustomPrompt(messages: ChatMessage[], template: string): string {
    const conversation = this.formatConversation(messages);
    const rules = this.docConfig.rules || '';

    // 替换模板中的变量
    let prompt = template;
    prompt += '\n\n';

    if (rules) {
      prompt += `Additional Rules:\n${rules}\n\n`;
    }

    prompt += `Conversation:\n${conversation}`;

    return prompt;
  }

  /**
   * 构建中文提示
   */
  private buildChinesePrompt(messages: ChatMessage[]): string {
    const conversation = this.formatConversation(messages);
    const rules = this.docConfig.rules || '';

    return `你是一名专业的技术文档编写者。请根据以下 AI 对话记录，生成一篇结构清晰、专业的技术文档。

## 要求

1. 输出格式必须是 Markdown
2. 包含以下结构：
   - 标题（基于对话主题自动生成）
   - 问题描述
   - 解决方案 / 详细步骤
   - 代码示例（如果对话中包含代码）
   - 关键要点总结
   - 未解决的问题（如果有）
3. 使用专业但易懂的语言
4. 保留对话中有价值的技术细节和代码片段
5. 去除寒暄、重复、离题的内容
6. 代码块必须标明语言类型

${rules ? `## 自定义规则\n\n${rules}\n` : ''}
## 对话记录

${conversation}

## 输出

请直接输出 Markdown 文档内容（不需要包裹在代码块中）：`;
  }

  /**
   * 构建英文提示
   */
  private buildEnglishPrompt(messages: ChatMessage[]): string {
    const conversation = this.formatConversation(messages);
    const rules = this.docConfig.rules || '';

    return `You are a professional technical documentation writer. Based on the following AI conversation, generate a well-structured, professional technical document.

## Requirements

1. Output format must be Markdown
2. Include the following structure:
   - Title (auto-generated from conversation topic)
   - Problem Description
   - Solution / Detailed Steps
   - Code Examples (if the conversation contains code)
   - Key Takeaways
   - Unresolved Issues (if any)
3. Use professional but accessible language
4. Preserve valuable technical details and code snippets from the conversation
5. Remove greetings, repetition, and off-topic content
6. Code blocks must specify the language

${rules ? `## Custom Rules\n\n${rules}\n` : ''}
## Conversation

${conversation}

## Output

Please output the Markdown document content directly (no need to wrap in code blocks):`;
  }

  /**
   * 格式化对话消息为文本
   */
  private formatConversation(messages: ChatMessage[]): string {
    return messages
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : 'AI Assistant';
        const time = new Date(msg.timestamp).toLocaleString();
        return `**[${role}]** (${time})\n${msg.content}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * 更新配置
   */
  updateConfig(docConfig: DocConfig): void {
    this.docConfig = docConfig;
  }
}
