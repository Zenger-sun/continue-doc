import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from '../utils/logger';
import { ConfigError } from '../utils/errors';

/**
 * 文档配置
 */
export interface DocConfig {
  rules: string;
  output_dir: string;
  prompt_template?: string;
}

/**
 * 发布平台配置
 */
export interface PublishConfig {
  target: string;
  zhihu?: {
    cookie: string;
    tags?: string[];
  };
  medium?: {
    api_token: string;
    publication?: string;
  };
  devto?: {
    api_token: string;
  };
}

/**
 * 完整配置
 */
export interface AppConfig {
  doc: DocConfig;
  publish: PublishConfig;
  language: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppConfig = {
  doc: {
    rules: [
      '使用简洁清晰的语言',
      '删除重复或离题的讨论',
      '保留关键代码片段和技术细节',
      '使用标准 Markdown 格式',
      '添加问题、解决方案、示例等结构化标题',
    ].join('\n'),
    output_dir: '.continue-doc',
    prompt_template: undefined,
  },
  publish: {
    target: 'zhihu',
    zhihu: {
      cookie: '',
      tags: ['技术', 'AI', '开发'],
    },
    medium: {
      api_token: '',
    },
    devto: {
      api_token: '',
    },
  },
  language: 'zh',
};

/**
 * YAML 配置加载器
 * 管理 .continue-doc/config.yaml 配置文件
 */
export class ConfigLoader {
  private config: AppConfig = { ...DEFAULT_CONFIG };
  private configFilePath: string;

  constructor(private workspaceRoot: string) {
    this.configFilePath = path.join(workspaceRoot, '.continue-doc', 'config.yaml');
  }

  /**
   * 加载配置文件
   * 如果不存在则使用默认配置
   */
  async load(): Promise<AppConfig> {
    try {
      const uri = vscode.Uri.file(this.configFilePath);
      const data = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(data).toString('utf-8');

      const YAML = await import('yaml');
      const parsed = YAML.parse(content);

      if (parsed && typeof parsed === 'object') {
        this.config = this.mergeConfig(DEFAULT_CONFIG, parsed);
        logger.info('Configuration loaded from config.yaml');
      }
    } catch (err) {
      // 检查是不是文件不存在
      if (err instanceof vscode.FileSystemError || (err as { code?: string }).code === 'FileNotFound') {
        logger.info('No config.yaml found, using defaults');
      } else {
        logger.warn('Failed to parse config.yaml, using defaults', err);
      }
      this.config = { ...DEFAULT_CONFIG };
    }

    return this.config;
  }

  /**
   * 获取当前配置
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * 获取文档配置
   */
  getDocConfig(): DocConfig {
    return this.config.doc;
  }

  /**
   * 获取发布配置
   */
  getPublishConfig(): PublishConfig {
    return this.config.publish;
  }

  /**
   * 获取语言设置
   */
  getLanguage(): string {
    return this.config.language || 'zh';
  }

  /**
   * 创建默认配置文件
   */
  async createDefaultConfig(): Promise<void> {
    try {
      // 确保目录存在
      const dirUri = vscode.Uri.file(path.dirname(this.configFilePath));
      try {
        await vscode.workspace.fs.stat(dirUri);
      } catch {
        await vscode.workspace.fs.createDirectory(dirUri);
      }

      // 读取默认配置模板
      const language = this.config.language || 'zh';
      let defaultContent: string;

      try {
        // 尝试读取打包的默认配置文件
        const extPath = vscode.extensions.getExtension('zenger-sun.continue-doc')?.extensionPath;
        if (extPath) {
          const templateFile = language === 'zh'
            ? 'default-config.yaml'
            : 'default-config.en.yaml';
          const templatePath = path.join(extPath, 'resources', templateFile);
          const data = await vscode.workspace.fs.readFile(vscode.Uri.file(templatePath));
          defaultContent = Buffer.from(data).toString('utf-8');
        } else {
          defaultContent = this.getDefaultConfigContent(language);
        }
      } catch {
        defaultContent = this.getDefaultConfigContent(language);
      }

      const uri = vscode.Uri.file(this.configFilePath);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(defaultContent, 'utf-8'));

      logger.info(`Default config created at ${this.configFilePath}`);
    } catch (err) {
      throw new ConfigError(`Failed to create default config: ${err}`);
    }
  }

