# 为 AgentScope-Studio 做贡献

## 欢迎！🎉

感谢对 AgentScope-Studio 的关注！作为一个开源项目，我们热烈欢迎并鼓励来自社区的贡献。无论是修复 bug、添加新功能、改进文档，还是分享想法，你的贡献都能让 AgentScope-Studio 变得更好！

## 如何贡献

为了确保顺畅的协作并保持项目质量，请在贡献时遵循以下指南：

### 1. 检查现有开发计划和 Issue

在开始贡献之前，请查看我们的开发路线图：

- **查看 [Projects](https://github.com/orgs/agentscope-ai/projects/3) 页面**和**[带有 `roadmap` 标签的 Issues](https://github.com/agentscope-ai/agentscope-studio/issues?q=is%3Aissue%20state%3Aopen%20label%3ARoadmap)**，了解我们计划中的开发任务。
    - **如果存在相关 issue** 且标记为未分配或开放状态：
        - 请在 issue 下评论表达你对该任务的兴趣
        - 这有助于避免重复工作，让我们能够协调开发进度

    - **如果不存在相关 issue**：
        - 请创建一个新的 issue，描述你建议的更改或功能
        - 我们的团队会及时回复并提供反馈和指导
        - 这有助于我们维护项目路线图并协调社区工作

### 2. 提交信息格式

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。这有助于生成更易读的提交历史，并支持自动生成变更日志。

**格式：**

```
<type>(<scope>): <subject>
```

**类型：**

- `feat:` 新功能
- `fix:` bug 修复
- `docs:` 仅文档更改
- `style:` 不影响代码含义的更改（空格、格式化等）
- `refactor:` 既不修复 bug 也不添加功能的代码更改
- `perf:` 提升性能的代码更改
- `test:` 添加缺失的测试或修正现有测试
- `chore:` 构建过程或辅助工具和库的更改

**示例：**

```bash
feat(models): add support for Claude-3 model
fix(agent): resolve memory leak in ReActAgent
docs(readme): update installation instructions
refactor(formatter): simplify message formatting logic
test(models): add unit tests for OpenAI integration
```

### 3. 代码开发指南

#### a. 代码格式化

在提交代码之前，必须运行格式化命令以确保代码质量和一致性：

**运行格式化工具：**

```bash
npm run format
```

此命令将自动运行：

- **Prettier**：格式化代码风格
- **ESLint**：检查并修复代码质量问题

请确保在提交更改前运行此命令，以保证所有代码符合项目的风格规范。

#### b. 目录结构

在添加或修改文件时，请遵循以下目录结构：

```
packages/
    client/src/
        assets/               # 静态资源，如图片和图标
        components/           # 前端 UI 的 React 组件
        context/              # 用于状态管理和数据获取的 React Context 提供者
        i18n/                 # 国际化文件
        pages/                # 不同路由的页面组件
        utils/                # 工具函数和辅助功能
        ...
    server/src/
        dao/                  # 数据访问对象，用于数据库交互
        migrations/           # 数据库迁移脚本
        models/               # 数据库模型
        otel/                 # OpenTelemetry 追踪设置
        trpc/                 # tRPC API 路由处理器
        utils/                # 工具函数和辅助功能
        database.ts           # 数据库连接设置
        index.ts              # 服务器入口点
        ...
```

#### c. 前端开发指南

在为前端（React/TypeScript）做贡献时，请遵循以下架构原则：

**关注点分离：**

**通信和状态管理**逻辑与 **UI 组件**分离。具体来说，数据获取和状态管理应由位于 `packages/client/src/context/` 的 context 提供者处理，使 UI 组件专注于渲染和用户交互。

**使用 Tailwind CSS 进行样式设计：**

- 所有样式必须使用 **Tailwind CSS** 工具类
- 避免使用内联样式或单独的 CSS 文件进行组件特定的样式设计

```tsx
// ✅ 推荐：使用 Tailwind 类
<div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-800">标题</h2>
  <button className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
    操作
  </button>
</div>

// ❌ 不推荐：内联样式
<div style={{ display: 'flex', padding: '16px' }}>...</div>
```

#### d. 文档

- 为新功能更新相关文档
- 如果你的更改影响面向用户的功能，请更新 README.md

## 该做和不该做的事

### ✅ 该做：

- **从小做起**：从小型、可管理的贡献开始
- **及早沟通**：在实施重大更改之前先讨论
- **编写测试**：确保你的代码经过充分测试
- **为代码编写文档**：帮助他人理解你的贡献
- **遵循提交规范**：使用规范化的提交信息
- **保持尊重**：遵循我们的行为准则
- **提出问题**：如果对某些事情不确定，尽管提问！

### ❌ 不该做：

- **不要突然提交大型 Pull Request**：大型的、意外的 PR 难以审查，可能与项目目标不符。重大更改请务必先开启 issue 讨论
- **不要忽略 CI 失败**：修复持续集成标记的任何问题
- **不要混杂关注点**：保持 PR 专注于单一功能或修复
- **不要忘记更新测试**：功能的更改应该在测试中体现
- **不要破坏现有 API**：尽可能保持向后兼容性，或明确记录破坏性更改
- **不要添加不必要的依赖**：保持核心库的轻量级

## 获取帮助

如果需要帮助或有疑问：

- 💬 开启 [Discussion](https://github.com/agentscope-ai/agentscope-studio/discussions)
- 🐛 通过 [Issues](https://github.com/agentscope-ai/agentscope-studio/issues) 报告 bug
- 📧 通过钉钉或 Discord 联系维护者（链接见 README.md）

---

感谢为 AgentScope-Studio 做出贡献！你的努力帮助我们为整个社区打造更好的工具。🚀
