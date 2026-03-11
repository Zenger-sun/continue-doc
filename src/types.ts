/**
 * Continue-Doc 共享类型定义
 * Shared type definitions for Continue-Doc
 */

/**
 * 消息中的图片信息
 * Image information within a message
 */
export interface MessageImage {
  /** 图片 URL 或 base64 data URI */
  url: string;
  /** 保存到本地后的相对路径 */
  localPath?: string;
}

/**
 * 文档消息接口
 * Represents a single message from a Continue chat conversation
 */
export interface DocMessage {
  /** 唯一标识符 / Unique identifier */
  id: string;
  /** 消息来源 / Message source */
  role: "user" | "assistant";
  /** 消息文本 / Message text */
  content: string;
  /** 消息中包含的图片 / Images included in the message */
  images?: MessageImage[];
  /** 是否纳入文档 / Whether to include in document */
  include: boolean;
  /** Unix 时间戳 / Unix timestamp */
  timestamp: number;
  /** 使用的 AI 模型 / AI model used */
  model?: string;
}

/**
 * 文档配置接口
 * Configuration for document generation
 */
export interface DocConfig {
  /** 文档生成规则 / Document generation rules */
  rules: string;
  /** 输出目录 / Output directory */
  output_dir: string;
  /** 自定义提示模板 / Custom prompt template */
  prompt_template?: string;
}

/**
 * 知乎发布配置
 * Zhihu publishing configuration
 */
export interface ZhihuConfig {
  cookie: string;
}

/**
 * Medium 发布配置
 * Medium publishing configuration
 */
export interface MediumConfig {
  api_token: string;
}

/**
 * Dev.to 发布配置
 * Dev.to publishing configuration
 */
export interface DevtoConfig {
  api_token: string;
}

/**
 * 发布配置接口
 * Configuration for publishing
 */
export interface PublishConfig {
  /** 默认发布平台 / Default publishing platform */
  target: string;
  /** 知乎配置 / Zhihu configuration */
  zhihu?: ZhihuConfig;
  /** Medium 配置 / Medium configuration */
  medium?: MediumConfig;
  /** Dev.to 配置 / Dev.to configuration */
  devto?: DevtoConfig;
}

/**
 * 完整配置接口
 * Complete configuration interface
 */
export interface ContinueDocConfig {
  doc: DocConfig;
  publish: PublishConfig;
  language?: string;
}

/**
 * 发布结果接口
 * Result of a publishing operation
 */
export interface PublishResult {
  success: boolean;
  url?: string;
  message: string;
  platform: string;
}

/**
 * 文档生成结果接口
 * Result of a document generation operation
 */
export interface GenerateResult {
  success: boolean;
  filePath?: string;
  message: string;
  title?: string;
}

/**
 * Webview 消息类型
 * Types of messages exchanged between extension and webview
 */
export type WebviewMessageType =
  | "getMessages"
  | "messagesUpdated"
  | "toggleMessage"
  | "toggleAll"
  | "generateDoc"
  | "publish"
  | "openConfig"
  | "ready"
  | "error"
  | "info";

/**
 * Webview 消息接口
 * Message exchanged between extension and webview
 */
export interface WebviewMessage {
  type: WebviewMessageType;
  payload?: any;
}

/**
 * 国际化文本接口
 * Internationalization text interface
 */
export interface I18nTexts {
  selectAll: string;
  deselectAll: string;
  generateDoc: string;
  publish: string;
  settings: string;
  user: string;
  assistant: string;
  messageCount: string;
  generating: string;
  publishing: string;
  success: string;
  error: string;
  noMessages: string;
  noSelectedMessages: string;
  continueNotFound: string;
  configOpenFailed: string;
  docGeneratedSuccess: string;
  publishSuccess: string;
  selectPlatform: string;
  clickRefreshToLoad?: string;
  refresh?: string;
}
