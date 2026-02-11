# Runtime Chat

## Overview

Runtime Chat is an integrated chat service within AgentScope Studio, powered by the [`@agentscope-ai/chat`](https://www.npmjs.com/package/@agentscope-ai/chat) component from [AgentScope Runtime](https://github.com/agentscope-ai/agentscope-runtime). It connects to an AgentScope Runtime backend via streaming API, allowing you to interact with deployed agents directly from the Studio.

## Features

- **Multi-Session Support**: Create, switch, and manage multiple chat sessions, persisted in browser localStorage
- **Configurable Theme**: Customize colors, dark mode, and header appearance
- **Welcome Screen**: Set greeting, description, avatar, and prompt suggestions
- **API Configuration**: Connect to any AgentScope Runtime endpoint with configurable base URL and token
- **Settings Panel**: Real-time configuration via the ⚙️ icon in the header
- **SSE Streaming**: Real-time streaming responses

## Usage Example

### Step 1: Start an AgentScope Runtime Backend

```bash
pip install agentscope-runtime
```

Create `app.py` (see [AgentScope Runtime Quick Start](https://github.com/agentscope-ai/agentscope-runtime#-quick-start) for details):

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
# Server listens on http://localhost:8090/process
```

### Step 2: Connect from AgentScope Studio

1. Navigate to **Services > Runtime Chat** in the sidebar
2. Click the **⚙️ Settings** icon in the top-right corner
3. Set **baseURL** to `http://localhost:8090/process` and **token** if needed
4. Click **Save**, then create a new session and start chatting!

## Configuration

Click the **⚙️ Settings** icon to open the configuration panel.

### Theme

| Option | Description | Default |
|--------|-------------|---------|
| `colorPrimary` | Primary theme color | `#615CED` |
| `colorBgBase` | Background color | — |
| `colorTextBase` | Text color | — |
| `darkMode` | Enable dark mode | `false` |
| `leftHeader.logo` | Logo image URL | AgentScope logo |
| `leftHeader.title` | Header title text | `Runtime Chat` |

### Sender

| Option | Description | Default |
|--------|-------------|---------|
| `disclaimer` | Disclaimer text below input | AI disclaimer text |
| `maxLength` | Maximum input character length | `10000` |

### Welcome

| Option | Description | Default |
|--------|-------------|---------|
| `greeting` | Welcome greeting text | `Hello, how can I help you today?` |
| `description` | Welcome description | `I am a helpful assistant...` |
| `avatar` | Welcome avatar URL | AgentScope logo |
| `prompts` | Quick-start prompt suggestions | `Hello`, `How are you?`, `What can you do?` |

### API

| Option | Description | Default |
|--------|-------------|---------|
| `baseURL` | AgentScope Runtime API base URL | — |
| `token` | API authentication token | — |
