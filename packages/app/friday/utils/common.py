# -*- coding: utf-8 -*-
"""Utility functions for file path management in AgentScope Studio."""
import platform
import os
import json

from utils.constants import NAME_STUDIO, NAME_APP


def get_local_file_path(filename: str) -> str:
    """Obtain the local file path for a given filename based on the operating system."""
    if platform.system() == "Windows":
        local_path = os.path.join(os.getenv("APPDATA"), NAME_STUDIO)
    elif platform.system() == "Darwin":
        local_path = os.path.join(
            os.getenv("HOME"), "Library", "Application Support", NAME_STUDIO
        )
    elif platform.system() == "Linux":
        local_path = os.path.join(os.getenv("HOME"), ".local", "share", NAME_STUDIO)
    else:
        raise ValueError(
            f"Unsupported operating system: {platform.system()}, expected"
            f" Windows, Darwin, or Linux."
        )

    if not os.path.exists(os.path.join(local_path, NAME_APP)):
        os.makedirs(os.path.join(local_path, NAME_APP), exist_ok=True)

    return os.path.join(local_path, NAME_APP, filename)


def save_studio_url(url: str) -> None:
    """Save the studio URL to a config file.
    
    Args:
        url: The studio URL to save
    """
    config_path = get_local_file_path(".studio_config.json")
    config = {"studio_url": url}
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f)


def get_studio_url() -> str | None:
    """Get the studio URL from the config file.
    
    Returns:
        The studio URL if exists, otherwise None
    """
    config_path = get_local_file_path(".studio_config.json")
    
    if not os.path.exists(config_path):
        return None
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
            return config.get("studio_url")
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Warning: Failed to read studio config {config_path}: {e}")
        return None
