/**
 * Prompt Builder
 * Constructs prompts for AI-based document generation.
 */

import { DocMessage, AiDocConfig } from "../types";

export class PromptBuilder {
  constructor(private config: AiDocConfig) {}

  /** Update config reference */
  updateConfig(config: AiDocConfig): void {
    this.config = config;
  }

  /**
   * Build the full prompt for document generation.
   * Combines the template, rules, and selected messages.
   */
  buildDocumentPrompt(messages: DocMessage[]): string {
    const sections: string[] = [];

    // 1. System instruction / prompt template
    const template =
      this.config.doc.prompt_template ||
      "Generate a professional technical document from the following AI conversation.\nFocus on practical insights and actionable information.";
    sections.push(template);

    // 2. Rules
    if (this.config.doc.rules) {
      sections.push(`\n## Document Generation Rules\n${this.config.doc.rules}`);
    }

    // 3. Conversation content
    sections.push("\n## Conversation\n");
    for (const msg of messages) {
      const roleLabel = msg.role === "user" ? "User" : "AI Assistant";
      const modelInfo = msg.model ? ` (${msg.model})` : "";
      sections.push(`### ${roleLabel}${modelInfo}\n${msg.content}\n`);
    }

    // 4. Output instructions
    sections.push(
      "\n## Output Requirements\n" +
        "- Output a well-structured Markdown document\n" +
        "- Include a title (# heading)\n" +
        "- Organize content with clear sections\n" +
        "- Preserve important code blocks with proper syntax highlighting\n" +
        "- Add a brief summary at the beginning\n" +
        "- Use professional, clear language\n"
    );

    return sections.join("\n");
  }

  /**
   * Build a prompt to generate a title for the document.
   */
  buildTitlePrompt(messages: DocMessage[]): string {
    const preview = messages
      .slice(0, 3)
      .map((m) => m.content.substring(0, 200))
      .join("\n");

    return (
      `Based on the following conversation snippets, generate a concise, ` +
      `descriptive title (in the same language as the conversation). ` +
      `Output ONLY the title, nothing else.\n\n${preview}`
    );
  }
}
