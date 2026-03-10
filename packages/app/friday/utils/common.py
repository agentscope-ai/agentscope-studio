# -*- coding: utf-8 -*-
"""Utility functions for file path management in AgentScope Studio."""
import platform
import os
import shutil

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


def clear_vector_store(storage_path: str, provider: str = "qdrant") -> None:
    """Clear the vector store data to resolve dimension mismatch issues.
    
    Args:
        storage_path: The base path where vector store data is saved
        provider: The vector store provider name (default: qdrant)
    """
    if not storage_path:
        # Use default path if not specified
        storage_path = get_local_file_path("")
    
    # Construct vector store path based on provider
    if provider.lower() == "qdrant":
        vector_store_path = os.path.join(storage_path, "qdrant_storage")
    elif provider.lower() == "chroma":
        vector_store_path = os.path.join(storage_path, "chroma_db")
    else:
        # For other providers, use a generic folder name
        vector_store_path = os.path.join(storage_path, f"{provider}_storage")
    
    # Remove the vector store directory if it exists
    if os.path.exists(vector_store_path):
        print(f"Clearing vector store at: {vector_store_path}")
        shutil.rmtree(vector_store_path)
        print("Vector store cleared successfully")

