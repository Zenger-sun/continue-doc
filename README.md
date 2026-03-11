# Continue-Doc

> 将 AI 对话转化为沉淀的技术资产 | Turn AI Conversations into Lasting Developer Knowledge

**简体中文** | [English / 英文](README.en.md)

![VSCode](https://img.shields.io/badge/Made%20for-VSCode-blue?logo=visual-studio-code)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-开发中-yellow)
![Version](https://img.shields.io/badge/Version-v0.1.0-blue)

> **⚠️ 免责声明**：本项目是 Continue 的独立扩展插件，只读取记录，不修改 Continue 源代码，与 Continue 官方无关联。

## 🎯 核心价值

**问题**：每个开发者都面临这个困境

```
问 AI → 解决问题 → 知识丢失 ❌
```

**解决方案**：Continue-Doc 让对话成为资产

```
AI 对话 → AI 整理 → Markdown 文档 → 本地知识库 / 博客 ✅
```

## 📚 概述

`Continue-Doc` 是一个 VSCode 扩展，用于增强 [Continue](https://continue.dev) AI 代码助手的功能。它自动记录您的 AI 对话，并通过 AI 模型自动整理为专业的技术文档，并支持一键发布到知乎、Medium 等平台。

### ✨ 核心功能

| 功能 | 说明 |
|------|------|
| **💬 消息选择** | 实时显示对话消息，可选择性地标记要包含的消息（默认全选） |
| **📝 一键生成** | 使用 Continue 当前 AI 模型自动整理为专业 Markdown 文档 |
| **🚀 一键发布** | 直接发布到知乎、Medium 等平台（需配置凭证） |
| **⚙️ YAML 配置** | 灵活的配置系统，自定义生成规则和发布平台 |
| **🤖 AI 驱动** | 复用 Continue 已配置的 AI 模型（兼容 OpenAI/Gemini/Ollama 等） |
| **🔌 非侵入式** | 通过 VSCode API 和 Webview 注入，无需修改 Continue 源代码 |

## ⚡ 快速开始

### 系统要求

- **VSCode** 1.90+
- **Continue 插件** 已安装并配置
- **Node.js** 16+（仅用于开发）

### 安装步骤

1. **VSCode 市场安装**：在 VSCode 中打开扩展市场，搜索 `Continue-Doc` 并点击安装
2. **自动检测**：插件将自动检测您的 Continue 安装
3. **重新加载**（如需要）：`Ctrl+Shift+P` → 输入 `重新加载窗口`
4. **开始使用**：在 Continue 聊天窗口中，您将看到消息列表和操作栏

## 🚀 使用指南

### 基本工作流程

```
1️⃣  在 Continue 中进行对话          ► Continue 聊天窗口
2️⃣  查看消息列表，选择要保存的消息  ► 默认全选，可以取消或重新勾选
3️⃣  点击"生成文档"按钮              ► AI 自动整理为 Markdown
4️⃣  查看生成的文档                   ► 保存在 .continue-doc/ 目录
5️⃣  可选：点击"发布"按钮             ► 发布到博客平台
```

### UI 界面详解

#### 📋 消息列表（Message List）

实时显示当前 Continue 聊天中的所有消息：

```
✅ [全选]                     📊 已选 3 / 总计 5
─────────────────────────────────────────────────
✅ 用户     │ 如何处理 SSH 公钥认证错误？
✅ AI 助手  │ 需要检查多个方面...（消息过长自动省略）
❌ 用户     │ 能举个例子吗？
✅ AI 助手  │ 当然，这是一个实例...
✅ 用户     │ 非常感谢！
```

**特性说明**：
- 🏷️ **标签**：标识消息来源（用户 / AI 助手）
- ☑️ **复选框**：点击可选择 / 取消该消息
- 📏 **单行展示**：消息内容过长自动省略，点击查看全文
- 📊 **统计信息**：显示已选消息数 / 总消息数
- ⌃ **全选按钮**：
  - ✅ 亮起 = 全部已选
  - ❌ 灰色 = 存在未选消息
  - 点击切换全选 / 全不选
- 🔄 **实时更新**：新消息自动追加到列表

#### 🎛️ 操作栏（Action Bar）

位于 Continue 输入区域旁，提供三个主要功能：

```
┌────────────────────────────┐
│  [ 📝 生成文档 ]            │  从已选消息生成专业 Markdown
│  [ 🚀 发布 ]                │  发布到知乎、Medium 等平台
│  [ ⚙️ 配置 ]                │  打开配置文件进行自定义
└────────────────────────────┘
```

### 📝 生成文档详细流程

#### 步骤 1：准备消息

- 在消息列表中勾选要包含的消息
- 默认全部勾选，点击 [全选] 按钮可以反选
- 可单个勾选或取消任何消息

#### 步骤 2：启动生成

- 点击操作栏中的 **📝 生成文档** 按钮
- 插件将收集所有已勾选的消息

#### 步骤 3：AI 整理

插件内部流程：

```
准备的消息
     ↓
构造结构化提示
     ↓
发送到 Continue AI 模型
     ↓
AI 根据规则整理内容
     ↓
解析 AI 响应
     ↓
生成最终 Markdown
```

#### 步骤 4：保存文件

- 自动保存到 `.continue-doc/{timestamp}.md`
- 文件格式示例：`.continue-doc/2026-03-11-ssh-key-auth.md`
- 可在 VSCode 资源管理器中查看或编辑

### 🌐 发布文章

#### 支持的平台

| 平台 | 状态 | 需要的凭证 |
|------|------|-----------|
| **知乎** | ✅ 已支持 | Cookie（会话凭证） |
| **Medium** | 🔄 开发中 | API Token |
| **Dev.to** | 📋 计划中 | API Token |
| **Hashnode** | 📋 计划中 | API Token |

#### 发布流程

1. **生成文档**（或从 `.continue-doc/` 目录选择现有文件）
2. **点击发布按钮** → 选择目标平台
3. **选择平台配置** → 确认发布信息
4. **审查内容** → 确认无误后发布
5. **获取链接** → 发布成功后获得文章链接

## ⚙️ 配置指南

Continue-Doc 通过工作区根目录的配置文件进行管理。

### 配置文件位置

```
your-workspace/
├── .continue-doc/
│   ├── config.yaml           ← 配置文件（首次运行自动生成）
│   ├── 2026-03-10-example.md ← 生成的文档
│   └── ...
├── package.json
└── ...
```

### 完整配置示例

```yaml
# 文档生成配置
doc:
  # 生成规则 - AI 会根据这些规则整理文档
  rules: |
    使用简洁清晰的语言
    删除重复或离题的讨论
    保留关键代码片段和技术细节
    使用标准 Markdown 格式
    添加问题、解决方案、示例等结构化标题

  # 输出目录（相对于工作区根目录）
  output_dir: ".continue-doc"

  # 可选：自定义 AI 提示模板
  prompt_template: |
    请从以下 AI 对话中生成专业的技术文档。
    输出格式必须是 Markdown。
    重点关注：
    - 问题描述
    - 解决方案步骤
    - 代码示例
    - 关键要点

# 发布平台配置
publish:
  # 默认目标平台
  target: zhihu

  # 知乎平台配置
  zhihu:
    # 如何获取 Cookie：
    # 1. 在浏览器中打开知乎
    # 2. 登录账户
    # 3. 按 F12 打开开发者工具 → Application / Storage
    # 4. 找到 Cookie，复制 z_c0= 后的全部内容
    cookie: "your_zhihu_cookie_here"
    
    # 发布文章时的默认标签（可选）
    tags:
      - "技术"
      - "AI"
      - "开发"

  # Medium 平台配置（开发中）
  medium:
    api_token: "your_medium_token_here"
    publication: "your-publication"

  # Dev.to 配置（计划中）
  devto:
    api_token: "your_devto_token_here"

# UI/语言配置
ui:
  # 界面语言：zh（中文）或 en（英文）
  language: "zh"
```

### 配置选项详解

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `doc.rules` | string | 内置规则 | AI 文档生成的指导原则 |
| `doc.output_dir` | string | `.continue-doc` | 生成的 Markdown 文件保存目录 |
| `doc.prompt_template` | string | 可选/内置 | 自定义 AI 提示模板 |
| `publish.target` | string | `zhihu` | 默认发布平台 |
| `publish.zhihu.cookie` | string | ❌ 必需 | 知乎会话凭证 |
| `publish.zhihu.tags` | array | 可选 | 发布到知乎时的默认标签 |
| `ui.language` | string | `zh` | 界面语言 |

### 首次运行配置

1. 第一次点击 **⚙️ 配置** 按钮时，插件会自动生成默认配置
2. 文件位置：`.continue-doc/config.yaml`
3. 编辑配置文件，填入您的凭证和定制规则
4. 保存后立即生效，无需重启 VSCode

## 🔧 工作原理

### 架构设计

Continue-Doc 由 4 个核心模块组成：

```
┌─────────────────────────────────────────────────────────┐
│                    Continue-Doc                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │ 对话监听器    │   │ 消息存储     │   │ 文档生成器 │ │
│  │ (Listener)   │→→→│ (Store)      │→→→│(Generator) │ │
│  └──────────────┘   └──────────────┘   └────────────┘ │
│                                              │          │
│                                              ↓          │
│                                         ┌──────────┐   │
│                                         │ 发布器   │   │
│                                         │(Publisher)   │
│                                         └──────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
用户在 Continue 中提问
      ↓
┌─ 对话监听器 ─→ 检测到新消息
│
├─ 消息存储 ─→ 保存到内存 + JSON 文件
│
├─ UI 渲染 ─→ 显示消息列表和复选框
│
├─ 用户操作 ─→ 选择消息，点击"生成文档"
│
├─ 文档生成器
│   ├─ 收集已选消息
│   ├─ 构造 AI 提示
│   ├─ 调用 Continue AI 模型 ← ✅ 复用已配置的模型！
│   ├─ 解析 AI 响应
│   └─ 生成 Markdown
│
├─ 文件保存 ─→ 写入 .continue-doc/{timestamp}.md
│
└─ 发布 ─→ 可选：发布到知乎/Medium/Dev.to
```

### 关键设计原则

#### 1️⃣ 实时消息监听（Continue Listener）

**问题**：Continue 没有公开 API，如何获取聊天消息？

**解决方案**：通过 VSCode Webview 注入和 VSCode Commands

##### 消息读取流程

```
┌─────────────────────────────────────┐
│  VSCode 命令执行层                   │
│  vscode.commands.executeCommand()    │
│  ("continue.getSession")            │
└────────────┬──────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  获取 Continue 当前会话              │
│  返回结构：                           │
│  {                                   │
│    messages: [                       │
│      {                               │
│        role: "user",                 │
│        content: "How to fix SSH?"    │
│        timestamp: 1710123456789      │
│      },                              │
│      {                               │
│        role: "assistant",            │
│        content: "Check pub keys..."  │
│        timestamp: 1710123457000      │
│      },                              │
│      ...                             │
│    ]                                 │
│  }                                   │
└────────────┬──────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  插件定时轮询机制                     │
│  setInterval(() => {                 │
│    1. 获取当前 session                │
│    2. 对比消息长度                    │
│    3. 发现新消息 → 触发事件           │
│    4. 更新内存存储                    │
│    5. 刷新 UI 列表                    │
│  }, 500ms)                           │
└────────────┬──────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  消息存储（Conversation Store）       │
│  内存 + 本地 JSON 文件 (.continue-doc)│
│  支持：查询、筛选、标记              │
└─────────────────────────────────────┘
```

**特点**：
- ✅ **非侵入式**：无需修改 Continue 源代码
- ✅ **实时更新**：500ms 轮询，响应快速
- ✅ **自动检测**：VSCode 启动时自动探测 Continue
- ✅ **会话隔离**：不同标签页消息独立存储
- ✅ **容错机制**：Continue 不可用时优雅降级

---

#### 2️⃣ 消息存储和管理（Conversation Store）

**数据结构**：

```typescript
// 单条消息（与 Continue 聊天对应）
interface ChatMessage {
  id: string                    // UUID：唯一标识符，便于 UI 操作
  role: "user" | "assistant"    // 消息来源：用户输入或 AI 回复
  content: string               // 完整消息内容（支持 Markdown / 代码）
  include: boolean              // 用户选择：是否纳入文档？
  timestamp: number             // Unix 时间戳：消息发送时间
  model?: string                // 使用的 AI 模型名称（如 gpt-4，claude-3）
  tokens?: number               // 消息 Token 数（用于估算处理时间）
  codeBlocks?: CodeBlock[]       // 提取的代码块（便于索引）
}

// 代码块提取
interface CodeBlock {
  language: string              // 编程语言（python, javascript 等）
  code: string                  // 代码片段
  line: number                  // 在消息中的行号
}

// 会话配置
interface SessionConfig {
  id: string                    // 会话 ID
  title: string                 // 会话标题（可用作文档标题参考）
  createdAt: number             // 创建时间
  messages: ChatMessage[]        // 所有消息列表
  selectedCount: number          // 已选消息数
  totalTokens: number           // 总 Token 数
}

// 文档配置
interface DocumentConfig {
  rules: string                 // 文档生成规则（从 config.yaml 读取）
  output_dir: string            // 输出目录
  prompt_template?: string      // 自定义 AI 提示
  language: "zh" | "en"         // 输出文档的语言
}
```

**存储位置**：

```
工作区根目录
├── .continue-doc/
│   ├── config.yaml                ← 用户配置（持久化）
│   ├── session.json               ← 当前会话快照（临时，切换会话时更新）
│   ├── 2026-03-11-ssh-auth.md    ← 生成的文档 1
│   ├── 2026-03-11-docker-setup.md ← 生成的文档 2
│   └── ...
├── package.json
└── ...
```

**会话 JSON 示例** (`.continue-doc/session.json`):

```json
{
  "id": "session-2026-03-11-001",
  "title": "SSH 公钥认证问题排查",
  "createdAt": 1710123456789,
  "totalTokens": 2843,
  "selectedCount": 5,
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "我遇到了 SSH 公钥认证的问题，本地密钥配置正确，但连接时仍报错 Permission denied",
      "include": true,
      "timestamp": 1710123456789,
      "tokens": 45,
      "codeBlocks": [],
      "model": "gpt-4"
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "这个问题通常由以下几个原因引起：\n\n1. **权限问题**\n\n```bash\nchmod 700 ~/.ssh\nchmod 600 ~/.ssh/id_rsa\nchmod 644 ~/.ssh/id_rsa.pub\n```\n\n2. **SSH 配置检查**\n\n```bash\nssh -vvv user@host\n```",
      "include": true,
      "timestamp": 1710123457000,
      "tokens": 156,
      "codeBlocks": [
        {
          "language": "bash",
          "code": "chmod 700 ~/.ssh\nchmod 600 ~/.ssh/id_rsa\nchmod 644 ~/.ssh/id_rsa.pub",
          "line": 12
        },
        {
          "language": "bash",
          "code": "ssh -vvv user@host",
          "line": 21
        }
      ],
      "model": "gpt-4"
    },
    {
      "id": "msg-003",
      "role": "user",
      "content": "执行了这些命令，但仍然失败，能帮我检查一下吗？",
      "include": true,
      "timestamp": 1710123458500,
      "tokens": 32,
      "codeBlocks": [],
      "model": "gpt-4"
    },
    {
      "id": "msg-004",
      "role": "assistant",
      "content": "继续执行以下步骤：\n\n1. 确认公钥已添加到服务器\n\n```bash\ncat ~/.ssh/id_rsa.pub | ssh user@host 'cat >> ~/.ssh/authorized_keys'\n```\n\n2. 验证服务器端配置\n\n```bash\nssh user@host \"grep $(cat ~/.ssh/id_rsa.pub) ~/.ssh/authorized_keys\"\n```",
      "include": true,
      "timestamp": 1710123459200,
      "tokens": 128,
      "codeBlocks": [
        {
          "language": "bash",
          "code": "cat ~/.ssh/id_rsa.pub | ssh user@host 'cat >> ~/.ssh/authorized_keys'",
          "line": 7
        },
        {
          "language": "bash",
          "code": "ssh user@host \"grep $(cat ~/.ssh/id_rsa.pub) ~/.ssh/authorized_keys\"",
          "line": 13
        }
      ],
      "model": "gpt-4"
    }
  ]
}
```

---

#### 3️⃣ 智能 AI 提示构造（Prompt Builder）

**目标**：基于用户对话，构造结构化 AI 提示，使 AI 生成高质量文档

**构造流程**：

```
┌────────────────────────────────────────────────────────┐
│ 输入：用户选择的消息列表 + 配置规则                   │
└────────────────────────┬───────────────────────────────┘
                         │
        ☝️ 步骤 1：消息清理与合并
        │
        ↓
