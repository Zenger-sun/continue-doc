# Contributing to aiDocExtra

Thank you for your interest in contributing to aiDocExtra! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- **Node.js** 18+
- **VSCode** 1.80+
- **Continue** extension installed in VSCode

### Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/aiDocExtra.git
cd aiDocExtra

# Install dependencies
npm install

# Build the project
npm run build

# Watch mode (for development)
npm run watch
```

### Running in Development

1. Open the project in VSCode
2. Press `F5` to launch the Extension Development Host
3. The extension will be active in the new VSCode window

## Code Style Guide

- Use TypeScript strict mode
- Follow the existing code formatting (2-space indentation)
- Add JSDoc comments for public methods and classes
- Use meaningful variable and function names
- Keep functions focused and small

## Project Structure

```
src/
├── extension.ts           # Main entry point
├── types.ts               # Shared type definitions
├── config/                # Configuration management
├── continue/              # Continue extension integration
├── chat/                  # Chat message handling
├── doc/                   # Document generation
├── publish/               # Publishing to platforms
└── ui/                    # Webview UI components
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Ensure the project builds: `npm run build`
5. Ensure type checking passes: `npx tsc --noEmit`
6. Commit with clear messages: `git commit -m "feat: add new feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request against `main`

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks

## Bug Reports

When reporting bugs, please include:

1. VSCode version
2. Continue extension version
3. aiDocExtra version
4. Steps to reproduce
5. Expected behavior
6. Actual behavior
7. Error logs (from Output panel → aiDocExtra)

## Feature Requests

Feature requests are welcome! Please:

1. Check existing issues/discussions first
2. Describe the use case clearly
3. Explain why this feature would be useful
4. Suggest an implementation approach if possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
