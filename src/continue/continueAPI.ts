import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from '../utils/logger';
import { AIModelError } from '../utils/errors';

/**
 * Continue 配置文件中的模型信息
 */
interface ContinueModelConfig {
  title?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  apiBase?: string;
  [key: string]: unknown;
}

interface ContinueConfig {
  models?: ContinueModelConfig[];
  [key: string]: unknown;
}

/**
 * Continue AI 模型 API
 *
 * 核心设计原则（来自 mind.md）：
 * - 不直接调用 OpenAI API
 * - 复用 Continue 当前配置的模型
 * - 兼容 OpenAI / Gemini / OpenRouter / Ollama 等
 *
 * 实现方式：
 * 1. 优先通过 Continue 命令调用（如果 Continue 暴露了相关命令）
 * 2. 备选：读取 Continue 配置文件，直接调用对应 API
 */
export class ContinueAPI {
  private continueConfig: ContinueConfig | null = null;

  constructor() {}

  /**
   * 初始化：加载 Continue 配置
   */
  async initialize(): Promise<void> {
    this.continueConfig = await this.loadContinueConfig();
    if (this.continueConfig) {
      const modelCount = this.continueConfig.models?.length ?? 0;
      logger.info(`ContinueAPI: Loaded config with ${modelCount} model(s)`);
    }
  }

  /**
   * 调用 AI 模型生成文档
   *
   * @param prompt 完整的提示文本
   * @returns AI 生成的文本
   */
  async complete(prompt: string): Promise<string> {
    // 方式 1：尝试通过 Continue 命令调用
    try {
      const result = await this.completeViaCommand(prompt);
      if (result) {
        return result;
      }
    } catch (err) {
      logger.debug('ContinueAPI: Command method failed, trying direct API', err);
    }

    // 方式 2：直接调用 API
    try {
      const result = await this.completeViaDirectAPI(prompt);
      if (result) {
        return result;
      }
    } catch (err) {
      logger.error('ContinueAPI: Direct API call failed', err);
    }

    throw new AIModelError(
      'Failed to call AI model. Please ensure Continue is properly configured with a working model.'
    );
  }

  /**
   * 方式 1：通过 Continue 命令调用模型
   */
  private async completeViaCommand(prompt: string): Promise<string | null> {
    try {
      // 尝试 Continue 可能暴露的命令
      const result = await vscode.commands.executeCommand<string>(
        'continue.sendMainUserInput',
        prompt
      );
      // 如果返回了结果
      if (typeof result === 'string' && result.length > 0) {
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 方式 2：读取 Continue 配置，直接调用 API
   */
  private async completeViaDirectAPI(prompt: string): Promise<string | null> {
    const config = this.continueConfig;
    if (!config?.models || config.models.length === 0) {
      throw new AIModelError('No models found in Continue configuration');
    }

    // 使用第一个配置的模型
    const modelConfig = config.models[0];
    const provider = (modelConfig.provider || '').toLowerCase();

    logger.info(`ContinueAPI: Using model "${modelConfig.title || modelConfig.model}" (provider: ${provider})`);

    // 根据 provider 选择调用方式
    switch (provider) {
      case 'openai':
      case 'free-trial':
      case 'openrouter':
        return this.callOpenAICompatible(modelConfig, prompt);
      case 'ollama':
        return this.callOllama(modelConfig, prompt);
      case 'gemini':
      case 'google':
        return this.callGemini(modelConfig, prompt);
      default:
        // 默认尝试 OpenAI 兼容格式
        return this.callOpenAICompatible(modelConfig, prompt);
    }
  }

  /**
   * 调用 OpenAI 兼容 API（OpenAI、OpenRouter 等）
   */
  private async callOpenAICompatible(config: ContinueModelConfig, prompt: string): Promise<string> {
    const apiBase = (config.apiBase || 'https://api.openai.com/v1').replace(/\/$/, '');
    const apiKey = config.apiKey || '';
    const model = config.model || 'gpt-4';

    const url = `${apiBase}/chat/completions`;
    logger.debug(`ContinueAPI: Calling OpenAI-compatible API at ${apiBase}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIModelError(`API call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIModelError('AI model returned empty response');
    }

    return content;
  }

  /**
   * 调用 Ollama API
   */
  private async callOllama(config: ContinueModelConfig, prompt: string): Promise<string> {
    const apiBase = (config.apiBase || 'http://localhost:11434').replace(/\/$/, '');
    const model = config.model || 'llama3';

    const url = `${apiBase}/api/chat`;
    logger.debug(`ContinueAPI: Calling Ollama at ${apiBase}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIModelError(`Ollama call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
      message?: { content?: string };
    };

    const content = data.message?.content;
    if (!content) {
      throw new AIModelError('Ollama returned empty response');
    }

    return content;
  }

  /**
   * 调用 Google Gemini API
   */
  private async callGemini(config: ContinueModelConfig, prompt: string): Promise<string> {
    const apiKey = config.apiKey || '';
    const model = config.model || 'gemini-pro';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    logger.debug('ContinueAPI: Calling Gemini API');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIModelError(`Gemini call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new AIModelError('Gemini returned empty response');
    }

    return content;
  }

  /**
   * 加载 Continue 配置文件
   * Continue 配置位于 ~/.continue/config.json
   */
  private async loadContinueConfig(): Promise<ContinueConfig | null> {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (!homeDir) {
        logger.warn('ContinueAPI: Cannot determine home directory');
        return null;
      }

      const configPath = path.join(homeDir, '.continue', 'config.json');
      const uri = vscode.Uri.file(configPath);

      try {
        const data = await vscode.workspace.fs.readFile(uri);
        const config = JSON.parse(Buffer.from(data).toString('utf-8')) as ContinueConfig;
        return config;
      } catch {
        logger.debug('ContinueAPI: config.json not found, trying config.yaml');
      }

      // 也尝试读取 config.yaml（较新版本的 Continue）
      const yamlConfigPath = path.join(homeDir, '.continue', 'config.yaml');
      try {
        const data = await vscode.workspace.fs.readFile(vscode.Uri.file(yamlConfigPath));
        const YAML = await import('yaml');
        const config = YAML.parse(Buffer.from(data).toString('utf-8')) as ContinueConfig;
        return config;
      } catch {
        logger.debug('ContinueAPI: config.yaml not found either');
      }

      return null;
    } catch (err) {
      logger.error('ContinueAPI: Failed to load Continue config', err);
      return null;
    }
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): Array<{ title: string; provider: string; model: string }> {
    if (!this.continueConfig?.models) {
      return [];
    }

    return this.continueConfig.models.map(m => ({
      title: m.title || m.model || 'Unknown',
      provider: m.provider || 'unknown',
      model: m.model || 'unknown',
    }));
  }
}