┌──────────────────────────────────────────────────────────────┐
│ 1. 过滤非技术内容                                            │
│    • 移除寒暄和题外话                                        │
│    • 保留核心问题和解决方案                                  │
│                                                              │
│ 2. 合并交错的用户/AI 消息                                   │
│    原始：USER → AI → USER → AI                              │
│    合并：(USER-AI 对) → (USER-AI 对)                        │
│                                                              │
│ 3. 提取结构化信息                                            │
│    • 问题描述（all USER messages）                          │
│    • 解决方案（all ASSISTANT messages）                     │
│    • 代码示例（codeBlocks）                                │
│                                                              │
│ 4. 标记和分类                                                │
│    Tag: [问题], [解决方案], [代码], [扩展阅读]             │
└────────────────┬───────────────────────────────────────┘
                 │
        ☝️ 步骤 2：模板选择
        │
        ↓
┌──────────────────────────────────────────────────────────────┐
│ 根据内容类型选择最佳模板：                                    │
│                                                              │
│ 📋 检测内容类型                                              │
│    • 故障排除 → "故障排除模板"                              │
│    • 代码实现 → "代码教程模板"                              │
│    • 概念讲解 → "概念说明模板"                              │
│    • 最佳实践 → "最佳实践模板"                              │
│                                                              │
│ 应用模板结构：                                                │
│    - 摘要（Summary）                                        │
│    - 问题描述（Problem）                                    │
│    - 解决方案（Solution）                                  │
│    - 关键步骤（Steps）或代码示例（Examples）              │
│    - 要点总结（Key Points）                                │
│    - 常见误区（Common Pitfalls）（如适用）                │
└────────────────┬───────────────────────────────────────┘
                 │
        ☝️ 步骤 3：组装最终 Prompt
        │
        ↓
