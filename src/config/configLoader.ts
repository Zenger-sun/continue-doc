/**
 * YAML Configuration Loader
 * Manages .aiDocExtra/config.yaml in the workspace root
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { AiDocConfig } from "../types";

const CONFIG_DIR = ".aiDocExtra";
const CONFIG_FILE = "config.yaml";

const DEFAULT_CONFIG: AiDocConfig = {
  doc: {
    rules: [
      "Use concise language",
      "Remove off-topic discussions",
      "Preserve key code snippets",
      "Use proper Markdown formatting",
    ].join("\n"),
    output_dir: ".ai-dev-docs",
    prompt_template: [
      "Generate a professional technical document from the following AI conversation.",
      "Focus on practical insights and actionable information.",
    ].join("\n"),
  },
  publish: {
    target: "zhihu",
    zhihu: {
      cookie: "",
    },
    medium: {
      api_token: "",
    },
    devto: {
      api_token: "",
    },
  },
};

export class ConfigLoader {
  private config: AiDocConfig;
  private configPath: string | undefined;
  private watcher: vscode.FileSystemWatcher | undefined;
  private _onConfigChanged = new vscode.EventEmitter<AiDocConfig>();
  public readonly onConfigChanged = this._onConfigChanged.event;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /** Initialize config: load from file or create default */
  async initialize(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const configDir = path.join(workspaceRoot, CONFIG_DIR);
    this.configPath = path.join(configDir, CONFIG_FILE);

    if (fs.existsSync(this.configPath)) {
      await this.loadConfig();
    } else {
      await this.createDefaultConfig(configDir);
    }

    // Watch for config changes
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(configDir),
        CONFIG_FILE
      )
    );
    this.watcher.onDidChange(() => this.loadConfig());
    this.watcher.onDidCreate(() => this.loadConfig());
  }

  /** Load config from YAML file */
  private async loadConfig(): Promise<void> {
    if (!this.configPath || !fs.existsSync(this.configPath)) {
      return;
    }
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      const parsed = parseYaml(raw) as Partial<AiDocConfig>;
      this.config = this.mergeConfig(DEFAULT_CONFIG, parsed);
      this._onConfigChanged.fire(this.config);
    } catch (err) {
      vscode.window.showErrorMessage(
        `aiDocExtra: Failed to parse config.yaml: ${err}`
      );
    }
  }

  /** Create default config file */
  private async createDefaultConfig(configDir: string): Promise<void> {
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      const yamlStr = stringifyYaml(DEFAULT_CONFIG);
      fs.writeFileSync(path.join(configDir, CONFIG_FILE), yamlStr, "utf-8");
      this.config = { ...DEFAULT_CONFIG };
    } catch (err) {
      vscode.window.showWarningMessage(
        `aiDocExtra: Could not create default config: ${err}`
      );
    }
  }

  /** Deep-merge user config over defaults */
  private mergeConfig(
    defaults: AiDocConfig,
    overrides: Partial<AiDocConfig>
  ): AiDocConfig {
    return {
      doc: {
        ...defaults.doc,
        ...(overrides.doc || {}),
      },
      publish: {
        ...defaults.publish,
        ...(overrides.publish || {}),
        zhihu: {
          cookie: overrides.publish?.zhihu?.cookie ?? defaults.publish.zhihu?.cookie ?? "",
        },
        medium: {
          api_token: overrides.publish?.medium?.api_token ?? defaults.publish.medium?.api_token ?? "",
        },
        devto: {
          api_token: overrides.publish?.devto?.api_token ?? defaults.publish.devto?.api_token ?? "",
        },
      },
    };
  }

  /** Get current config */
  getConfig(): AiDocConfig {
    return this.config;
  }

  /** Get the workspace root path */
  getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /** Get the output directory (absolute path) */
  getOutputDir(): string {
    const root = this.getWorkspaceRoot();
    if (!root) {
      return this.config.doc.output_dir;
    }
    return path.join(root, this.config.doc.output_dir);
  }

  /** Open config file in editor */
  async openConfigFile(): Promise<void> {
    if (this.configPath && fs.existsSync(this.configPath)) {
      const doc = await vscode.workspace.openTextDocument(this.configPath);
      await vscode.window.showTextDocument(doc);
    } else {
      vscode.window.showWarningMessage(
        "aiDocExtra: No config file found. Open a workspace first."
      );
    }
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onConfigChanged.dispose();
  }
}
