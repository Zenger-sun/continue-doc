# Continue DevLog 插件实现思路

## 1. 项目目标

开发一个 VSCode 插件 **Continue DevLog**，用于在使用 Continue AI 对话时自动记录问题与回答，并将有价值的内容整理为开发文档（Markdown）。

核心能力：

- 自动记录 AI 对话
- 勾选是否加入文档
- 一键生成 Markdown 文档
- 使用 Continue 当前配置的 AI 模型生成整理后的文档
- 可配置发布平台

最终实现：

```
AI 对话 → 自动记录 → AI整理 → Markdown文档 → 本地知识库 / 博客
```

---

# 2. 总体架构

插件由 4 个核心模块组成：

```
Continue DevLog

├─ Continue Listener
│   监听 Continue 对话
│
├─ Conversation Store
│   保存对话记录
│
├─ Document Generator
│   调用 Continue 模型生成文档
│
└─ Publisher
    发布到博客 / 平台
```

数据流：

```
User 提问
      │
      ▼
Continue Chat
      │
      ▼
aiDocExtra 监听消息
      │
      ▼
保存 conversation
      │
      ▼
Generate Document
      │
      ▼
AI整理
      │
      ▼
生成 Markdown
```

---

# 3. 插件功能设计

## 3.1 Continue 对话监听

由于 Continue 没有公开 API，需要通过 VSCode command 获取 session。

实现方式：

```
vscode.commands.executeCommand("continue.getSession")
```

返回示例：

```
{
  messages:[
    { role:"user", content:"How to fix ssh key" },
    { role:"assistant", content:"Check authorized_keys" }
  ]
}
```

插件定时轮询 session：

```
setInterval → 获取 messages → 对比长度 → 发现新消息
```

新消息加入本地 conversation store。

---

# 4. Conversation Store

用于保存当前会话记录。

结构：

```
interface ChatMessage {

  role: "user" | "assistant"

  content: string

  timestamp: number

  addToDoc: boolean

}
```

功能：

- 保存对话
- 标记是否加入文档
- 支持截图 / 代码

建议存储方式：

```
内存 + JSON 文件
```

示例：

```
.ai-devlog/session.json
```

---

# 5. UI 扩展

在 Continue 输入区域增加一个扩展 UI。

组件：

### Add to Doc

复选框

```
☑ Add to Doc
```

默认勾选。

表示：

```
当前消息是否加入文档
```

---

### 下拉菜单

```
▾ DevLog

Generate Document
Publish
Settings
```

功能说明：

Generate Document

使用 AI 整理当前对话为 Markdown。

Publish

发布到平台。

Settings

打开配置。

---

# 6. 文档生成

当用户点击：

```
Generate Document
```

插件执行：

1 获取 conversation

2 过滤 addToDoc

3 构造 prompt

4 调用 Continue 模型

5 生成 Markdown


---

# 7. AI Prompt 设计

Prompt 示例：

```
Based on the following AI conversation, generate a concise developer documentation in Markdown.

Requirements:

- concise language
- clear structure
- include problem description
- include solution steps
- include code snippets
- suitable for blog post

Conversation:

${conversation}
```

AI 返回：

```
# Fix SSH Public Key Authentication

## Problem

...

## Solution

### Step 1

...

### Step 2

...
```

---

# 8. 调用 Continue 模型

插件不直接调用 OpenAI API。

而是复用 Continue 当前模型。

流程：

```
Continue Config
      │
      ▼
获取当前模型
      │
      ▼
llm.complete()
      │
      ▼
返回生成结果
```

示例：

```
const result = await llm.complete({

  prompt: prompt,

  maxTokens: 2000

})
```

这样可以兼容：

- OpenAI
- Gemini
- OpenRouter
- Ollama

---

# 9. Markdown 文档生成

默认目录：

```
.ai-devlog/docs/
```

文件命名：

```
YYYY-MM-DD-topic.md
```

示例：

```
2026-03-11-fix-ssh-auth.md
```

文件内容：

```
# Fix SSH Public Key Authentication

## Problem
...

## Solution
...
```


VSCode API 写入文件：

```
vscode.workspace.fs.writeFile()
```

---

# 10. 发布功能

Publish 按钮支持发布到平台。

配置在 yaml 文件。

```
.ai-devlog/config.yaml
```

示例：

```
publish:

  zhihu: true

  juejin: true

  medium: false

  github: true
```

发布流程：

```
Markdown
   │
   ▼
转换 HTML
   │
   ▼
调用平台 API
```

---

# 11. 插件目录结构

推荐结构：

```
continue-devlog

├─ src
│
├─ extension.ts
│
├─ continueListener.ts
│
├─ conversationStore.ts
│
├─ docGenerator.ts
│
├─ publisher.ts
│
└─ config.ts

├─ package.json

├─ README.md

└─ LICENSE
```

---

# 12. MVP 开发路线

阶段 1

基础插件

- 监听 Continue 对话
- 保存 conversation

阶段 2

文档生成

- Generate Document
- 调用 Continue 模型

阶段 3

Markdown 管理

- 自动保存
- 打开文档

阶段 4

发布系统

- 支持博客平台


---

# 13. 未来扩展

可扩展能力：

AI 知识库

```
conversation → docs → searchable knowledge base
```

团队知识库

```
VSCode → Git → Team Wiki
```

自动博客

```
AI 对话 → 自动生成技术博客
```


---

# 14. 项目价值

开发者每天都会遇到一个问题：

```
问 AI → 解决问题 → 知识丢失
```

Continue DevLog 的价值是：

```
AI conversation → Developer knowledge base
```

最终目标：

```
让 AI 对话成为可沉淀的技术资产
```