┌──────────────────────────────────────────────────────────────┐
│ System Prompt（全局指导）                                     │
│ ─────────────────────────────────────────────────────────  │
│ You are an expert technical writer specializing in           │
│ creating clear, concise developer documentation.             │
│                                                              │
│ Task: Generate professional technical documentation from    │
│ an AI conversation, following the specified guidelines.     │
│                                                              │
│ Output language: 中文 (or as configured)                    │
│ ─────────────────────────────────────────────────────────  │
│                                                              │
│ User Rules from config.yaml:                               │
│ ─────────────────────────────────────────────────────────  │
│ • Use concise and clear language                           │
│ • Remove redundant discussions                             │
│ • Keep technical details and code snippets                 │
│ • Use proper Markdown formatting                           │
│ • Add problem, solution, examples structure                │
│ ─────────────────────────────────────────────────────────  │
│                                                              │
│ Template Structure to Follow:                              │
│ ─────────────────────────────────────────────────────────  │
│ # Title                                                    │
│ ## Summary (1-2 paragraphs)                               │
│ ## Problem / Situation                                     │
│ ## Solution / Approach                                     │
│    ### Step 1                                              │
│    ### Step 2                                              │
│    ...                                                     │
│ ## Code Examples                                           │
│ ## Key Takeaways                                           │
│ ─────────────────────────────────────────────────────────  │
│                                                              │
│ Raw Conversation:                                          │
│ ─────────────────────────────────────────────────────────  │
│ [消息 1] User: [用户提问]                                   │
│ [消息 2] AI: [AI 回答]                                      │
│ [消息 3] User: [用户追问]                                   │
│ [消息 4] AI: [AI 回答]                                      │
│ ...                                                        │
│ ─────────────────────────────────────────────────────────  │
│                                                              │
│ Generate the documentation now:                            │
│ ─────────────────────────────────────────────────────────  │
└──────────────────────────────────────────────────────────────┘
```

**完整 Prompt 示例**（发送给 Continue AI）：

```
System Prompt:
You are an expert technical writer. Generate professional 
technical documentation from the AI conversation below.

