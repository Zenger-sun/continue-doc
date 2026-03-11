/**
 * Continue-Doc YAML 配置管理
 * YAML configuration management for Continue-Doc
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { ContinueDocConfig, DocConfig, PublishConfig } from "../types";

/** 默认文档配置 */
const DEFAULT_DOC_CONFIG: DocConfig = {
  rules: [
    "使用简洁的语言",
    "去除离题的讨论内容",
    "保留关键代码片段",
    "使用规范的 Markdown 格式",
  ].join("\n"),
  output_dir: ".continue-doc",
  prompt_template: [
    "根据以下 AI 对话内容，生成一篇专业的技术文档。",
    "重点关注实用的见解和可操作的信息。",
  ].join("\n"),
};

/** 默认发布配置 */
const DEFAULT_PUBLISH_CONFIG: PublishConfig = {
  target: "zhihu",
  zhihu: { cookie: "" },
  medium: { api_token: "" },
  devto: { api_token: "" },
};

/** 默认完整配置 */
const DEFAULT_CONFIG: ContinueDocConfig = {
  doc: DEFAULT_DOC_CONFIG,
  publish: DEFAULT_PUBLISH_CONFIG,
  language: "zh",
};

export class ConfigLoader {
  private config: ContinueDocConfig = { ...DEFAULT_CONFIG };
  private configPath: string = "";
  private outputChannel: vscode.OutputChannel;
  private extensionUri: vscode.Uri | undefined;

  constructor(outputChannel: vscode.OutputChannel, extensionUri?: vscode.Uri) {
    this.outputChannel = outputChannel;
    this.extensionUri = extensionUri;
  }

  /**
   * 获取配置文件路径
   * Get the configuration file path
   */
  private getConfigPath(): string {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return "";
    }
    return path.join(workspaceRoot, ".continue-doc", "config.yaml");
  }

  /**
   * 获取工作区根目录
   * Get the workspace root directory
   */
  getWorkspaceRoot(): string {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return "";
    }
    return folders[0].uri.fsPath;
  }

  /**
   * 加载配置文件
   * Load configuration file
   */
  async loadConfig(): Promise<ContinueDocConfig> {
    this.configPath = this.getConfigPath();

    if (!this.configPath) {
      this.outputChannel.appendLine(
        "[ConfigLoader] No workspace folder found, using defaults."
      );
      return this.config;
    }

    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, "utf-8");
        const parsed = YAML.parse(content) as Partial<ContinueDocConfig>;

        // 深合并配置，使用解析的值覆盖默认值
        this.config = {
          doc: { ...DEFAULT_DOC_CONFIG, ...parsed.doc },
          publish: {
            ...DEFAULT_PUBLISH_CONFIG,
            ...parsed.publish,
            zhihu: { ...DEFAULT_PUBLISH_CONFIG.zhihu!, ...parsed.publish?.zhihu },
            medium: { ...DEFAULT_PUBLISH_CONFIG.medium!, ...parsed.publish?.medium },
            devto: { ...DEFAULT_PUBLISH_CONFIG.devto!, ...parsed.publish?.devto },
          },
          language: parsed.language ?? DEFAULT_CONFIG.language,
        };

        this.outputChannel.appendLine(
          `[ConfigLoader] Config loaded from: ${this.configPath}`
        );
      } else {
        // 创建默认配置文件
        await this.createDefaultConfig();
        this.outputChannel.appendLine(
          `[ConfigLoader] Default config created at: ${this.configPath}`
        );
      }
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[ConfigLoader] Error loading config: ${error.message}`
      );
      vscode.window.showWarningMessage(
        `Continue-Doc: Failed to load config, using defaults. ${error.message}`
      );
    }

    // 同时读取 VSCode 设置中的语言配置
    const vscodeConfig = vscode.workspace.getConfiguration("continue-doc");
    const vscodeLanguage = vscodeConfig.get<string>("language");
    if (vscodeLanguage) {
      this.config.language = vscodeLanguage;
    }

    return this.config;
  }

  /**
   * 创建默认配置文件
   * Create default configuration file
   */
  private async createDefaultConfig(): Promise<void> {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 根据语言设置选择模板
    const language =
      vscode.workspace.getConfiguration("continue-doc").get<string>("language") ?? "zh";
    const templateName =
      language === "en" ? "default-config.en.yaml" : "default-config.yaml";

    // 尝试从 resources 复制模板
    const extensionPath = this.getExtensionPath();
    if (extensionPath) {
      const templatePath = path.join(extensionPath, "resources", templateName);
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, this.configPath);
        return;
      }
    }

    // 如果模板不可用，直接写入默认配置
    const yamlContent = YAML.stringify(DEFAULT_CONFIG);
    fs.writeFileSync(this.configPath, yamlContent, "utf-8");
  }

  /**
   * 获取扩展安装路径
   * Get the extension installation path
   */
  private getExtensionPath(): string {
    // 优先使用传入的 extensionUri（开发模式和生产模式都能用）
    if (this.extensionUri) {
      return this.extensionUri.fsPath;
    }
    // 回退：通过扩展 ID 查找
    const ext = vscode.extensions.getExtension("zenger-sun.continue-doc");
    return ext?.extensionPath ?? "";
  }

  /**
   * 获取当前配置
   * Get current configuration
   */
  getConfig(): ContinueDocConfig {
    return this.config;
  }

  /**
   * 获取文档输出目录（绝对路径）
   * Get document output directory (absolute path)
   */
  getOutputDir(): string {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return "";
    }
    return path.join(workspaceRoot, this.config.doc.output_dir);
  }

  /**
   * 获取配置文件的 URI
   * Get URI of the config file
   */
  getConfigUri(): vscode.Uri | null {
    const configPath = this.getConfigPath();
    if (!configPath || !fs.existsSync(configPath)) {
      return null;
    }
    return vscode.Uri.file(configPath);
  }

  /**
   * 确保输出目录存在
   * Ensure the output directory exists
   */
  ensureOutputDir(): string {
    const outputDir = this.getOutputDir();
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    return outputDir;
  }

  /**
   * 获取语言设置
   * Get language setting
   */
  getLanguage(): string {
    return this.config.language ?? "zh";
  }
}
