/**
 * Continue-Doc 国际化模块
 * Internationalization module for Continue-Doc
 */

import { I18nTexts } from "./types";

const zhTexts: I18nTexts = {
  selectAll: "全选",
  deselectAll: "全不选",
  generateDoc: "📝 生成文档",
  publish: "🚀 发布",
  settings: "⚙️ 配置",
  user: "用户",
  assistant: "AI",
  messageCount: "条消息",
  generating: "正在生成文档...",
  publishing: "正在发布...",
  success: "成功",
  error: "错误",
  noMessages: "暂无消息",
  noSelectedMessages: "请至少选择一条消息",
  continueNotFound: "未检测到 Continue 插件，请先安装并启用 Continue。",
  configOpenFailed: "无法打开配置文件",
  docGeneratedSuccess: "文档已生成：",
  publishSuccess: "文章已发布：",
  selectPlatform: "选择发布平台",
  clickRefreshToLoad: "点击下方刷新按钮加载消息",
  refresh: "刷新",
};

const enTexts: I18nTexts = {
  selectAll: "Select All",
  deselectAll: "Deselect All",
  generateDoc: "📝 Generate Doc",
  publish: "🚀 Publish",
  settings: "⚙️ Settings",
  user: "User",
  assistant: "AI",
  messageCount: "messages",
  generating: "Generating document...",
  publishing: "Publishing...",
  success: "Success",
  error: "Error",
  noMessages: "No messages yet",
  noSelectedMessages: "Please select at least one message",
  continueNotFound:
    "Continue extension not detected. Please install and enable Continue first.",
  configOpenFailed: "Failed to open configuration file",
  docGeneratedSuccess: "Document generated: ",
  publishSuccess: "Article published: ",
  selectPlatform: "Select publishing platform",
  clickRefreshToLoad: "Click the Refresh button below to load messages",
  refresh: "Refresh",
};

/**
 * 获取指定语言的文本
 * Get texts for specified language
 */
export function getTexts(language: string): I18nTexts {
  return language === "en" ? enTexts : zhTexts;
}
