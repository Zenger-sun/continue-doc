# Continue-Doc - Continue 的文档生成和发布工具

> 为您的 Continue 插件增强文档生成和发布功能。

## 📚 LANGUAGE SELECT / 语言选择

**简体中文** | [English / 英文](README.en.md)

**⚠️ 本项目是 Continue 的扩展插件，只读取记录，不会对原插件进行修改，与 Continue 官方无关联。**

[![VSCode](https://img.shields.io/badge/Made%20for-VSCode-blue)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)
![Status](https://img.shields.io/badge/Status-开发中-yellow)

## 概述

`Continue-Doc` 是一个 VSCode 扩展，通过增加强大的文档生成和发布功能来增强 [Continue](https://continue.dev) 插件。它在您的 AI 对话和精美的技术文档之间架起了一座桥梁。

### 主要功能

- **💬 消息选择** - 选择性地标记聊天消息以纳入文档
- **📝 一键生成文档** - 从选定的对话中生成专业的 Markdown 文档
- **🚀 一键发布** - 直接发布到知乎、Medium 等平台
- **⚙️ YAML 配置** - 灵活的配置系统，用于生成规则和发布目标
- **🤖 AI 驱动** - 利用 Continue AI 模型来优化和结构化文档
- **🔌 非侵入式** - 无需修改 Continue 源代码，通过 VSCode API 和 Webview 注入工作

## 安装

### 系统要求

- **VSCode** 1.90+
- **Continue 插件**已安装并配置

### 安装步骤

1. 从 VSCode 市场安装 Continue 插件（如果尚未安装）
2. 从 VSCode 市场安装 `Continue-Doc`
3. 出现提示时重新加载 VSCode
4. 插件将自动检测您的 Continue 安装

## 使用方法

### 基本工作流程

```
1. 在 Continue 中进行对话
2. 在消息栏中勾选要包含的消息（默认全选）
3. 点击操作栏 → "生成文档"
4. 查看生成的 Markdown 文档（位于 `.continue-doc/`）
5. 如需要可点击 "发布" 一键发布
```

### UI 组件

#### 消息列表和选择

Continue 聊天中实时读取和显示当前对话的所有消息：

```
消息列表（实时显示）：
☑ [全选]                          消息统计
─────────────────────────────────────────────────
☑ 用户 │ 如何处理错误？
☑ AI  │ 可以使用 try-catch 来...
☐ 用户 │ 能举个例子吗？
☑ AI  │ 当然，这是一个示例...
☑ 用户 │ 非常感谢
... (更多消息)
```

**消息栏特性：**
- 🏷️ 每条消息前都有**标签**标识来源（用户/AI）
- ☑️ 每条消息前有**复选框**，支持单条勾选/取消
- 📋 顶部有**全选按钮**：
  - 亮起 = 全部消息已选
  - 灰色 = 存在未选消息  
  - 点击切换全选/全不选
- 📝 默认状态为**全选**
- 📏 每条消息仅占一行，内容过长自动省略

#### 操作栏

位于 Continue 输入区域旁边，提供主要操作功能：

```
[ 提问 ]   ▼
        ┌──────────────────┐
        │ 📝 生成文档      │
        │ 🚀 发布          │
        │ ⚙️  配置          │
        └──────────────────┘
```

**按钮功能：**
- **📝 生成文档** - 从消息栏勾选的消息生成专业 Markdown 文档，保存到 `.continue-doc/` 目录
- **🚀 发布** - 将生成的文档发布到知乎、Medium 等平台
- **⚙️  配置** - 打开配置文件编辑文档生成规则和发布平台设置

### 生成文档

1. 在消息栏中选择要包含的消息（默认全选，点击全选按钮可切换）
2. 点击操作栏中的 **📝 生成文档** 按钮
3. 插件将：
   - 收集消息栏中所有已勾选的消息
   - 将结构化提示发送到 Continue AI 模型
   - 生成精美的 Markdown 文档
   - 保存到 `.continue-doc/{timestamp}.md`
4. 文档生成完毕后，可在资源管理器中查看或继续发布

### 发布文章

1. 生成文档（或从 `.continue-doc/` 选择现有 Markdown）
2. 点击操作栏中的 **🚀 发布** 按钮
3. 选择目标平台（知乎、Medium 等）
4. 审查内容并确认发布

---

## 配置

配置通过工作区根目录的 `.continue-doc/config.yaml` 进行管理。

### 配置示例

```yaml
doc:
  # 文档生成规则
  rules: |
    使用简洁的语言
    删除离题讨论  
    保留关键代码片段
    使用正确的 Markdown 格式

  # 生成文档的输出目录
  output_dir: ".continue-doc"

  # 可选：文档生成的自定义提示模板
  prompt_template: |
    从以下 AI 对话中生成专业的技术文档。
    重点关注实用见解和可操作的信息。

publish:
  # 默认发布平台
  target: zhihu

  # 知乎配置
  zhihu:
    cookie: ""
    # 在此处添加您的知乎会话 cookie 以实现自动发布

  # Medium 配置（待实现）
  medium:
    api_token: ""

  # Devto 配置（待实现）
  devto:
    api_token: ""
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|--------|------|---------|-------------|
| `doc.rules` | string | 内置 | 文档生成指南 |
| `doc.output_dir` | string | `.continue-doc` | Markdown 文件保存位置 |
| `doc.prompt_template` | string | 可选 | 自定义 AI 提示模板 |
| `publish.target` | string | `zhihu` | 默认发布平台 |
| `publish.*.cookie` / `*.api_token` | string | 为空 | 平台凭证以实现自动发布 |
| `continue-doc.language` | string | `zh` | 界面语言：`zh`（中文）或 `en`（English）|

---

## 项目结构

```
continue-doc/
├── README.md                 # 主 README（语言选择）
├── README.zh.md              # 中文文档
├── README.en.md              # 英文文档
├── LICENSE
├── CONTRIBUTING.md           # 贡献指南
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts         # 扩展主入口
│   ├── continue/
│   │   ├── continueDetector.ts    # Continue 安装检测
│   │   └── continueAPI.ts         # Continue API 交互
│   ├── chat/
│   │   ├── chatHook.ts           # Webview 注入和消息拦截
│   │   └── messageStore.ts        # 消息存储和管理
│   ├── doc/
│   │   ├── docGenerator.ts        # 文档生成编排
│   │   ├── promptBuilder.ts       # 提示模板生成
│   │   └── markdownWriter.ts      # Markdown 文件输出
│   ├── publish/
│   │   ├── publisher.ts           # 发布编排
│   │   ├── zhihuPublisher.ts      # 知乎平台集成
│   │   └── mediumPublisher.ts     # Medium 平台集成（待实现）
│   ├── config/
│   │   └── configLoader.ts        # YAML 配置管理
│   └── ui/
│       └── injectUI.ts            # Webview UI 注入
└── resources/
    ├── default-config.yaml
    └── default-config.en.yaml
```

---

## 激活流程

```
┌─ VSCode 启动
│
├─ Continue-Doc 扩展激活
│
├─ 检测 Continue 安装
│  ├─ 如果找到 → 继续
│  └─ 如果未找到 → 通知用户
│
├─ 钩接 Continue 聊天 Webview
│
├─ 注入 UI 组件
│  ├─ 消息列表（带全选按钮）
│  ├─ 操作栏（三个功能按钮）
│  └─ 状态栏项
│
├─ 读取语言配置（中文/英文）
│
└─ 实时监视和读取当前对话消息
```

---

## 数据流

### 消息存储

消息使用以下结构在内部存储：

```typescript
interface DocMessage {
  id: string                    // 唯一标识符
  role: "user" | "assistant"    // 消息来源
  content: string               // 消息文本
  include: boolean              // 是否纳入文档？
  timestamp: number             // Unix 时间戳
  model?: string                // 使用的 AI 模型
}
```

### 文档生成管道

```
选定的消息 (include=true)
    ↓
生成提示
    ↓
发送到 Continue AI 模型
    ↓
解析响应
    ↓
生成 Markdown
    ↓
写入 .continue-doc/
```

---

## 开发

### 设置

```bash
# 克隆仓库
git clone https://github.com/Zenger-sun/continue-doc.git
cd continue-doc

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 监视模式（开发用）
npm run watch
```

### 构建

```bash
npm run build
```

### 打包

```bash
# 安装 vsce
npm install -g @vscode/vsce

# 打包扩展
vsce package

# 发布到市场
vsce publish
```

### 测试

```bash
npm run test
```

---

## 路线图

Continue-Doc 的愿景包括：

### 当前版本（v0.1.0）
- ✅ 消息选择复选框
- ✅ 文档生成
- ✅ YAML 配置
- ✅ 知乎发布支持

### 下一版本（v0.2.0）
- 🔄 自动生成文档标题
- 🔄 自动标签/分类分配
- 🔄 Git 提交集成
- 🔄 Medium 平台支持

### 未来版本（v0.3.0+）
- 📋 Dev.to 平台支持
- 🏷️ Hashnode 平台支持
- 📊 分析仪表板
- 🗂️ 文档组织和版本控制
- 🔗 文档间交叉引用
- 🤖 自动摘要生成

---

## 应用场景

### 个人 AI 开发日志

创建一个自动化系统来记录您的 AI 辅助开发会话：

```
Continue 聊天
    ↓
AI 对话（选择性消息）
    ↓
Continue-Doc 处理
    ↓
精美的技术文档
    ↓
博客发布
    ↓
知识库
```

### 团队知识共享

- 协作记录复杂解决方案
- 与团队成员分享 AI 生成的见解
- 建立内部知识库

### 内容创建

- 将编码会话转换为博客文章
- 生成教程内容
- 创建案例研究文档

---

## 配置文件位置

插件在工作区根目录中查找配置：

```
your-workspace/
├── .continue-doc/
│   └── config.yaml
├── .continue-doc/
│   ├── 2026-03-10-ssh-auth.md
│   ├── 2026-03-11-docker-setup.md
│   └── ...
└── ...
```

---

## 故障排除

### 插件未检测到 Continue

1. 确保 Continue 已安装且启用
2. 重新加载 VSCode（`Ctrl+Shift+P` → "开发者：重新加载窗口"）
3. 查看输出面板中的 `Continue-Doc` 日志

### 消息栏未显示或无法勾选

1. 确保您在 Continue 聊天界面中
2. 检查 Continue Webview 是否完全加载
3. 消息栏应该始终显示在聊天界面上方
4. 确保有正在进行的对话内容

### 文档生成失败

1. 验证您的 Continue AI 模型是否正常工作（在直接聊天中测试）
2. 检查 `.continue-doc/` 目录的工作区权限
3. 查看输出面板中的错误详情

---

## 贡献

我们欢迎贡献！请参见 [CONTRIBUTING.md](CONTRIBUTING.md) 了解：

- 代码风格指南
- 开发设置
- 拉取请求流程
- 错误报告指南
- 功能请求流程

---

## 许可证

本项目采用 **MIT 许可证** - 详见 [LICENSE](LICENSE)。

---

## 支持

- **问题与错误报告**：[GitHub Issues](https://github.com/Zenger-sun/continue-doc/issues)
- **功能请求**：[GitHub Discussions](https://github.com/Zenger-sun/continue-doc/discussions)
- **文档**：参见 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 致谢

- 基于 [Continue](https://continue.dev) 构建 - 开源 AI 代码助手
- 灵感来自于需要将 AI 对话和知识文档联系起来的想法

---

## 免责声明

本项目是独立开发的，与 Continue 项目或其维护者**无任何关联、认可或相关性**。它是通过 VSCode API 与 Continue 配合工作的扩展插件。

---

**用❤️ 为想将对话转化为文档的开发者而创建**
