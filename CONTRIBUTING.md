# Contributing to Ancestree

Thank you for your interest in contributing to Ancestree! This document provides guidelines for contributors.

## Getting Started

### Prerequisites

- Node.js 20 or 22 (v24 has compatibility issues with Electron)
- npm 9+
- Git

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ancestree.git
cd ancestree

# Install dependencies
npm install

# Start development server (web only)
npm run dev

# Start Electron development mode
npm run dev:electron
```

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Node version, etc.)
   - Screenshots if applicable

### Suggesting Features

1. **Check the roadmap** and existing issues first
2. **Use the feature request template**
3. Explain the use case and why it would benefit users

### Submitting Code

1. **Fork** the repository
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the code style below
4. **Write/update tests** for your changes
5. **Run checks locally**:
   ```bash
   npm run lint
   npm run build
   npm run test
   ```
6. **Commit** with a clear message (see commit guidelines)
7. **Push** and open a Pull Request

## Code Style

### General Guidelines

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Keep functions small and focused
- Write self-documenting code; add comments only for complex logic

### Project Structure

```
src/
├── components/    # React UI components
├── hooks/         # Custom React hooks
├── scene/         # 3D scene components (Three.js)
├── services/      # Data layer and storage
├── models/        # TypeScript interfaces
└── utils/         # Utility functions
```

### Commit Messages

We use conventional commits:

```
type(scope): description

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(3d): add zoom controls to family tree view
fix(export): handle empty dates in GEDCOM export
docs: update installation instructions
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code compiles without errors (`npm run build`)
- [ ] All tests pass (`npm run test`)
- [ ] Linter passes (`npm run lint`)
- [ ] New code has appropriate test coverage
- [ ] Documentation updated if needed

### PR Description

- Clearly describe what the PR does
- Reference related issues (e.g., "Fixes #123")
- Include screenshots for UI changes
- List any breaking changes

### Review Process

1. A maintainer will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge

## Development Tips

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run specific test file
npm run test -- src/utils/gedcom.test.ts
```

### Building for Different Platforms

```bash
# Current platform
npm run pack

# Specific platforms
npm run pack:mac
npm run pack:win
npm run pack:linux
```

## Questions?

- Open a Discussion for general questions
- Check existing issues and discussions first
- Be patient — maintainers are volunteers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
