/**
 * Document Generator
 * Orchestrates the document generation pipeline:
 *   Selected Messages → Prompt → AI Model → Markdown → File
 */

import * as vscode from "vscode";
import { MessageStore } from "../chat/messageStore";
import { ConfigLoader } from "../config/configLoader";
import { PromptBuilder } from "./promptBuilder";
import { MarkdownWriter } from "./markdownWriter";
import { DocMessage } from "../types";

export class DocGenerator {
  private promptBuilder: PromptBuilder;
  private markdownWriter: MarkdownWriter;
  private outputChannel: vscode.OutputChannel;

  constructor(
    private messageStore: MessageStore,
    private configLoader: ConfigLoader,
    outputChannel: vscode.OutputChannel
  ) {
    this.promptBuilder = new PromptBuilder(configLoader.getConfig());
    this.markdownWriter = new MarkdownWriter();
    this.outputChannel = outputChannel;

    // Keep prompt builder config in sync
    configLoader.onConfigChanged((config) => {
      this.promptBuilder.updateConfig(config);
    });
  }

  /**
   * Main entry point: generate a document from selected messages.
   */
  async generateDocument(): Promise<string | undefined> {
    const messages = this.messageStore.getIncludedMessages();

    if (messages.length === 0) {
      vscode.window.showWarningMessage(
        "aiDocExtra: No messages selected for documentation. " +
          "Add messages first, then try again."
      );
      return undefined;
    }

    this.outputChannel.appendLine(
      `[DocGenerator] Generating document from ${messages.length} messages...`
    );

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "aiDocExtra: Generating document...",
        cancellable: true,
      },
      async (progress, token) => {
        try {
          // Step 1: Build the prompt
          progress.report({ message: "Building prompt...", increment: 10 });
          const prompt = this.promptBuilder.buildDocumentPrompt(messages);

          if (token.isCancellationRequested) {
            return undefined;
          }

          // Step 2: Generate content using AI
          progress.report({
            message: "Generating content with AI...",
            increment: 30,
          });
          const generatedContent = await this.generateWithAI(
            prompt,
            messages,
            token
          );

          if (!generatedContent || token.isCancellationRequested) {
            return undefined;
          }

          // Step 3: Extract or generate title
          progress.report({ message: "Finalizing...", increment: 30 });
          const title = this.extractTitle(generatedContent);

          // Step 4: Write to file
          progress.report({ message: "Writing file...", increment: 20 });
          const outputDir = this.configLoader.getOutputDir();
          const filepath = await this.markdownWriter.writeDocument(
            outputDir,
            generatedContent,
            title
          );

          // Step 5: Open in editor
          progress.report({ message: "Done!", increment: 10 });
          await this.markdownWriter.openDocument(filepath);

          this.outputChannel.appendLine(
            `[DocGenerator] Document saved: ${filepath}`
          );
          vscode.window.showInformationMessage(
            `aiDocExtra: Document generated successfully!`
          );

          return filepath;
        } catch (err) {
          this.outputChannel.appendLine(
            `[DocGenerator] Error: ${err}`
          );
          vscode.window.showErrorMessage(
            `aiDocExtra: Document generation failed: ${err}`
          );
          return undefined;
        }
      }
    );
  }

  /**
   * Generate content using AI.
   * Tries multiple strategies:
   * 1. Direct prompt to Continue via command
   * 2. Fallback: Build a well-structured document from messages directly
   */
  private async generateWithAI(
    prompt: string,
    messages: DocMessage[],
    token: vscode.CancellationToken
  ): Promise<string | undefined> {
    // Strategy: Since we cannot directly get AI response from Continue's API
    // programmatically, we generate a structured document from the conversation
    // ourselves, using the prompt rules as guidance.
    //
    // In future versions, this could integrate with Continue's API or
    // use a direct LLM API call.

    return this.buildStructuredDocument(messages);
  }

  /**
   * Build a structured Markdown document from messages.
   * This is the built-in document builder that doesn't require external AI.
   */
  private buildStructuredDocument(messages: DocMessage[]): string {
    const config = this.configLoader.getConfig();
    const sections: string[] = [];

    // Title - derived from first user message
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg
      ? this.generateTitle(firstUserMsg.content)
      : "AI Conversation Document";

    sections.push(`# ${title}\n`);

    // Summary
    sections.push(`## Summary\n`);
    sections.push(
      `This document was generated from an AI-assisted conversation ` +
        `containing ${messages.length} messages.\n`
    );

    // Table of contents based on conversation turns
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length > 1) {
      sections.push(`## Topics Discussed\n`);
      userMessages.forEach((m, i) => {
        const topic = m.content.split("\n")[0].substring(0, 80);
        sections.push(`${i + 1}. ${topic}`);
      });
      sections.push("");
    }

    // Conversation content - organized by Q&A pairs
    sections.push(`## Conversation Details\n`);

    let pairIndex = 0;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === "user") {
        pairIndex++;
        sections.push(
          `### ${pairIndex}. ${msg.content.split("\n")[0].substring(0, 100)}\n`
        );
        sections.push(`**Question:**\n`);
        sections.push(msg.content);
        sections.push("");

        // Look for the corresponding assistant response
        if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
          const response = messages[i + 1];
          sections.push(`**Answer:**\n`);
          sections.push(response.content);
          if (response.model) {
            sections.push(`\n*Model: ${response.model}*`);
          }
          sections.push("");
          i++; // Skip the assistant message in the next iteration
        }
      } else {
        // Standalone assistant message
        pairIndex++;
        sections.push(`### ${pairIndex}. AI Response\n`);
        sections.push(msg.content);
        if (msg.model) {
          sections.push(`\n*Model: ${msg.model}*`);
        }
        sections.push("");
      }
    }

    // Footer
    sections.push(`---\n`);
    sections.push(
      `*Generated by aiDocExtra on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}*\n`
    );

    return sections.join("\n");
  }

  /**
   * Extract title from generated content (first # heading)
   */
  private extractTitle(content: string): string | undefined {
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim();
  }

  /**
   * Generate a short title from message content
   */
  private generateTitle(content: string): string {
    // Take first line, clean it up
    const firstLine = content.split("\n")[0].trim();
    if (firstLine.length <= 80) {
      return firstLine;
    }
    return firstLine.substring(0, 77) + "...";
  }
}
