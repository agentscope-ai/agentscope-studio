# Runtime Chat

## 概述

Runtime Chat 是 AgentScope Studio 内置的聊天服务，基于 [`@agentscope-ai/chat`](https://www.npmjs.com/package/@agentscope-ai/chat) 组件（来自 [AgentScope Runtime](https://github.com/agentscope-ai/agentscope-runtime)）构建。它通过流式 API 连接 AgentScope Runtime 后端，让您可以直接在 Studio 中与已部署的智能体进行交互。

## 功能特点

- **多会话支持**：创建、切换和管理多个聊天会话，通过浏览器 localStorage 持久化存储
- **可配置主题**：自定义色彩、深色模式和标题栏外观
- **欢迎页面**：设置问候语、描述文字、头像和快捷提示词
- **API 配置**：连接任何 AgentScope Runtime 端点，支持自定义 Base URL 和 Token
- **设置面板**：通过标题栏 ⚙️ 图标实时修改配置
- **SSE 流式响应**：实时流式对话

## 使用示例

### 第一步：启动 AgentScope Runtime 后端

```bash
pip install agentscope-runtime
```

创建 `app.py`（详见 [AgentScope Runtime 快速开始](https://github.com/agentscope-ai/agentscope-runtime#-quick-start)）：

```python
import os

from agentscope.agent import ReActAgent
from agentscope.model import DashScopeChatModel
from agentscope.formatter import DashScopeChatFormatter
from agentscope.tool import Toolkit, execute_python_code
from agentscope.pipeline import stream_printing_messages
from agentscope.memory import InMemoryMemory

from agentscope_runtime.engine import AgentApp
from agentscope_runtime.engine.schemas.agent_schemas import AgentRequest
from agentscope_runtime.engine.services.agent_state import InMemoryStateService

agent_app = AgentApp(
    app_name="MyAssistant",
    app_description="A helpful assistant",
)


@agent_app.init
async def init_func(self):
    self.state_service = InMemoryStateService()
    await self.state_service.start()


@agent_app.shutdown
async def shutdown_func(self):
    await self.state_service.stop()


@agent_app.query(framework="agentscope")
async def query_func(self, msgs, request: AgentRequest = None, **kwargs):
    session_id = request.session_id
    user_id = request.user_id

    state = await self.state_service.export_state(
        session_id=session_id, user_id=user_id,
    )

    toolkit = Toolkit()
    toolkit.register_tool_function(execute_python_code)

    agent = ReActAgent(
        name="MyAssistant",
        model=DashScopeChatModel(
            "qwen-turbo",
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            stream=True,
        ),
        sys_prompt="You're a helpful assistant.",
        toolkit=toolkit,
        memory=InMemoryMemory(),
        formatter=DashScopeChatFormatter(),
    )
    agent.set_console_output_enabled(enabled=False)

    if state:
        agent.load_state_dict(state)

    async for msg, last in stream_printing_messages(
        agents=[agent], coroutine_task=agent(msgs),
    ):
        yield msg, last

    state = agent.state_dict()
    await self.state_service.save_state(
        user_id=user_id, session_id=session_id, state=state,
    )


agent_app.run(host="127.0.0.1", port=8090)
```

```bash
python app.py
# 服务在 http://localhost:8090/process 上监听
```

### 第二步：在 AgentScope Studio 中连接

1. 在侧边栏中导航至 **服务 > Runtime Chat**
2. 点击右上角的 **⚙️ 设置** 图标
3. 设置 **baseURL** 为 `http://localhost:8090/process`，按需填写 **token**
4. 点击 **Save** 保存，创建新会话即可开始对话！

## 配置说明

点击 **⚙️ 设置** 图标打开配置面板。

### 主题 (Theme)

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `colorPrimary` | 主题主色调 | `#615CED` |
| `colorBgBase` | 背景颜色 | — |
| `colorTextBase` | 文字颜色 | — |
| `darkMode` | 启用深色模式 | `false` |
| `leftHeader.logo` | Logo 图片 URL | AgentScope 图标 |
| `leftHeader.title` | 标题栏文字 | `Runtime Chat` |

### 发送器 (Sender)

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `disclaimer` | 输入框下方的免责声明文字 | AI 免责声明 |
| `maxLength` | 最大输入字符数 | `10000` |

### 欢迎页 (Welcome)

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `greeting` | 欢迎问候语 | `Hello, how can I help you today?` |
| `description` | 欢迎描述文字 | `I am a helpful assistant...` |
| `avatar` | 欢迎页头像 URL | AgentScope 图标 |
| `prompts` | 快捷提示词建议 | `Hello`、`How are you?`、`What can you do?` |

### API 配置

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `baseURL` | AgentScope Runtime API 的 Base URL | — |
| `token` | API 认证 Token | — |
