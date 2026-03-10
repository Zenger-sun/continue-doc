/**
 * 发布编排
 * Publishing orchestration - coordinates publishing to various platforms
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ConfigLoader } from "../config/configLoader";
import { ZhihuPublisher } from "./zhihuPublisher";
import { MediumPublisher } from "./mediumPublisher";
import { PublishResult } from "../types";
import { getTexts } from "../i18n";

export class Publisher {
  private outputChannel: vscode.OutputChannel;
  private configLoader: ConfigLoader;
  private zhihuPublisher: ZhihuPublisher;
  private mediumPublisher: MediumPublisher;

  constructor(
    outputChannel: vscode.OutputChannel,
    configLoader: ConfigLoader
  ) {
    this.outputChannel = outputChannel;
    this.configLoader = configLoader;

    const config = configLoader.getConfig();
    this.zhihuPublisher = new ZhihuPublisher(
      outputChannel,
      config.publish.zhihu || { cookie: "" }
    );
    this.mediumPublisher = new MediumPublisher(
      outputChannel,
      config.publish.medium || { api_token: "" }
    );
  }

  /**
   * 发布文章
   * Publish an article to the selected platform
   */
  async publish(filePath?: string): Promise<PublishResult> {
    const config = this.configLoader.getConfig();
    const texts = getTexts(config.language || "zh");

    // 更新发布器配置
    this.zhihuPublisher.updateConfig(config.publish.zhihu || { cookie: "" });
    this.mediumPublisher.updateConfig(
      config.publish.medium || { api_token: "" }
    );

    // 1. 选择要发布的文件
    const targetFile = filePath || (await this.selectDocument());
    if (!targetFile) {
      return {
        success: false,
        platform: "",
        message: "未选择文件",
      };
    }

    // 2. 读取文件内容
    const content = fs.readFileSync(targetFile, "utf-8");
    const title = this.extractTitle(content) || path.basename(targetFile, ".md");

    // 3. 选择发布平台
    const platform = await this.selectPlatform(config.publish.target);
    if (!platform) {
      return {
        success: false,
        platform: "",
        message: "未选择平台",
      };
    }

    // 4. 确认发布
    const confirmLabel = config.language === "en" ? "Confirm" : "确认";
    const confirmMsg = config.language === "en"
      ? `Publish "${title}" to ${platform}?`
      : `确认发布 "${title}" 到 ${platform}？`;
    const cancelledMsg = config.language === "en" ? "Publishing cancelled" : "用户取消发布";

    const confirm = await vscode.window.showInformationMessage(
      confirmMsg,
      { modal: true },
      confirmLabel
    );

    if (confirm !== confirmLabel) {
      return {
        success: false,
        platform,
        message: cancelledMsg,
      };
    }

    // 5. 执行发布
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: texts.publishing,
        cancellable: false,
      },
      async () => {
        let result: PublishResult;

        switch (platform) {
          case "zhihu":
            result = await this.zhihuPublisher.publish(title, content);
            break;
          case "medium":
            result = await this.mediumPublisher.publish(title, content);
            break;
          default:
            result = {
              success: false,
              platform,
              message: `不支持的平台: ${platform}`,
            };
        }

        if (result.success) {
          vscode.window.showInformationMessage(result.message);
          if (result.url) {
            const open = await vscode.window.showInformationMessage(
              `${texts.publishSuccess}${result.url}`,
              "打开链接"
            );
            if (open === "打开链接") {
              vscode.env.openExternal(vscode.Uri.parse(result.url));
            }
          }
        } else {
          vscode.window.showErrorMessage(result.message);
        }

        return result;
      }
    );
  }

  /**
   * 选择要发布的文档
   * Select a document to publish
   */
  private async selectDocument(): Promise<string | undefined> {
    const outputDir = this.configLoader.getOutputDir();

    if (!outputDir || !fs.existsSync(outputDir)) {
      vscode.window.showWarningMessage(
        "文档目录不存在。请先生成文档。"
      );
      return undefined;
    }

    // 列出所有 markdown 文件
    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    if (files.length === 0) {
      vscode.window.showWarningMessage(
        "没有可发布的文档。请先生成文档。"
      );
      return undefined;
    }

    // 显示活跃编辑器中的文件优先
    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (activeFile && activeFile.endsWith(".md") && activeFile.startsWith(outputDir)) {
      const useActive = await vscode.window.showQuickPick(
        ["当前文件: " + path.basename(activeFile), "选择其他文件..."],
        { placeHolder: "选择要发布的文档" }
      );

      if (useActive?.startsWith("当前文件")) {
        return activeFile;
      }
      if (!useActive) {
        return undefined;
      }
    }

    const items = files.map((f) => ({
      label: f,
      description: path.join(outputDir, f),
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "选择要发布的文档",
    });

    return selected ? path.join(outputDir, selected.label) : undefined;
  }

  /**
   * 选择发布平台
   * Select a publishing platform
   */
  private async selectPlatform(
    defaultTarget: string
  ): Promise<string | undefined> {
    const platforms = [
      { label: "知乎 (Zhihu)", description: "中文知识分享平台", value: "zhihu" },
      {
        label: "Medium",
        description: "International blogging platform",
        value: "medium",
      },
    ];

    // 将默认平台排在前面
    platforms.sort((a, b) => {
      if (a.value === defaultTarget) { return -1; }
      if (b.value === defaultTarget) { return 1; }
      return 0;
    });

    const selected = await vscode.window.showQuickPick(
      platforms.map((p) => ({
        label: p.label,
        description: p.description,
        platform: p.value,
      })),
      { placeHolder: "选择发布平台" }
    );

    return (selected as any)?.platform;
  }

  /**
   * 从 Markdown 内容提取标题
   * Extract title from Markdown content
   */
  private extractTitle(content: string): string | undefined {
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim();
  }
}
