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
from agentscope.embedding import (
    EmbeddingModelBase,
    EmbeddingUsage,
    EmbeddingResponse,
    DashScopeTextEmbedding,
    DashScopeMultiModalEmbedding,
    OpenAITextEmbedding,
    GeminiTextEmbedding,
    OllamaTextEmbedding,
    EmbeddingCacheBase,
    FileEmbeddingCache,
)


def is_agentscope_version_ge(target_version: tuple) -> bool:
    """Check whether the current agentscope version is >= target_version."""
    version_str = agentscope.__version__
    version_match = re.match(r"^(\d+)\.(\d+)\.(\d+)", version_str)
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
    stream: bool = True,
) -> ChatModelBase:
    """Get the chat model instance based on the input arguments.
    
    Args:
        llmProvider: The model provider (dashscope, openai, ollama, gemini, anthropic)
        modelName: The model name
        apiKey: The API key for authentication
        client_kwargs: Additional client configuration parameters
        generate_kwargs: Additional generation parameters
        stream: Whether to enable streaming mode (default: True)
    
    Returns:
        ChatModelBase: The instantiated chat model
    """

    match llmProvider.lower():
        case "dashscope":
            return DashScopeChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=stream,
                generate_kwargs=generate_kwargs,
            )
        case "openai":
            return OpenAIChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=stream,
                client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case "ollama":
            if is_agentscope_version_ge((1, 0, 9)):
                # For agentscope >= 1.0.9
                return OllamaChatModel(
                    model_name=modelName,
                    stream=stream,
                    client_kwargs=client_kwargs,
                    generate_kwargs=generate_kwargs,
                )
            else:
                # For agentscope < 1.0.9
                return OllamaChatModel(
                    model_name=modelName,
                    stream=stream,
                    **client_kwargs,
                )
        case "gemini":
            return GeminiChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=stream,
                client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case "anthropic":
            return AnthropicChatModel(
                model_name=modelName,
                api_key=apiKey,
                stream=stream,
                client_kwargs=client_kwargs,
                generate_kwargs=generate_kwargs,
            )
        case _:
            raise ValueError(
                f"Unsupported model provider: {llmProvider}. "
            )


def get_embedding_model(
    embeddingProvider: str,
    embeddingModelName: str,
    embeddingApiKey: str,
    embedding_kwargs: dict = {},
) -> EmbeddingModelBase:
    """Get the embedding model instance based on the input arguments.

    The signature follows the corresponding classes in ``agentscope.embedding``.
    ``embedding_kwargs`` can be used to pass extra provider-specific keyword
    arguments, such as ``host`` or ``dimensions``.
    """

    match embeddingProvider.lower():
        case "dashscope":
            # DashScopeTextEmbedding(model_name: str, api_key: str, **kwargs)
            return DashScopeTextEmbedding(
                model_name=embeddingModelName,
                api_key=embeddingApiKey,
                **embedding_kwargs,
            )
        case "openai":
            # OpenAITextEmbedding(model_name: str, api_key: str, **kwargs)
            return OpenAITextEmbedding(
                model_name=embeddingModelName,
                api_key=embeddingApiKey,
                **embedding_kwargs,
            )
        case "gemini":
            # GeminiTextEmbedding(model_name: str, api_key: str, **kwargs)
            return GeminiTextEmbedding(
                model_name=embeddingModelName,
                api_key=embeddingApiKey,
                **embedding_kwargs,
            )
        case "ollama":
            # OllamaTextEmbedding(model_name: str, **kwargs)
            return OllamaTextEmbedding(
                model_name=embeddingModelName,
                **embedding_kwargs,
            )
        case _:
            raise ValueError(
                f"Unsupported embedding provider: {embeddingProvider}. "
            )
