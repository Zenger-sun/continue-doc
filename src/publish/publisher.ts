/**
 * Publisher Base / Orchestrator
 * Manages publishing documents to various platforms.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import { ConfigLoader } from "../config/configLoader";
import { PublishResult } from "../types";
import { ZhihuPublisher } from "./zhihuPublisher";
import { MediumPublisher } from "./mediumPublisher";

interface PlatformPublisher {
  name: string;
  publish(title: string, content: string): Promise<PublishResult>;
  isConfigured(): boolean;
}

export class Publisher {
  private platforms: Map<string, PlatformPublisher> = new Map();
  private outputChannel: vscode.OutputChannel;

  constructor(
    private configLoader: ConfigLoader,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
    this.initializePlatforms();
  }

  /** Initialize available publishing platforms */
  private initializePlatforms(): void {
    const config = this.configLoader.getConfig();

    this.platforms.set(
      "zhihu",
      new ZhihuPublisher(config.publish.zhihu?.cookie || "")
    );
    this.platforms.set(
      "medium",
      new MediumPublisher(config.publish.medium?.api_token || "")
    );

    // Re-initialize on config change
    this.configLoader.onConfigChanged((newConfig) => {
      this.platforms.set(
        "zhihu",
        new ZhihuPublisher(newConfig.publish.zhihu?.cookie || "")
      );
      this.platforms.set(
        "medium",
        new MediumPublisher(newConfig.publish.medium?.api_token || "")
      );
    });
  }

  /**
   * Publish a markdown file to a platform.
   */
  async publishFile(filepath: string): Promise<void> {
    // Read file
    if (!fs.existsSync(filepath)) {
      vscode.window.showErrorMessage(
        `aiDocExtra: File not found: ${filepath}`
      );
      return;
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const title = this.extractTitle(content);

    // Let user choose platform
    const config = this.configLoader.getConfig();
    const availablePlatforms = Array.from(this.platforms.entries())
      .map(([key, p]) => ({
        label: p.name,
        description: p.isConfigured() ? "Configured" : "Not configured",
        key,
      }));

    const selected = await vscode.window.showQuickPick(availablePlatforms, {
      placeHolder: "Select publishing platform",
      title: "aiDocExtra: Publish Article",
    });

    if (!selected) {
      return;
    }

    const platform = this.platforms.get(selected.key);
    if (!platform) {
      return;
    }

    if (!platform.isConfigured()) {
      const configure = await vscode.window.showWarningMessage(
        `${platform.name} is not configured. Would you like to configure it?`,
        "Open Config",
        "Cancel"
      );
      if (configure === "Open Config") {
        await this.configLoader.openConfigFile();
      }
      return;
    }

    // Publish with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `aiDocExtra: Publishing to ${platform.name}...`,
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Uploading..." });
          // Strip frontmatter before publishing
          const cleanContent = this.stripFrontmatter(content);
          const result = await platform.publish(
            title || "Untitled",
            cleanContent
          );

          if (result.success) {
            const action = result.url
              ? await vscode.window.showInformationMessage(
                  `aiDocExtra: Published to ${platform.name}!`,
                  "Open in Browser"
                )
              : await vscode.window.showInformationMessage(
                  `aiDocExtra: Published to ${platform.name}!`
                );

            if (action === "Open in Browser" && result.url) {
              vscode.env.openExternal(vscode.Uri.parse(result.url));
            }
          } else {
            vscode.window.showErrorMessage(
              `aiDocExtra: Publishing failed: ${result.message}`
            );
          }
        } catch (err) {
          this.outputChannel.appendLine(
            `[Publisher] Error publishing to ${platform.name}: ${err}`
          );
          vscode.window.showErrorMessage(
            `aiDocExtra: Publishing failed: ${err}`
          );
        }
      }
    );
  }

  /**
   * Interactive publish flow: select a document then a platform
   */
  async publishInteractive(): Promise<void> {
    const outputDir = this.configLoader.getOutputDir();
    const files = this.listMarkdownFiles(outputDir);

    if (files.length === 0) {
      vscode.window.showInformationMessage(
        "aiDocExtra: No documents found. Generate a document first."
      );
      return;
    }

    // Let user pick a document
    const items = files.map((f) => ({
      label: f.name,
      description: f.date,
      filepath: f.path,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a document to publish",
      title: "aiDocExtra: Select Document",
    });

    if (!selected) {
      return;
    }

    await this.publishFile(selected.filepath);
  }

  /** List markdown files in the output directory */
  private listMarkdownFiles(
    dir: string
  ): { name: string; date: string; path: string }[] {
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .map((f) => {
        const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
        return {
          name: f,
          date: dateMatch?.[1] || "",
          path: `${dir}/${f}`,
        };
      });
  }

  /** Extract title from markdown content */
  private extractTitle(content: string): string | undefined {
    // Skip frontmatter
    const stripped = this.stripFrontmatter(content);
    const match = stripped.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim();
  }

  /** Strip YAML frontmatter from content */
  private stripFrontmatter(content: string): string {
    const fmRegex = /^---\n[\s\S]*?\n---\n*/;
    return content.replace(fmRegex, "");
  }
}