Format: Markdown
Language: 中文
Follow the specified template structure exactly.

Rules (from user config):
- 使用简洁清晰的语言
- 删除重复或离题讨论
- 保留技术细节和代码片段
- 使用标准 Markdown 格式
- 包含问题、解决方案、示例、要点

Template:
# [Title]
## 摘要
[1-2 paragraphs]
## 问题描述
[Problem details]
## 解决方案
### 步骤 1
[Step details]
### 步骤 2
[Step details]
...
## 代码示例
[Code blocks]
## 关键要点
[Bullet points]

Conversation to process:

User: 我遇到了 SSH 公钥认证的问题，本地密钥配置正确，
但连接时仍报错 Permission denied (publickey)。

AI: 这个问题通常由以下几个原因引起：

1. **权限问题**

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

2. **SSH 配置检查**

```bash
ssh -vvv user@host
```

User: 执行了这些命令，但仍然失败。

AI: 继续以下步骤：

1. 确认公钥已添加到服务器

```bash
cat ~/.ssh/id_rsa.pub | ssh user@host 'cat >> ~/.ssh/authorized_keys'
```

2. 验证服务器端配置

```bash
ssh user@host "grep $(cat ~/.ssh/id_rsa.pub) ~/.ssh/authorized_keys"
```

Generate the documentation now:
```

**AI 预期输出**：

```markdown
# SSH 公钥认证问题排查指南

