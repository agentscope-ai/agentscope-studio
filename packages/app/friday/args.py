# -*- coding: utf-8 -*-
import json5
from argparse import ArgumentParser, Namespace
from typing import List, Dict, Any


def json_type(value: str) -> dict:
    """Parse a JSON string into a dictionary."""
    if not value or value == "":
        return {}
    try:
        result = json5.loads(value)
        if not isinstance(result, dict):
            raise ValueError("JSON must be an object/dictionary")
        return result
    except ValueError as e:
        raise ValueError(f"Invalid JSON string: {e}")


def json_list_type(value: str) -> List[Dict[str, Any]]:
    """Parse a JSON string into a list of dictionaries."""
    if not value or value == "":
        return []
    try:
        result = json5.loads(value)
        if not isinstance(result, list) or not all(
            isinstance(item, dict) for item in result
        ):
            raise ValueError("JSON must be an array/list of objects")
        return result
    except ValueError as e:
        raise ValueError(f"Invalid JSON string: {e}")


def get_args() -> Namespace:
    """Get the command line arguments for the script."""
    parser = ArgumentParser(description="Arguments for friday")
    parser.add_argument(
        "--query",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--studio_url",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--llmProvider",
        choices=["dashscope", "openai", "anthropic", "gemini", "ollama"],
        required=True,
    )
    parser.add_argument(
        "--modelName",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--apiKey",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--writePermission",
        type=bool,
        required=True,
    )
    parser.add_argument(
        "--longTermMemory",
        type=bool,
        default=False,
        help="Whether to enable long-term memory and embedding support.",
    )
    parser.add_argument(
        "--embeddingProvider",
        type=str,
        choices=["dashscope", "openai", "gemini", "ollama"],
        help="Embedding provider name, e.g. openai/dashscope/gemini/ollama.",
    )
    parser.add_argument(
        "--embeddingModelName",
        type=str,
        help="Embedding model name, e.g. text-embedding-3-small or text-embedding-v1.",
    )
    parser.add_argument(
        "--embeddingApiKey",
        type=str,
        help="API key for the embedding provider; falls back to --apiKey if not set.",
    )
    parser.add_argument(
        "--embeddingKwargs",
        type=json_type,
        default={},
        help="A JSON string for extra kwargs passed to the embedding model (e.g. host, dimensions).",
    )
    parser.add_argument(
        "--saveToLocal",
        type=bool,
        default=False,
        help="Whether to save long-term memory to local disk.",
    )
    parser.add_argument(
        "--localStoragePath",
        type=str,
        default="",
        help="Local storage path for long-term memory.",
    )
    parser.add_argument(
        "--vectorStoreProvider",
        type=str,
        default="qdrant",
        help="Vector store provider for long-term memory (e.g. qdrant, chroma, faiss).",
    )
    parser.add_argument(
        "--vectorStoreKwargs",
        type=json_type,
        default={},
        help="A JSON string for extra kwargs passed to the vector store configuration.",
    )
    parser.add_argument(
        "--clientKwargs",
        type=json_type,
        default={},
        help="A JSON string representing a dictionary of keyword arguments to pass to the LLM client.",
    )
    parser.add_argument(
        "--generateKwargs",
        type=json_type,
        default={},
        help="A JSON string representing a dictionary of keyword arguments to pass to the LLM generate method.",
    )
    parser.add_argument(
        "--mcpServers",
        type=json_list_type,
        default=[],
        help="A JSON string representing a list of MCP server configurations.",
    )
    args = parser.parse_args()
    return args
