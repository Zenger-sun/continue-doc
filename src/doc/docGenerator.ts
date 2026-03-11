import * as vscode from 'vscode';
import { MessageStore } from '../chat/messageStore';
import { ContinueAPI } from '../continue/continueAPI';
import { PromptBuilder } from './promptBuilder';
import { MarkdownWriter } from './markdownWriter';
import { ConfigLoader } from '../config/configLoader';
import { logger } from '../utils/logger';
import { NoMessagesSelectedError, DocGenerationError } from '../utils/errors';

/**
 * 文档生成编排器
 *
 * 来自 mind.md 的流程：
 * 1. 获取 conversation
 * 2. 过滤 addToDoc === true 的消息
 * 3. 构造 prompt
 * 4. 调用 Continue 模型
 * 5. 生成 Markdown
 */
export class DocGenerator {
  private promptBuilder: PromptBuilder;
  private markdownWriter: MarkdownWriter;

  constructor(
    private readonly messageStore: MessageStore,
    private readonly continueAPI: ContinueAPI,
    private readonly configLoader: ConfigLoader,
    workspaceRoot: string
  ) {
    this.promptBuilder = new PromptBuilder(configLoader.getDocConfig());
    this.markdownWriter = new MarkdownWriter(workspaceRoot);
  }

  /**
   * 执行文档生成
   *
   * @returns 生成的文件路径
   */
  async generate(): Promise<string> {
    const config = this.configLoader.getDocConfig();
    const language = this.configLoader.getLanguage();

    // 更新 prompt builder 配置
    this.promptBuilder.updateConfig(config);

    // 步骤 1：获取已选消息
    const selectedMessages = this.messageStore.getSelectedMessages();
    if (selectedMessages.length === 0) {
      throw new NoMessagesSelectedError();
    }

    logger.info(`DocGenerator: Starting with ${selectedMessages.length} selected messages`);

    // 步骤 2：构造 AI 提示
    const prompt = this.promptBuilder.buildDocumentPrompt(selectedMessages, language);
    logger.debug('DocGenerator: Prompt constructed', { length: prompt.length });

    // 步骤 3：显示进度条（支持取消）
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: language === 'zh' ? '正在生成文档...' : 'Generating document...',
        cancellable: true,
      },
      async (progress, token) => {
        // 将 CancellationToken 转换为 AbortController，以便取消 fetch 请求
        const abortController = new AbortController();
        const cancellationListener = token.onCancellationRequested(() => {
          abortController.abort();
        });

        try {
          // 步骤 4：调用 AI 模型
          progress.report({
            increment: 30,
            message: language === 'zh' ? 'AI 正在整理内容...' : 'AI is organizing content...',
          });

          if (token.isCancellationRequested) {
            throw new DocGenerationError(language === 'zh' ? '用户已取消生成' : 'Generation cancelled by user');
          }

          const aiResponse = await this.continueAPI.complete(prompt, abortController.signal);

          if (!aiResponse || aiResponse.trim().length === 0) {
            throw new DocGenerationError('AI returned empty response');
          }

          logger.info(`DocGenerator: AI response received, length: ${aiResponse.length}`);

          // 步骤 5：清理 AI 响应
          progress.report({
            increment: 30,
            message: language === 'zh' ? '正在生成 Markdown...' : 'Generating Markdown...',
          });

          const cleanedContent = this.cleanAIResponse(aiResponse);

          // 步骤 6：保存文件
          progress.report({
            increment: 30,
            message: language === 'zh' ? '正在保存文件...' : 'Saving file...',
          });

          const filePath = await this.markdownWriter.save(cleanedContent, config.output_dir);

          // 步骤 7：在编辑器中打开
          await this.markdownWriter.openInEditor(filePath);

          progress.report({ increment: 10 });

          // 显示成功消息
          const msg = language === 'zh'
            ? `文档已生成：${filePath}`
            : `Document generated: ${filePath}`;
          vscode.window.showInformationMessage(msg);

          logger.info(`DocGenerator: Document saved to ${filePath}`);
          return filePath;

        } catch (err) {
          // 处理用户取消的情况
          if (token.isCancellationRequested || (err instanceof Error && err.name === 'AbortError')) {
            const cancelMsg = language === 'zh' ? '文档生成已取消' : 'Document generation cancelled';
            logger.info(`DocGenerator: ${cancelMsg}`);
            vscode.window.showInformationMessage(cancelMsg);
            throw new DocGenerationError(cancelMsg);
          }

          logger.error('DocGenerator: Generation failed', err);

          if (err instanceof NoMessagesSelectedError || err instanceof DocGenerationError) {
            throw err;
          }

          throw new DocGenerationError(
            `Document generation failed: ${err instanceof Error ? err.message : String(err)}`
          );
        } finally {
          cancellationListener.dispose();
        }
      }
    );
  }

  /**
   * 清理 AI 响应
   * 移除可能的 Markdown 代码块包裹、多余的空行等
   */
  private cleanAIResponse(response: string): string {
    let cleaned = response.trim();

    // 移除最外层的 ```markdown ``` 包裹
    if (cleaned.startsWith('```markdown')) {
      cleaned = cleaned.replace(/^```markdown\s*\n/, '').replace(/\n```\s*$/, '');
    } else if (cleaned.startsWith('```md')) {
      cleaned = cleaned.replace(/^```md\s*\n/, '').replace(/\n```\s*$/, '');
    } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
    }

    // 清理连续空行（保留最多2个）
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

    return cleaned.trim() + '\n';
  }
}