## 摘要
SSH 公钥认证是安全远程登录的关键机制。本指南针对常见的
"Permission denied (publickey)" 错误进行诊断和排除。通过
逐步检查本地密钥权限、SSH 配置和服务器端授权，可以解决
大多数认证问题。

## 问题描述
本地 SSH 密钥配置正确，但连接到远程服务器时仍显示以下错误：
```
Permission denied (publickey)
```
这通常表示服务器拒绝了公钥认证，需要系统地排查原因。

## 解决方案

### 步骤 1：检查本地密钥权限
SSH 对文件权限的要求非常严格。错误的权限设置会导致认证失败。

执行以下命令修复权限：
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

**权限说明**：
- `~/.ssh` 目录：700（仅所有者可读写执行）
- `id_rsa` 私钥：600（仅所有者可读写）
- `id_rsa.pub` 公钥：644（所有者可读写，其他人可读）

### 步骤 2：启用详细日志排查
使用 `-vvv` 标志启用最详细的调试输出：

```bash
ssh -vvv user@host
```

这将显示 SSH 握手的每个步骤，帮助识别具体失败点。

### 步骤 3：确认公钥已在服务器端授权
公钥必须被添加到服务器的 `authorized_keys` 文件中：

```bash
cat ~/.ssh/id_rsa.pub | ssh user@host 'cat >> ~/.ssh/authorized_keys'
```

### 步骤 4：验证服务器端配置
在服务器上验证公钥是否正确添加：

```bash
ssh user@host "grep $(cat ~/.ssh/id_rsa.pub) ~/.ssh/authorized_keys"
```

如果该命令返回匹配的公钥内容，说明配置正确。

## 代码示例

**完整排查脚本**：
```bash
#!/bin/bash
# SSH 认证问题诊断脚本

echo "=== 本地密钥权限检查 ==="
ls -la ~/.ssh/

echo -e "\n=== 修复权限 ==="
chmod 700 ~/.ssh && chmod 600 ~/.ssh/id_rsa && chmod 644 ~/.ssh/id_rsa.pub
echo "权限已修复"

echo -e "\n=== 详细连接测试 ==="
ssh -vvv user@host
```

## 关键要点

✅ **必做项**：
- 确保 `~/.ssh` 目录权限为 700
- 确保私钥 `id_rsa` 权限为 600
- 将公钥正确添加到服务器的 `authorized_keys`

⚠️ **常见错误**：
- 权限过于宽松（777 或其他）导致 SSH 拒绝使用密钥
- 公钥未添加或添加了错误的公钥
- `authorized_keys` 文件权限不正确（应为 600）

🔧 **进阶调试**：
- 使用 `ssh -vvv` 查看详细日志
- 检查服务器 `/var/log/auth.log` 或 `/var/log/secure`
- 确认 SSH 服务已启用 PubkeyAuthentication

---
```

---

#### 4️⃣ 复用 Continue AI 模型调用（Model Integration）

**核心设计**：直接调用 Continue 当前已配置的 AI 模型，**无需重复配置**

##### 模型调用架构

```
┌─────────────────────────────────────────────────────────┐
│                 Continue-Doc 插件                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 读取 Continue 配置                                 │
│     ~/.continue/config.json                           │
│     ↓                                                  │
│     { "models": [                                      │
│       {                                                │
│         "title": "GPT-4",                             │
│         "provider": "openai",                         │
│         "model": "gpt-4",                            │
│         "apiKey": "sk-xxx"                           │
│       }                                                │
│     ]}                                                 │
│                                                         │
│  2. 提取模型信息                                       │
│     ↓                                                  │
│     获取当前活跃模型的：                               │
│     - provider (openai / anthropic / ollama...)       │
│     - model name (gpt-4 / claude-3 / mistral...)     │
│     - API endpoint                                    │
│     - 认证凭证（已配置，可复用）                      │
│                                                         │
│  3. 初始化 LLM 客户端                                 │
│     ↓                                                  │
│     const llm = new OpenAIClient({                    │
│       apiKey: config.apiKey,                         │
│       model: config.model,                           │
│       ...                                             │
│     })                                                 │
│                                                         │
│  4. 调用模型生成文档                                   │
│     ↓                                                  │
│     const response = await llm.complete({            │
│       prompt: systemPrompt + userPrompt,             │
│       maxTokens: 2000,                               │
│       temperature: 0.7                               │
│     })                                                 │
│                                                         │
│  5. 流式处理响应                                       │
│     ↓                                                  │
│     - 边生成边返回（显示进度）                       │
│     - 实时更新预览窗口                               │
│     - 最后保存为 Markdown 文件                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

