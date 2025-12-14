# 项目管理

AgentScope-Studio 提供了强大的项目管理功能，帮助你可视化地管理你的 AgentScope 项目。通过 Projects 和 Runs 的组织结构，你可以清晰地分离和管理你的可观测性数据。

## 概念

在 AgentScope-Studio 中，一个**项目（Projects）**包含多个**运行实例（Runs）**。具体而言：

- **项目（Projects）**：用于组织和隔离不同的 AI 应用或实验
- **运行实例（Runs）**：项目内的单次执行实例，类似于会话（Session），跟踪一次完整的运行过程

## 项目管理

AgentScope-Studio 的项目页面（Projects）提供了运行项目的总览和管理功能：

![项目管理](assets/project-management.png)

点击项目列表中的任意项目，可以进入运行管理界面，查看该项目下的所有运行实例。

## 运行实例管理

### 运行可视化

运行实例中包含了完整的执行跟踪和状态监控功能。
在（左）侧栏中，按照时间顺序堆叠了该项目下所有的运行实例。点击任意运行实例，可以在 Chatbot 风格的 UI 中查看该运行的完整交互历史和状态。
除此之外，右侧的面板还提供了该运行的详细信息和统计数据。

![运行管理](assets/run-management.png)

在 AgentScope 中，智能体一次回复（即调用一次 `reply` 函数）对应会产生多条消息（`Msg` 对象），这些消息的可能是用来引导大模型的提示消息
（角色为 "user"），也可能是工具运行结果（角色为 "system"）。

因此，在可视化的层面，我们在消息的层次之上引入了**回复（reply）**的概念，
用于将多条消息组织在一起，形成一个完整的智能体回复单元。
在运行可视化界面中，开发者可以选择按照 `replyId` 或 `msg.id` 来查看消息。

### 用户输入托管

当 AgentScope 项目连接到 Studio 后，Studio 会自动托管用户的输入，并通过 WebSocket 实时推送到 Python 的智能体应用中。并且 Studio 支持
在一个运行实例中包含多个不同的 `UserAgent` 实例，从而实现多用户协同交互的场景。

### 运行追踪可视化

AgentScope-Studio 在右侧面板中同时提供了基于 OpenTelemetry 的追踪数据可视化功能，帮助开发者详细了解每一次运行过程中智能体对象、
大模型调用、工具使用等各个单元的详细输入输出。

## API 协议

AgentScope-Studio 中项目管理相关的 API 协议如下：

> **注意**: 关于 Trace 数据格式、推送机制和集成示例的详细信息，请参考 [Trace 文档](tracing.md)。

| 功能         | 接口路径                 | 方法 | 用途                       |
| ------------ | ------------------------ | ---- | -------------------------- |
| 注册运行实例 | `/trpc/registerRun`      | POST | 注册新的 Agent 运行实例    |
| 推送消息     | `/trpc/pushMessage`      | POST | 发送 Agent 消息到 Web 界面 |
| 请求用户输入 | `/trpc/requestUserInput` | POST | Agent 主动请求用户输入     |

### 1. 注册运行协议

在 Studio 上注册运行实例。

| 字段        | 类型   | 必需 | 说明                                          |
| ----------- | ------ | ---- | --------------------------------------------- |
| `id`        | string | ✓    | 运行实例的 ID                                 |
| `project`   | string | ✓    | 项目名称                                      |
| `name`      | string | ✓    | 运行实例名称                                  |
| `timestamp` | string | ✓    | ISO 时间戳                                    |
| `pid`       | number | ✓    | 进程 ID                                       |
| `status`    | enum   | ✓    | 运行状态（如 "running"、"finished"、"error"） |

### 2. 消息推送协议

将 `Msg` 对象发送到 Studio 进行显示。

| 字段            | 类型          | 必需 | 说明                                               |
| --------------- | ------------- | ---- | -------------------------------------------------- |
| `runId`         | string        | ✓    | 运行实例 ID                                        |
| `replyId`       | string        | ✓    | 回复消息 ID                                        |
| `replyName`     | string        | ✓    | 回复者的名字                                       |
| `replyRole`     | string        | ✓    | 回复者的角色（如 "assistant"、"user"）             |
| `msg.id`        | string        | ✓    | 消息 ID                                            |
| `msg.name`      | string        | ✓    | 消息发送者名字                                     |
| `msg.role`      | string        | ✓    | 消息发送者角色（如 "assistant"、"user"、"system"） |
| `msg.content`   | ContentBlocks | ✓    | 消息内容                                           |
| `msg.metadata`  | object        | ✓    | 消息元数据                                         |
| `msg.timestamp` | string        | ✓    | 消息 ISO 时间戳                                    |

**ContentBlocks 格式：**

`ContentBlocks` 是一个内容块数组。每个块都有一个 `type` 字段，用于确定其结构。支持的内容块类型包括：

- **文本块** (`type: "text"`): 包含 `text` 字段，存储消息内容
- **思考块** (`type: "thinking"`): 包含 `thinking` 字段，存储推理内容
- **图片块** (`type: "image"`): 包含 `source` 字段，可以是 base64 数据或 URL
- **音频块** (`type: "audio"`): 包含 `source` 字段，可以是 base64 数据或 URL
- **视频块** (`type: "video"`): 包含 `source` 字段，可以是 base64 数据或 URL
- **工具使用块** (`type: "tool_use"`): 包含 `id`、`name` 和 `input` 字段
- **工具结果块** (`type: "tool_result"`): 包含 `id`、`name` 和 `output` 字段

