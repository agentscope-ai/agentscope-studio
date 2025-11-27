# 概览

## _什么是 AgentScope-Studio？_

AgentScope-Studio 是一个专为 [AgentScope ](https://github.com/agentscope-ai/agentscope) 开发服务的，本地部署的可视化组件。
我们希望它可以帮助开发者以一种**透明**、**简单**且**有趣**的方式来开发、调试和评测基于 AgentScope 搭建的智能体应用程序。

## _为什么选择 AgentScope-Studio？_

AgentScope-Studio 提供：

- 项目管理和 Chatbot 风格的可视化
- 基于 OpenTelemetry 的追踪可视化
- 面向评估的分析和可视化
- 内置智能体（AgentScope-Friday）用于快速二次开发

## _AgentScope-Studio 是如何工作的？_

AgentScope-Studio 构建于：

- 前端：Typescript、React、Vite、TailwindCSS
- 通信：基于 HTTP 的 TRPC、websocket
- 后端：Node.js、Express
- 数据库：TypeORM with SQLite

> 💡 **提示**：我们目前正在将代码风格迁移到 TailwindCSS。

AgentScope-Studio 作为 `@agentscope/studio` 包发布在 NPM 注册表上，采用 Apache-2.0 许可证。

## _如何贡献？_

AgentScope-Studio 是一个开源项目，我们欢迎来自社区的贡献。请参阅我们的[贡献指南]()了解更多关于如何参与的详细信息。

## _顺便说一句_

虽然我们可能不是前端和后端开发的专业人士，但我们致力于为使用 AgentScope 的开发者打造最透明、最简单、最有趣的用户体验。
非常感谢任何建议和贡献！