##### 兼容模型列表

| 提供商 | 模型 | 状态 | 说明 |
|--------|------|------|------|
| **OpenAI** | gpt-4, gpt-3.5-turbo | ✅ 完全支持 | 最稳定，质量最佳 |
| **Anthropic** | claude-3-opus, claude-3-sonnet | ✅ 完全支持 | 长文本处理能力强 |
| **Google** | gemini-pro | ✅ 完全支持 | 多模态支持 |
| **OpenRouter** | 所有支持的模型 | ✅ 完全支持 | 统一接口 |
| **Ollama** | 本地模型（llama2 等） | ✅ 完全支持 | 离线运行 |
| **Together AI** | 开源模型 | 🔄 开发中 | 计划支持 |

**核心优势**：
- ✅ **无需配置**：复用 Continue 的现有凭证和模型
- ✅ **成本优化**：不增加额外的 API 调用费用
- ✅ **灵活切换**：用户在 Continue 中切换模型，插件自动适配
- ✅ **广泛兼容**：支持所有 Continue 支持的 LLM 提供商

##### TypeScript 实现示例

```typescript
// 步骤 1：读取 Continue 配置
const continueConfigPath = path.join(
  os.homedir(),
  '.continue',
  'config.json'
);
const continueConfig = JSON.parse(
  fs.readFileSync(continueConfigPath, 'utf-8')
);

// 步骤 2：获取当前活跃模型
const activeModel = continueConfig.models[0]; // 用户最常用的模型

// 步骤 3：根据 provider 初始化客户端
let llmClient: LLMClient;

if (activeModel.provider === 'openai') {
  llmClient = new OpenAIClient({
    apiKey: activeModel.apiKey,
    model: activeModel.model,
  });
} else if (activeModel.provider === 'anthropic') {
  llmClient = new AnthropicClient({
    apiKey: activeModel.apiKey,
    model: activeModel.model,
  });
}
// ... 其他提供商

// 步骤 4：构造提示并调用模型
const systemPrompt = `您是技术文档专家...`;

const userMessages = selectedMessages
  .map(m => `${m.role}: ${m.content}`)
  .join('\n\n');

const userPrompt = `请根据以下对话生成文档：\n${userMessages}`;

// 步骤 5：流式调用
const response = await llmClient.complete({
  systemPrompt,
  userPrompt,
  maxTokens: 2000,
  temperature: 0.7,
  onChunk: (chunk) => {
    // 实时显示生成进度
    updatePreviewWindow(chunk);
  }
});

// 步骤 6：保存结果
const markdown = parseResponse(response);
saveMarkdownFile(markdown);
```

---

#### 5️⃣ 文档生成完整工作流

```typescript
// 用户点击"生成文档"后的完整流程

async function generateDocument(
  selectedMessages: ChatMessage[],
  config: DocumentConfig
) {
  try {
    // 1️⃣ 验证和预处理
    console.log(`📝 开始生成文档...`);
    console.log(`   已选消息数：${selectedMessages.length}`);
    console.log(`   总 Token：${selectedMessages.reduce((s, m) => s + (m.tokens || 0), 0)}`);

    if (selectedMessages.length === 0) {
      throw new Error('❌ 请至少选择一条消息');
    }

    // 2️⃣ 构造 Prompt
    const { systemPrompt, userPrompt } = buildPrompts(
      selectedMessages,
      config
    );
    console.log(`✅ Prompt 构造完成`);

    // 3️⃣ 获取活跃模型
    const llmClient = await initLLMClient();
    console.log(`✅ LLM 客户端初始化：${llmClient.modelName}`);

    // 4️⃣ 调用模型生成
    console.log(`🤖 调用 AI 模型生成文档...`);
    const response = await llmClient.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
      onChunk: (chunk) => {
        // 实时更新预览
        updateProgressBar(chunk);
      }
    });
    console.log(`✅ AI 生成完成`);

    // 5️⃣ 解析和优化
    const markdown = parseMarkdown(response);
    console.log(`✅ Markdown 解析完成`);

    // 6️⃣ 生成元数据
    const metadata = {
      title: extractTitle(markdown),
      summary: extractSummary(markdown),
      tags: extractTags(markdown),
      sourceMessages: selectedMessages.map(m => m.id),
      generatedAt: new Date().toISOString(),
      model: llmClient.modelName,
    };

    // 7️⃣ 保存文件
    const filename = generateFilename(metadata);
    const filepath = path.join(config.output_dir, filename);
    
    await saveFile(filepath, markdown, metadata);
    console.log(`✅ 文档已保存：${filename}`);

    // 8️⃣ 在编辑器中打开
    await vscode.commands.executeCommand(
      'vscode.open',
      vscode.Uri.file(filepath)
    );
    console.log(`✅ 文档已在编辑器中打开`);

    // 9️⃣ 提示用户选项
    const action = await vscode.window.showInformationMessage(
      '✅ 文档生成成功！',
      '发布',
      '分享链接',
      '关闭'
    );

    if (action === '发布') {
      await publishDocument(filepath, metadata);
    }

  } catch (error) {
    console.error(`❌ 生成失败：${error.message}`);
    vscode.window.showErrorMessage(
      `文档生成失败：${error.message}`
    );
    throw error;
  }
}
```

