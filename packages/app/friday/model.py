# -*- coding: utf-8 -*-
"""Get the formatter and model based on the model provider."""
import re
import agentscope
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


def is_agentscope_version_ge(target_version: tuple) -> bool:
    """
    Check if the current agentscope version is greater than or equal to the target version.

    Args:
        target_version: A tuple of (major, minor, patch) version numbers.

    Returns:
        True if current version >= target version, False otherwise.

    Example:
        >>> is_agentscope_version_ge((1, 0, 9))  # Works with "1.0.9" or "1.0.9dev"
        True
    """
    version_str = agentscope.__version__
    version_match = re.match(r'^(\d+)\.(\d+)\.(\d+)', version_str)
    if version_match:
        major, minor, patch = map(int, version_match.groups())
        current_version = (major, minor, patch)
        return current_version >= target_version
    return False


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
    llmProvider: str,
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
            if is_agentscope_version_ge((1, 0, 9)):
                # For agentscope >= 1.0.9
                return OllamaChatModel(
                    model_name=modelName,
                    stream=True,
                    client_kwargs=client_kwargs,
                    generate_kwargs=generate_kwargs,
                )
            else:
                # For agentscope < 1.0.9
                return OllamaChatModel(
                    model_name=modelName,
                    stream=True,
                    **client_kwargs,
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