对于媒体块（图片、音频、视频），`source` 可以是：

- **Base64 源**: `{ type: "base64", media_type: string, data: string }`
- **URL 源**: `{ type: "url", url: string }`

**示例：**

```python
content_blocks = [
    {
        "type": "text",
        "text": "来自你的智能体的问候！"
    },
    {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        }
    },
    {
        "type": "tool_use",
        "id": "tool-123",
        "name": "search",
        "input": {"query": "weather"}
    }
]
```

### 3. 用户输入协议

要求用户在 Studio 的前端页面上以某个角色/名字/身份进行输入。

**请求字段：**

| 字段              | 类型   | 必需 | 说明                         |
| ----------------- | ------ | ---- | ---------------------------- |
| `requestId`       | string | ✓    | 用户输入请求 ID              |
| `runId`           | string | ✓    | 运行实例 ID                  |
| `agentId`         | string | ✓    | Agent ID                     |
| `agentName`       | string | ✓    | Agent 名称                   |
| `structuredInput` | object |      | 结构化输入表单的 JSON Schema |

用户输入的具体实现逻辑涉及 Python 应用、Studio 服务器和前端之间的多方交互。以下是详细的交互流程：

![用户输入流程](assets/user-input-flow.png)

1. **Agent 发送请求**：Agent 通过 POST 请求向 Studio 服务器发送用户输入请求
2. **服务器保存请求**：Studio 服务器将请求保存到数据库，并通过 WebSocket 推送到 Web 客户端
3. **用户输入**：用户在 Web 界面中输入内容
4. **客户端发送**：Web 客户端通过 WebSocket 将用户输入发送回服务器
5. **服务器转发**：服务器验证并转发用户输入到 Agent 的 WebSocket 连接
6. **Agent 接收**：Agent 通过 WebSocket 接收用户输入并继续执行

## 集成示例

以下示例展示如何集成项目管理的相关协议：

```python
from agentscope.message import Msg
from datetime import datetime
from queue import Queue
from threading import Event
from typing import Any, List

import requests
import shortuuid
import socketio


class StudioClient:
    """用于自定义 Agent 集成的完整 Studio 客户端"""

    def __init__(self, studio_url: str):
        self.studio_url = studio_url
        self.sio = socketio.Client()
        self.input_queues = {}
        self.input_events = {}

    def register_run(
        self,
        id: str,
        project: str,
        name: str,
        timestamp: str,
        pid: int,
        status: str,
    ) -> None:
        """注册运行实例"""
        response = requests.post(
            f"{self.studio_url}/trpc/registerRun",
            json={
                "id": id,
                "project": project,
                "name": name,
                "timestamp": timestamp,
                "pid": pid,
                "status": status,
            },
            timeout=10
        )
        response.raise_for_status()

        # 连接 WebSocket 以接收用户输入
        self.sio.connect(
            self.studio_url,
            namespaces=["/python"],
            auth={"run_id": id}
        )

        # 监听用户输入
        @self.sio.on("forwardUserInput", namespace="/python")
        def receive_user_input(
                request_id: str,
                blocks_input: List[dict],
                structured_input: dict[str, Any],
        ) -> None:
            if request_id in self.input_queues:
                self.input_queues[request_id].put({
                    "blocks_input": blocks_input,
                    "structured_input": structured_input,
                })
                self.input_events[request_id].set()

    def push_message(
        self,
        run_id: str,
        reply_id: str,
        reply_name: str,
        reply_role: str,
        msg: Msg
    ) -> None:
        """推送消息到 Studio"""
        payload = {
            "runId": run_id,
            "replyId": reply_id,
            "replyName": reply_name,
            "replyRole": reply_role,
            "msg": msg.to_dict()
        }

        response = requests.post(
            f"{self.studio_url}/trpc/pushMessage",
            json=payload,
            timeout=10
        )
        response.raise_for_status()

    def request_user_input(self, run_id: str, agent_id: str, agent_name: str,
                           structured_input=None):
        """从 Studio 请求用户输入"""

        request_id = shortuuid.uuid()
        self.input_queues[request_id] = Queue()
        self.input_events[request_id] = Event()

        try:
            response = requests.post(
                f"{self.studio_url}/trpc/requestUserInput",
                json={
                    "requestId": request_id,
                    "runId": run_id,
                    "agentId": agent_id,
                    "agentName": agent_name,
                    "structuredInput": structured_input
                },
                timeout=10
            )
            response.raise_for_status()

            # 等待用户响应
            self.input_events[request_id].wait(timeout=300)
            if request_id in self.input_queues:
                return self.input_queues[request_id].get()
            else:
                raise TimeoutError("User input timeout")
        finally:
            # 清理
            if request_id in self.input_queues:
                del self.input_queues[request_id]
            if request_id in self.input_events:
                del self.input_events[request_id]


# 使用示例
client = StudioClient("http://localhost:3000")

# 注册运行
client.register_run(
    id="run-12345",
    project="my-project",
    name="custom-agent",
    timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    pid=12345,
    status="running"
)

# 创建一条提示消息
msg = Msg("my-agent", "<system-hint>你现在应该...</system-hint>", "user")
# 推送消息
client.push_message(
    run_id="run-12345",
    reply_id="reply-1",
    reply_name="my-agent",
    reply_role="assistant",
    msg=msg
)

# 请求用户输入
user_response = client.request_user_input(
    run_id="run-12345",
    agent_id="agent-1",
    agent_name="My Agent"
)
print(f"User responded: {user_response}")
```