---

**总结**：Continue-Doc 的四个核心设计原则确保了：
1. **自动监听**：无缝读取 Continue 消息
2. **智能存储**：结构化保存对话内容
3. **精准提示**：根据规则构造高质量 AI 提示
4. **模型复用**：调用已配置的 AI 模型，开箱即用

### 数据存储

```
工作区根目录
├── .continue-doc/
│   ├── config.yaml              ← 用户配置
│   ├── 2026-03-11-topic.md      ← 生成的文档
│   ├── 2026-03-12-topic2.md
│   └── session.json             ← 当前会话消息（临时）
├── package.json
└── ...
```

### 扩展性

Continue-Doc 设计为模块化架构，易于扩展：

```
新增平台支持    → 添加 platforms/newPlatform.ts
自定义 AI 提示  → 修改 promptBuilder.ts
新的输出格式    → 添加 writers/newFormat.ts
插件命令扩展    → 修改 extension.ts
```

## 📁 项目结构

```
continue-doc/
├── src/
│   ├── extension.ts                 # 主入口：注册命令和事件
│   ├── continue/
│   │   ├── continueDetector.ts      # Continue 安装检测
│   │   └── continueAPI.ts           # Continue AI 模型调用
│   ├── chat/
│   │   ├── chatHook.ts              # Webview 注入和消息拦截
│   │   └── messageStore.ts          # 消息存储管理
│   ├── ui/
│   │   ├── messageList.ts           # 消息列表 UI
│   │   └── actionBar.ts             # 操作栏 UI
│   ├── doc/
│   │   ├── docGenerator.ts          # 文档生成编排
│   │   ├── promptBuilder.ts         # AI 提示构造
│   │   └── markdownWriter.ts        # Markdown 文件输出
│   ├── publish/
│   │   ├── publisher.ts             # 发布编排
│   │   ├── zhihuPublisher.ts        # 知乎平台
│   │   ├── mediumPublisher.ts       # Medium 平台（开发中）
│   │   └── devtoPublisher.ts        # Dev.to （计划中）
│   ├── config/
│   │   └── configLoader.ts          # YAML 配置管理
│   └── utils/
│       ├── logger.ts                # 日志工具
│       └── errors.ts                # 错误处理
├── resources/
│   ├── default-config.yaml          # 默认配置（中文）
│   ├── default-config.en.yaml       # 默认配置（英文）
│   ├── icon.png                     # 插件图标
│   └── icon.svg                     # 矢量图标
├── package.json                     # NPM 配置
├── tsconfig.json                    # TypeScript 配置
├── .vscodeignore                    # 打包忽略清单
├── LICENSE                          # MIT 许可证
└── README.md                        # 本文件
```

## 💡 应用场景

### 1. 个人开发日志（最常见）

```
工作场景：
  您在使用 Continue 解决一个复杂的 SSH 认证问题
  ↓
  • 多轮对话，问题详细，解决方案完整
  • 包含代码片段、故障排除步骤
  ↓
  使用 Continue-Doc：
  • 打开消息列表，全选所有消息（默认）
  • 点击"生成文档"
  • AI 自动整理为专业文档
  ↓
  成果：
  ✅ 2026-03-11-ssh-key-auth.md 已生成
  ✅ 包含问题描述、解决方案、代码示例
  ✅ 保存到本地知识库
```

最后，发布到知乎获得技术分享的收益。

### 2. 团队知识共享

```
场景：
  团队成员 A 遇到微服务架构的难题
  • 通过 Continue 获得解决方案
  • 生成文档并共享给团队
  
工作流：
  按照公司规范配置 Continue-Doc
  ↓
  每个开发者生成的文档自动进入。
  每个开发者生成的文档自动进入团队 Wiki
  ↓
  建立内部知识库
```

### 3. 内容创作加速

```
场景：
  技术博主需要创建教程内容
  
传统方式：
  手动编写 → 逻辑混乱 → 反复修改
  
使用 Continue-Doc：
  • 通过对话构建教程大纲
  • Continue-Doc 自动整理为博文
  • 在知乎、Medium 一键发布
  • 同时保存到本地存档
  
效果：每篇文章产出时间减少 70%
```

### 4. 技术方案文档

```
场景：
  技术评审会上需要讲解解决方案

过程：
  • 会议前与 Continue 讨论方案细节
  • 生成结构清晰的技术文档
  • 作为会议讲稿或附件
  • 会议后保存为项目文档
```

## 🐛 故障排除

### 问题 1：插件未检测到 Continue

**症状**：启动后没有看到消息列表

**解决方案**：

