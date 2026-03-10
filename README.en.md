# Continue-Doc - Documentation Generation and Publishing Tool for Continue

> Enhance your Continue plugin with powerful document generation and publishing capabilities.

## 📚 LANGUAGE SELECT / 语言选择

[中文 / 简体中文](README.md) | **English**

**⚠️ This project is a Continue extension plugin that only reads and records data without modifying the original plugin. It is not affiliated with the official Continue project.**

[![VSCode](https://img.shields.io/badge/Made%20for-VSCode-blue)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)
![Status](https://img.shields.io/badge/Status-In%20Development-yellow)

## Overview

`Continue-Doc` is a VSCode extension that enhances the [Continue](https://continue.dev) plugin by adding powerful document generation and publishing capabilities. It builds a bridge between your AI conversations and beautifully formatted technical documentation.

### Key Features

- **💬 Message Selection** - Selectively mark chat messages to include in documents
- **📝 One-Click Document Generation** - Generate professional Markdown documents from selected conversations
- **🚀 One-Click Publishing** - Publish directly to Zhihu, Medium, and other platforms
- **⚙️ YAML Configuration** - Flexible configuration system for generation rules and publishing targets
- **🤖 AI-Powered** - Leverage the Continue AI model to optimize and structure documents
- **🔌 Non-Intrusive** - No need to modify Continue source code, works via VSCode API and Webview injection

## Installation

### System Requirements

- **VSCode** 1.90+
- **Continue Plugin** installed and configured

### Installation Steps

1. Install the Continue plugin from the VSCode Marketplace (if not already installed)
2. Install `Continue-Doc` from the VSCode Marketplace
3. Reload VSCode when prompted
4. The plugin will automatically detect your Continue installation

## Usage

### Basic Workflow

```
1. Have a conversation in Continue
2. Select messages to include in the message list (all selected by default)
3. Click the action bar → "Generate Document"
4. View the generated Markdown document (located in `.continue-doc/`)
5. If desired, click "Publish" for one-click publishing
```

### UI Components

#### Message List and Selection

Real-time reading and display of all messages in the current Continue conversation:

```
Message List (Real-time Display):
☑ [Select All]                    Message Count
─────────────────────────────────────────────────
☑ User  │ How to handle errors?
☑ AI    │ You can use try-catch to...
☐ User  │ Can you give an example?
☑ AI    │ Sure, here's an example...
☑ User  │ Thank you very much
... (more messages)
```

**Message List Features:**
- 🏷️ Each message has a **label** indicating the source (User/AI)
- ☑️ Each message has a **checkbox** supporting individual selection/deselection
- 📋 **Select All button** at the top:
  - Highlighted = All messages selected
  - Grayed out = Some messages not selected
  - Click to toggle select all/deselect all
- 📝 Default state is **all selected**
- 📏 Each message occupies only one line, truncated if content is too long

#### Action Bar

Located next to the Continue input area, providing main operation functions:

```
[ Ask ]   ▼
        ┌──────────────────┐
        │ 📝 Generate Doc  │
        │ 🚀 Publish       │
        │ ⚙️  Settings      │
        └──────────────────┘
```

**Button Functions:**
- **📝 Generate Document** - Generate a professional Markdown document from selected messages in the message list, saved to `.continue-doc/` directory
- **🚀 Publish** - Publish the generated document to Zhihu, Medium, and other platforms
- **⚙️  Settings** - Open the configuration file to edit document generation rules and publishing platform settings

### Generating Documents

1. Select the messages you want to include from the message list (all selected by default, click the Select All button to toggle)
2. Click the **📝 Generate Document** button in the action bar
3. The plugin will:
   - Collect all selected messages from the message list
   - Send structured prompts to the Continue AI model
   - Generate a beautifully formatted Markdown document
   - Save to `.continue-doc/{timestamp}.md`
4. After document generation is complete, you can view it in the file explorer or proceed to publish

### Publishing Articles

1. Generate a document (or select an existing Markdown from `.continue-doc/`)
2. Click the **🚀 Publish** button in the action bar
3. Select the target platform (Zhihu, Medium, etc.)
4. Review the content and confirm publishing

---

## Configuration

Configuration is managed through `.continue-doc/config.yaml` in the workspace root directory.

### Configuration Example

```yaml
doc:
  # Document generation rules
  rules: |
    Use concise language
    Remove off-topic discussions
    Preserve key code snippets
    Use proper Markdown formatting

  # Output directory for generated documents
  output_dir: ".continue-doc"

  # Optional: custom prompt template for document generation
  prompt_template: |
    Generate a professional technical document from the following AI conversation.
    Focus on practical insights and actionable information.

publish:
  # Default publishing platform
  target: zhihu

  # Zhihu configuration
  zhihu:
    cookie: ""
    # Add your Zhihu session cookie here for automatic publishing

  # Medium configuration (coming soon)
  medium:
    api_token: ""

  # Dev.to configuration (coming soon)
  devto:
    api_token: ""
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `doc.rules` | string | Built-in | Document generation guidelines |
| `doc.output_dir` | string | `.continue-doc` | Markdown file save location |
| `doc.prompt_template` | string | Optional | Custom AI prompt template |
| `publish.target` | string | `zhihu` | Default publishing platform |
| `publish.*.cookie` / `*.api_token` | string | Empty | Platform credentials for automatic publishing |
| `continue-doc.language` | string | `zh` | UI language: `zh` (Chinese) or `en` (English) |

---

## Project Structure

```
continue-doc/
├── README.md                 # Main README (language selection)
├── README.zh.md              # Chinese documentation
├── README.en.md              # English documentation
├── LICENSE
├── CONTRIBUTING.md           # Contribution guide
├── ROADMAP.md               # Feature roadmap
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts         # Extension main entry
│   ├── continue/
│   │   ├── continueDetector.ts    # Continue installation detection
│   │   └── continueAPI.ts         # Continue API interaction
│   ├── chat/
│   │   ├── chatHook.ts           # Webview injection and message interception
│   │   └── messageStore.ts        # Message storage and management
│   ├── doc/
│   │   ├── docGenerator.ts        # Document generation orchestration
│   │   ├── promptBuilder.ts       # Prompt template generation
│   │   └── markdownWriter.ts      # Markdown file output
│   ├── publish/
│   │   ├── publisher.ts           # Publishing orchestration
│   │   ├── zhihuPublisher.ts      # Zhihu platform integration
│   │   └── mediumPublisher.ts     # Medium platform integration (coming soon)
│   ├── config/
│   │   └── configLoader.ts        # YAML configuration management
│   └── ui/
│       └── injectUI.ts            # Webview UI injection
└── resources/
    ├── default-config.yaml
    └── default-config.en.yaml
```

---

## Activation Flow

```
┌─ VSCode Startup
│
├─ Continue-Doc Extension Activation
│
├─ Detect Continue Installation
│  ├─ If found → Continue
│  └─ If not found → Notify user
│
├─ Hook into Continue Chat Webview
│
├─ Inject UI Components
│  ├─ Message list (with Select All button)
│  ├─ Action bar (three function buttons)
│  └─ Status bar item
│
├─ Read language configuration (Chinese/English)
│
└─ Real-time monitoring and reading of current conversation messages
```

---

## Data Flow

### Message Storage

Messages are stored internally with the following structure:

```typescript
interface DocMessage {
  id: string                    // Unique identifier
  role: "user" | "assistant"    // Message source
  content: string               // Message text
  include: boolean              // Include in document?
  timestamp: number             // Unix timestamp
  model?: string                // AI model used
}
```

### Document Generation Pipeline

```
Selected messages (include=true)
    ↓
Generate prompt
    ↓
Send to Continue AI model
    ↓
Parse response
    ↓
Generate Markdown
    ↓
Write to .continue-doc/
```

---

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/continue-doc.git
cd continue-doc

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Watch mode (for development)
npm run watch
```

### Building

```bash
npm run build
```

### Packaging

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Publish to marketplace
vsce publish
```

### Testing

```bash
npm run test
```

---

## Roadmap

Continue-Doc's vision includes:

### Current Version (v0.1.0)
- ✅ Message selection checkboxes
- ✅ Document generation
- ✅ YAML configuration
- ✅ Zhihu publishing support

### Next Version (v0.2.0)
- 🔄 Automatic document title generation
- 🔄 Automatic tags/category assignment
- 🔄 Git commit integration
- 🔄 Medium platform support

### Future Versions (v0.3.0+)
- 📋 Dev.to platform support
- 🏷️ Hashnode platform support
- 📊 Analytics dashboard
- 🗂️ Document organization and version control
- 🔗 Cross-document references
- 🤖 Automatic summary generation

See [ROADMAP.md](ROADMAP.md) for detailed timeline and feature descriptions.

---

## Use Cases

### Personal AI Development Log

Create an automated system to record your AI-assisted development sessions:

```
Continue Chat
    ↓
AI Conversation (selective messages)
    ↓
Continue-Doc Processing
    ↓
Beautiful Technical Documentation
    ↓
Blog Publishing
    ↓
Knowledge Base
```

### Team Knowledge Sharing

- Collaboratively record complex solutions
- Share AI-generated insights with team members
- Build an internal knowledge base

### Content Creation

- Convert coding sessions into blog articles
- Generate tutorial content
- Create case study documents

---

## Configuration File Location

The plugin looks for configuration in the workspace root directory:

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

## Troubleshooting

### Plugin Not Detecting Continue

1. Ensure Continue is installed and enabled
2. Reload VSCode (`Ctrl+Shift+P` → "Developer: Reload Window")
3. Check the `Continue-Doc` logs in the Output panel

### Message List Not Displaying or Unable to Select

1. Ensure you are in the Continue chat interface
2. Check if the Continue Webview is fully loaded
3. The message list should always display at the top of the chat interface
4. Ensure there is an ongoing conversation

### Document Generation Failed

1. Verify that your Continue AI model is working properly (test in direct chat)
2. Check workspace permissions for the `.continue-doc/` directory
3. Check error details in the Output panel

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Code style guidelines
- Development setup
- Pull request process
- Bug reporting guidelines
- Feature request process

---

## License

This project is licensed under **MIT License** - see [LICENSE](LICENSE) for details.

---

## Support

- **Bug Reports and Issues**: [GitHub Issues](https://github.com/yourusername/continue-doc/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/continue-doc/discussions)
- **Documentation**: See [CONTRIBUTING.md](CONTRIBUTING.md) and [ROADMAP.md](ROADMAP.md)

---

## Acknowledgments

- Built on [Continue](https://continue.dev) - Open source AI code assistant
- Inspired by the need to bridge AI conversations and knowledge documentation

---

## Disclaimer

This project is independently developed and has no affiliation, endorsement, or association with the Continue project or its maintainers. It works with Continue through VSCode API and Webview injection.

---

**Built with ❤️ for developers who want to transform conversations into documentation**
