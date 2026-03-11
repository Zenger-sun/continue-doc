/**
 * Continue-Doc 自定义错误类
 * 提供结构化的错误处理机制
 */

/**
 * 基础错误类
 */
export class ContinueDocError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ContinueDocError';
    this.code = code;
  }
}

/**
 * Continue 未检测到错误
 */
export class ContinueNotFoundError extends ContinueDocError {
  constructor() {
    super(
      'Continue extension not found. Please install and enable Continue first.',
      'CONTINUE_NOT_FOUND'
    );
    this.name = 'ContinueNotFoundError';
  }
}

/**
 * Continue 会话未找到错误
 */
export class SessionNotFoundError extends ContinueDocError {
  constructor() {
    super(
      'No active Continue session found. Please start a conversation in Continue first.',
      'SESSION_NOT_FOUND'
    );
    this.name = 'SessionNotFoundError';
  }
}

/**
 * 配置文件错误
 */
export class ConfigError extends ContinueDocError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

/**
 * 文档生成错误
 */
export class DocGenerationError extends ContinueDocError {
  constructor(message: string) {
    super(message, 'DOC_GENERATION_ERROR');
    this.name = 'DocGenerationError';
  }
}

/**
 * AI 模型调用错误
 */
export class AIModelError extends ContinueDocError {
  constructor(message: string) {
    super(message, 'AI_MODEL_ERROR');
    this.name = 'AIModelError';
  }
}

/**
 * 发布错误
 */
export class PublishError extends ContinueDocError {
  constructor(message: string, public readonly platform: string) {
    super(message, 'PUBLISH_ERROR');
    this.name = 'PublishError';
  }
}

/**
 * 没有选中消息错误
 */
export class NoMessagesSelectedError extends ContinueDocError {
  constructor() {
    super(
      'No messages selected for document generation. Please select at least one message.',
      'NO_MESSAGES_SELECTED'
    );
    this.name = 'NoMessagesSelectedError';
  }
}
