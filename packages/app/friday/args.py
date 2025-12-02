# -*- coding: utf-8 -*-
import json
from argparse import ArgumentParser, Namespace


def json_type(value: str) -> dict:
    """Parse a JSON string into a dictionary."""
    if not value or value == "":
        return {}
    try:
        result = json.loads(value)
        if not isinstance(result, dict):
            raise ValueError("JSON must be an object/dictionary")
        return result
    except json.JSONDecodeError as e:
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
    args = parser.parse_args()
    return args