1. ✅ 确保 Continue 插件已安装和启用（VSCode → 扩展 → 搜索 Continue）
2. ✅ 确保在 Continue 聊天界面中（左侧边栏 → Continue 图标）
3. ✅ 重新加载 VSCode：`Ctrl+Shift+P` → 输入 "重新加载窗口"
4. ✅ 查看输出面板：`Ctrl+Shift+U` → 选择"Continue-Doc"频道查看日志
5. ✅ 检查 VSCode 版本：必须 1.90+

### 问题 2：消息列表无法显示或无法勾选

**症状**：看不到消息，或复选框无法点击

**解决方案**：

1. ✅ 确保有正在进行的 Continue 对话（至少 1 条消息）
2. ✅ 确保 Continue Webview 完全加载（等待 Continue 聊天窗口出现）
3. ✅ 刷新 VSCode：关闭 Continue 聊天标签重新打开
4. ✅ 清除缓存：删除 `.continue-doc/session.json`，重启
5. ✅ 查看浏览器控制台：点击聊天框 ⚙️ → DevTools → Console 查看错误

### 问题 3：文档生成失败

**症状**："生成文档" 按钮无反应或报错

**解决方案**：

1. ✅ 确认 Continue AI 模型正常工作：在聊天中输入问题测试
2. ✅ 检查工作区权限：`.continue-doc/` 目录必须可写
3. ✅ 查看输出日志：`Ctrl+Shift+U` → "Continue-Doc" → 查看错误信息
4. ✅ 检查配置文件：`.continue-doc/config.yaml` 是否有语法错误
5. ✅ 重新启动 Continue：关闭聊天窗口再打开

### 问题 4：发布失败

**症状**：点击"发布"后无反应或提示错误

**解决方案**：

1. ✅ **知乎发布**：
   - 检查是否填入了 Cookie（参见配置指南）
   - Cookie 是否已过期（重新获取）
   - 确认网络连接正常
   - 查看文档内容是否合规

2. ✅ **Medium 发布**（开发中）：
   - 功能尚未完全实现，敬请期待 v0.2.0

### 问题 5：配置文件错误

**症状**：插件启动时报错，无法加载配置

**解决方案**：

1. ✅ 删除 `.continue-doc/config.yaml`
2. ✅ 重启 VSCode，插件会自动生成新的默认配置
3. ✅ 再次编辑配置文件
4. ✅ 确保 YAML 格式正确（缩进、冒号间距等）

## 📞 获取帮助

### 资源

- 📖 [完整文档](https://github.com/Zenger-sun/continue-doc)
- 🐛 [报告问题](https://github.com/Zenger-sun/continue-doc/issues)
- 💬 [讨论功能](https://github.com/Zenger-sun/continue-doc/discussions)
- 📝 [贡献指南](CONTRIBUTING.md)

### 反馈

我们欢迎任何反馈和建议！

- **功能建议**：GitHub Discussions
- **Bug 报告**：GitHub Issues （请提供日志）
- **代码贡献**：欢迎 Pull Request

## 🤝 贡献指南

Continue-Doc 是一个开源项目，我们热烈欢迎来自社区的贡献！

### 如何贡献

1. **报告 Bug**：[GitHub Issues](https://github.com/Zenger-sun/continue-doc/issues)
   - 提供清晰的问题描述
   - 附上日志输出和截图
   - 说明 VSCode 和 Continue 版本

2. **提出功能**：[GitHub Discussions](https://github.com/Zenger-sun/continue-doc/discussions)
   - 描述使用场景
   - 说明为什么需要此功能
   - 讨论设计方案

3. **代码贡献**：
   - Fork 本仓库
   - 创建功能分支：`git checkout -b feature/AmazingFeature`
   - 提交更改：`git commit -m 'Add AmazingFeature'`
   - Push 到分支：`git push origin feature/AmazingFeature`
   - 打开 Pull Request

### 开发规范

- 使用 TypeScript，遵循现有代码风格
- 添加必要的注释和文档
- 编写/更新相关测试
- 更新 README 如有新功能
- 签署 CLA（如需要）

### 开发者协议

参见 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

## 📜 许可证

本项目采用 **MIT 许可证**。

```
MIT License

Copyright (c) 2026 Zenger-sun

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
...
```

详见 [LICENSE](LICENSE)。

## ❤️ 致谢

Continue-Doc 的创意来自于对以下项目和社区的感謝：

### 项目

- **[Continue](https://continue.dev)** - 开源 AI 代码助手
- **[VSCode](https://code.visualstudio.com/)** - 强大的代码编辑器
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript

### 社区

- Continue 社区的启发和支持
- 所有提交 Issue 和 Pull Request 的贡献者
- 早期测试者的反馈

## ⚖️ 免责声明

**重要**：

本项目是独立开发的，与 Continue 项目或其维护者**无任何关联、认可或相关性**。

- 不是 Continue 官方插件
- 不修改 Continue 源代码
- 仅通过公开的 VSCode API 与 Continue 交互
- All content generated or published through this extension is the user's responsibility

## 📈 状态

```
项目状态：持续开发中
当前版本：v0.1.0
稳定性：Beta (可生产使用，但可能有边界情况)
维护情况：活跃
```

---

<div align="center">

**🌟 如果您喜欢这个项目，请给我们一个 Star！**

</div>

---

<div align="center">

**用 ❤️ 为每个想将 AI 对话转化为技术资产的开发者而创建**

![GitHub Repo stars](https://img.shields.io/github/stars/Zenger-sun/continue-doc?style=social)
