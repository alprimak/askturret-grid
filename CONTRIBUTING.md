# Contributing to @askturret/grid

Thank you for your interest in contributing! This document outlines the process for contributing to the project.

## Governance Model

This project follows a **Maintainer** governance model:

### Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Maintainers** | Core team with commit access | Merge PRs, manage releases, set direction |
| **Contributors** | Anyone who submits PRs | Submit PRs, participate in discussions |
| **Community** | Users and supporters | Open issues, provide feedback, use the library |

### Current Maintainers

- [@alprimak](https://github.com/alprimak) - Project Lead

### Becoming a Maintainer

Contributors who demonstrate:
- Sustained, high-quality contributions
- Understanding of the codebase and project goals
- Constructive participation in discussions

May be invited to join as maintainers.

## How to Contribute

### Reporting Issues

- Search existing issues first to avoid duplicates
- Use issue templates when available
- Include reproduction steps, expected vs actual behavior
- For performance issues, include benchmarks if possible

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main` for your changes
3. **Make your changes** with clear, focused commits
4. **Add tests** for new functionality
5. **Run tests** locally: `npm run test:run`
6. **Submit a PR** with a clear description

### PR Guidelines

- Keep PRs focused - one feature/fix per PR
- Follow existing code style
- Update documentation if needed
- Add tests for new features
- Ensure all tests pass

### Code Style

- TypeScript with strict mode
- Prettier for formatting (run `npm run format`)
- Meaningful variable/function names
- Comments for complex logic only

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/askturret-grid.git
cd askturret-grid

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test:run

# Run demo
npm run demo
```

## Questions?

- Open a [Discussion](https://github.com/alprimak/askturret-grid/discussions) for questions
- Open an [Issue](https://github.com/alprimak/askturret-grid/issues) for bugs/features

## License

By contributing, you agree that your contributions will be licensed under the MIT License.