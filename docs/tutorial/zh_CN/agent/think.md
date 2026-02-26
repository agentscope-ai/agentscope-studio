# 思考模式

Friday 支持开启模型思考模式，并将模型思考内容进行展示。

![思考模式展示](assets/think_show.png)

## 如何开启思考模式

如果模型支持思考模式，Friday 通过在调用模型 API 时传入参数以开启模型思考模式。不同模型提供者所支持的参数如下：

| 模型提供者 | 参数名 | 可选值 | 说明 |
|------------|--------|--------|------|
| **OpenAI** (o1/o3) | `reasoning_effort` | `low` / `medium` / `high` | 控制思考深度，默认 medium |
| **Anthropic** (Claude 3.7+) | `thinking` | `{"type": "enabled", "budget_tokens": 1024-128000}` | 扩展思考模式，需指定 token 预算 |
| **Gemini** (3.0+) | `thinking_config` | `{"thinking_level": "low/medium/high"}` | 控制思考级别，high 激活 Deep Think |
| **Ollama** (DeepSeek R1/Qwen 3) | `think` | `true` / `false` | 开启/关闭思考模式 |
| **DashScope** (通义千问) | `enable_thinking` | `true` / `false` | 仅支持流式输出 |

## 配置示例

所有思考模式相关参数都通过 **`generate_kwargs`** 传递：

### OpenAI

![openai 参数配置](assets/openai.png)

### Anthropic (Claude)

```python
model = AnthropicChatModel(
    model_name="claude-3.7-sonnet",
    api_key="your_api_key",
    stream=True,
    generate_kwargs={
        "thinking": {
            "type": "enabled",
            "budget_tokens": 16000
        }
    }
)
```

### Google Gemini

```python
model = GeminiChatModel(
    model_name="gemini-3.1-pro-preview",
    api_key="your_api_key",
    stream=True,
    generate_kwargs={
        "thinking_config": {
            "thinking_level": "medium"  # low / medium / high
        }
    }
)
```

> **注意**: Gemini 2.5 版本使用 `thinking_budget` 参数（整数值），Gemini 3+ 版本使用 `thinking_level`

### Ollama

```python
model = OllamaChatModel(
    model_name="deepseek-r1",
    stream=True,
    generate_kwargs={
        "think": True
    }
)
```

### DashScope (阿里云)

```python
model = DashScopeChatModel(
    model_name="qwen-plus",
    api_key="your_api_key",
    stream=True,  # 思考模式必须使用流式输出
    generate_kwargs={
        "enable_thinking": True
    }
)
```

> **注意**: 非流式调用时必须设置 `enable_thinking=False`，否则会报错

## 参数选择建议

| 任务类型 | 推荐等级 | 说明 |
|---------|---------|------|
| 简单任务（翻译、分类、数据提取） | `low` | 快速响应，低成本 |
| 日常开发（代码生成、内容写作、调试） | `medium` | 平衡性能与成本 |
| 复杂推理（数学证明、科学分析、算法设计） | `high` | 深度推理，高质量输出 |

![思考模式开启](assets/think_switch.png)