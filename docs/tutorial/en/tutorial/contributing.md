# Contributing to AgentScope-Studio

## Welcome! 🎉

Thank you for your interest in contributing to AgentScope-Studio! As an open-source project, we warmly welcome and encourage contributions from the community. Whether you're fixing bugs, adding new features, improving documentation, or sharing ideas, your contributions help make AgentScope-Studio better for everyone.

## How to Contribute

To ensure smooth collaboration and maintain the quality of the project, please follow these guidelines when contributing:

### 1. Check Existing Plans and Issues

Before starting your contribution, please review our development roadmap:

- **Check the [Projects](https://github.com/orgs/agentscope-ai/projects/3) page** and **[Issues with `roadmap` label](https://github.com/agentscope-ai/agentscope-studio/issues?q=is%3Aissue%20state%3Aopen%20label%3ARoadmap)** to see our planned development tasks.
    - **If a related issue exists** and is marked as unassigned or open:
        - Please comment on the issue to express your interest in working on it
        - This helps avoid duplicate efforts and allows us to coordinate development

    - **If no related issue exists**:
        - Please create a new issue describing your proposed changes or feature
        - Our team will respond promptly to provide feedback and guidance
        - This helps us maintain the project roadmap and coordinate community efforts

### 2. Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This leads to a more readable commit history and enables automatic changelog generation.

**Format:**

```
<type>(<scope>): <subject>
```

**Types:**

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools and libraries

**Examples:**

```bash
feat(models): add support for Claude-3 model
fix(agent): resolve memory leak in ReActAgent
docs(readme): update installation instructions
refactor(formatter): simplify message formatting logic
test(models): add unit tests for OpenAI integration
```

### 3. Code Development Guidelines

#### a. Code Formatting

Before submitting code, you must run the formatting command to ensure code quality and consistency:

**Running the formatter:**

```bash
npm run format
```

This command will automatically run:

- **Prettier**: Formats your code style
- **ESLint**: Checks and fixes code quality issues

Make sure to run this command before committing your changes to ensure all code follows the project's style guidelines.

#### b. Directory Structure

Please adhere to the following directory structure when adding or modifying files:

```
packages/
    client/src/
        assets/               # Static assets like images and icons
        components/           # React components for the frontend UI
        context/              # React Context providers for state management and data fetching
        i18n/                 # Internationalization files
        pages/                # Page components for different routes
        utils/                # Utility functions and helpers
        ...
    server/src/
        dao/                  # Data Access Objects for database interactions
        migrations/           # Database migration scripts
        models/               # Database models
        otel/                 # OpenTelemetry tracing setup
        trpc/                 # tRPC API route handlers
        utils/                # Utility functions and helpers
        database.ts           # Database connection setup
        index.ts              # Server entry point
        ...
```

#### c. Frontend Development Guidelines

When contributing to the frontend (React/TypeScript), please follow these architectural principles:

**Separation of Concerns:**

The **communication and state management** logic must be separated from the **UI components**. Specifically, data fetching and state management should be handled by context providers located in `packages/client/src/context/`, leaving the UI components focused solely on rendering and user interaction.

**Styling with Tailwind CSS:**

- All styling must use **Tailwind CSS** utility classes
- Avoid inline styles or separate CSS files for component-specific styling

```tsx
// ✅ DO: Use Tailwind classes
<div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-800">Title</h2>
  <button className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
    Action
  </button>
</div>

// ❌ DON'T: Inline styles
<div style={{ display: 'flex', padding: '16px' }}>...</div>
```

#### d. Documentation

- Update relevant documentation for new features
- Update the README.md if your changes affect user-facing functionality

## Do's and Don'ts

### ✅ DO:

- **Start small**: Begin with small, manageable contributions
- **Communicate early**: Discuss major changes before implementing them
- **Write tests**: Ensure your code is well-tested
- **Document your code**: Help others understand your contributions
- **Follow commit conventions**: Use conventional commit messages
- **Be respectful**: Follow our Code of Conduct
- **Ask questions**: If you're unsure about something, just ask!

### ❌ DON'T:

- **Don't surprise us with big pull requests**: Large, unexpected PRs are difficult to review and may not align with project goals. Always open an issue first to discuss major changes
- **Don't ignore CI failures**: Fix any issues flagged by continuous integration
- **Don't mix concerns**: Keep PRs focused on a single feature or fix
- **Don't forget to update tests**: Changes in functionality should be reflected in tests
- **Don't break existing APIs**: Maintain backward compatibility when possible, or clearly document breaking changes
- **Don't add unnecessary dependencies**: Keep the core library lightweight

## Getting Help

If you need assistance or have questions:

- 💬 Open a [Discussion](https://github.com/agentscope-ai/agentscope-studio/discussions)
- 🐛 Report bugs via [Issues](https://github.com/agentscope-ai/agentscope-studio/issues)
- 📧 Contact the maintainers via DingTalk or Discord (links in the README.md)

---

Thank you for contributing to AgentScope-Studio! Your efforts help build a better tool for the entire community. 🚀
