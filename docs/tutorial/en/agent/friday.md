# AgentScope-Friday

Friday is an experimental local-deployed agent built by AgentScope, aims at

- answering questions about the AgentScope,
- providing a quick secondary development environment for developers,
- integrating all available features in AgentScope to build a more powerful agent, and
- testing and integrating the advanced features in AgentScope.

Its source code is also open-sourced in the [AgentScope-Studio repository](https://github.com/agentscope-ai/agentscope-studio/tree/main/packages/app).

The code structure is as follows:

```
packages/
    app/
        friday/
            tool/
            utils/
                connect.py  # The websocket connection used for realtime steering/interruption
                ...
            main.py         # The entry point of Friday agent
            args.py         # The argument parser for Friday agent
            hook.py         # The hook functions used to push messages to AgentScope-Studio frontend
            model.py        # Initialize the LLM based on the configuration
        requirements.txt    # The dependencies for Friday agent
```

## How to Use

At the first time using Friday, you need to configure the agent in the following page, including the model, API KEY,
tools, and other parameters.

![Friday Configuration Page](assets/friday_setting.png)

After that, you can start chatting with Friday in the chat page.

## Equipped Features

We are continuously integrating more features into Friday. The current and upcoming features include:

- [x] Basic chat functionality with LLMs
- [x] Support meta tool
- [x] Support realtime steering/interruption
- [x] Support state/Session management
- [ ] 🚧 Support planning and plan visualization
- [ ] 🚧 Support long-term memory
- [ ] Support anthropic agent skill
- [ ] Support user to add MCP server dynamically
