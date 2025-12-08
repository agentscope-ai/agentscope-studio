# AgentScope-Friday

Friday 是一个由 AgentScope 构建的实验性本地部署智能体，旨在：

- 回答有关 AgentScope 的问题，
- 为开发者提供快速的二次开发环境，
- 集成 AgentScope 中所有可用的功能来构建更强大的智能体，
- 测试和集成 AgentScope 中的高级功能。

它的源代码也在 [AgentScope-Studio 仓库](https://github.com/agentscope-ai/agentscope-studio/tree/main/packages/app)中开源。

代码结构如下：

```
packages/
    app/
        friday/
            tool/
            utils/
                connect.py  # 用于实时操控/中断的 websocket 连接
                ...
            main.py         # Friday 智能体的入口点
            args.py         # Friday 智能体的参数解析器
            hook.py         # 用于将消息推送到 AgentScope-Studio 前端的钩子函数
            model.py        # 基于配置初始化 LLM
        requirements.txt    # Friday 智能体的依赖项
```

## 如何使用

第一次使用 Friday 时，需要在以下页面中配置智能体，包括模型、API KEY、工具和其他参数。

![Friday 配置页面](assets/friday_setting.png)

之后，就可以在聊天页面开始与 Friday 对话了。

## 已配备的功能

我们正在持续为 Friday 集成更多功能。当前和即将推出的功能包括：

- [x] 与 LLM 的基本聊天功能
- [x] 支持元工具（meta tool）
- [x] 支持实时操控/中断
- [x] 支持状态/会话管理
- [ ] 🚧 支持规划和规划可视化
- [ ] 🚧 支持长期记忆
- [ ] 支持 Anthropic 智能体技能
- [ ] 支持用户动态添加 MCP 服务器