  /**
   * 打开配置文件进行编辑
   */
  async openConfigFile(): Promise<void> {
    try {
      const uri = vscode.Uri.file(this.configFilePath);

      // 检查文件是否存在
      try {
        await vscode.workspace.fs.stat(uri);
      } catch {
        // 不存在则创建
        await this.createDefaultConfig();
      }

      // 打开文件
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (err) {
      logger.error('Failed to open config file', err);
      vscode.window.showErrorMessage(`Failed to open config: ${err}`);
    }
  }

  /**
   * 获取配置文件路径
   */
  getConfigFilePath(): string {
    return this.configFilePath;
  }

  /**
   * 深度合并配置对象
   */
  private mergeConfig(defaults: AppConfig, overrides: Partial<AppConfig>): AppConfig {
    const result = { ...defaults };

    if (overrides.doc) {
      result.doc = {
        ...defaults.doc,
        ...overrides.doc,
      };
    }

    if (overrides.publish) {
      result.publish = {
        ...defaults.publish,
        ...overrides.publish,
      };

      if (overrides.publish.zhihu) {
        result.publish.zhihu = {
          ...defaults.publish.zhihu,
          ...overrides.publish.zhihu,
        };
      }
      if (overrides.publish.medium) {
        result.publish.medium = {
          ...defaults.publish.medium,
          ...overrides.publish.medium,
        };
      }
      if (overrides.publish.devto) {
        result.publish.devto = {
          ...defaults.publish.devto,
          ...overrides.publish.devto,
        };
      }
    }

    if (overrides.language) {
      result.language = overrides.language;
    }

    return result;
  }

  /**
   * 生成默认配置内容
   */
  private getDefaultConfigContent(language: string): string {
    if (language === 'zh') {
      return `# Continue-Doc 默认配置

doc:
  # 文档生成规则
  rules: |
    使用简洁清晰的语言
    删除重复或离题的讨论
    保留关键代码片段和技术细节
    使用标准 Markdown 格式
    添加问题、解决方案、示例等结构化标题

  # 生成文档的输出目录
  output_dir: ".continue-doc"

  # 可选：自定义文档生成的提示词模板
  # prompt_template: |
  #   根据以下 AI 对话内容，生成一篇专业的技术文档。
  #   重点关注实用的见解和可操作的信息。

publish:
  # 默认发布平台
  target: zhihu

  # 知乎配置
  zhihu:
    cookie: ""
    tags:
      - "技术"
      - "AI"
      - "开发"

  # Medium 配置（待实现）
  medium:
    api_token: ""

  # Dev.to 配置（待实现）
  devto:
    api_token: ""

# 语言配置
language: zh
`;
    }

    return `# Continue-Doc Default Configuration

doc:
  # Document generation rules
  rules: |
    Use concise and clear language
    Remove redundant or off-topic discussions
    Preserve key code snippets and technical details
    Use standard Markdown formatting
    Add structured headings: Problem, Solution, Examples, Key Points

  # Output directory for generated documents
  output_dir: ".continue-doc"

  # Optional: Custom AI prompt template
  # prompt_template: |
  #   Based on the following AI conversation, generate professional
  #   technical documentation. Focus on practical insights.

publish:
  # Default publishing platform
  target: medium

  # Zhihu configuration
  zhihu:
    cookie: ""
    tags:
      - "Tech"
      - "AI"
      - "Development"

  # Medium configuration (coming soon)
  medium:
    api_token: ""

  # Dev.to configuration (coming soon)
  devto:
    api_token: ""

# Language configuration
language: en
`;
  }
}
