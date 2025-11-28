# -*- coding: utf-8 -*-
"""Get the formatter and model based on the model provider."""
from agentscope.formatter import (
    DashScopeChatFormatter,
    OpenAIChatFormatter,
    FormatterBase,
    OllamaChatFormatter,
    GeminiChatFormatter,
    AnthropicChatFormatter,
)
from agentscope.model import (
    ChatModelBase,
    DashScopeChatModel,
    OpenAIChatModel,
    OllamaChatModel,
    GeminiChatModel,
    AnthropicChatModel,
)


def get_formatter(llmProvider: str) -> FormatterBase:
    """Get the formatter based on the model provider."""
    match llmProvider.lower():
        case "dashscope":
            return DashScopeChatFormatter()
        case "openai":
            return OpenAIChatFormatter()
        case "ollama":
            return OllamaChatFormatter()
        case "gemini":
            return GeminiChatFormatter()
        case "anthropic":
            return AnthropicChatFormatter()
        case _:
            raise ValueError(
                f"Unsupported model provider: {llmProvider}. "
            )

def get_model(
    llmProvider:str,
    modelName: str,
    apiKey: str,
    client_kwargs: dict = {},
    generate_kwargs: dict = {},
) -> ChatModelBase:
    """Get the model instance based on the input arguments."""

    match llmProvider.lower():
        case "dashscope":
            return DashScopeChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=True,
                # client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case "openai":
            return OpenAIChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=True,
                client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case "ollama":
            return OllamaChatModel(
                model_name=modelName,
                stream=True,
                host=baseUrl,
                client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case "gemini":
            return GeminiChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=True,
                client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case "anthropic":
            return AnthropicChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=True,
                client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case _:
            raise ValueError(
                f"Unsupported model provider: {llmProvider}. "
            )
