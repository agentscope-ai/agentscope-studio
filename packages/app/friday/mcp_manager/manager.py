# -*- coding: utf-8 -*-
"""MCP (Model Context Protocol) connection manager for Friday."""
from typing import List, Dict, Any
import json5
import logging

from agentscope.mcp import HttpStatelessClient, StdIOStatefulClient
from agentscope.tool import Toolkit

logger = logging.getLogger(__name__)


async def connect_mcp_servers(
    mcp_servers: List[Dict[str, Any]],
    toolkit: Toolkit
) -> List[StdIOStatefulClient]:
    """
    Connect to MCP servers and register them with the toolkit.
    
    Args:
        mcp_servers: List of MCP server configurations
        toolkit: AgentScope toolkit to register MCP clients
        
    Returns:
        List of connected local MCP clients (for cleanup)
    """
    local_mcp_clients = []

    logger.info(f"Loaded {len(mcp_servers)} MCP server(s) from configuration")

    # Log and process MCP server details
    for idx, server in enumerate(mcp_servers, 1):
        server_type = server.get('type', 'local')
        server_name = server.get('name', f'Server {idx}')
        is_enabled = server.get('enabled', True)

        status = "✓ Enabled" if is_enabled else "✗ Disabled"
        logger.info(f"MCP Server {idx}: {server_name} (Type: {server_type}) [{status}]")

        # Skip disabled servers
        if not is_enabled:
            logger.info(f"  - Skipped (disabled)")
            continue
        
        if server_type == 'local':
            # Handle local MCP servers
            clients = await _connect_local_server(server, toolkit)
            local_mcp_clients.extend(clients)
            
        elif server_type == 'remote':
            # Handle remote MCP servers
            await _connect_remote_server(server, toolkit)
    
    return local_mcp_clients


async def _connect_local_server(
    server: Dict[str, Any],
    toolkit: Toolkit
) -> List[StdIOStatefulClient]:
    """
    Connect to a local MCP server.
    
    Args:
        server: Server configuration
        toolkit: AgentScope toolkit
        
    Returns:
        List of connected clients
    """
    clients = []
    
    # Parse JSON config for local MCP servers
    config_str = server.get('config', '')
    if not config_str:
        logger.error(f"  - No configuration provided")
        return clients

    try:
        # Parse JSON configuration
        config = json5.loads(config_str)
        mcp_servers_config = config.get('mcpServers', {})

        if not mcp_servers_config:
            logger.error(f"  - No 'mcpServers' field in configuration")
            return clients

        # Register each service in the mcpServers object
        for service_name, service_config in mcp_servers_config.items():
            command = service_config.get('command', '')
            args_list = service_config.get('args')
            env_vars = service_config.get('env')
            cwd = service_config.get('cwd')
            encoding = service_config.get('encoding', 'utf-8')
            encoding_error_handler = service_config.get('encoding_error_handler', 'strict')

            if not command:
                logger.error(f"  - Service '{service_name}' missing 'command' field")
                continue

            logger.info(f"  - Registering service: {service_name}")
            logger.debug(f"    Command: {command}")
            if args_list:
                logger.debug(f"    Args: {args_list}")
            if env_vars:
                logger.debug(f"    Environment variables: {len(env_vars)} vars")
            if cwd:
                logger.debug(f"    Working directory: {cwd}")
            if encoding != 'utf-8':
                logger.debug(f"    Encoding: {encoding}")
            if encoding_error_handler != 'strict':
                logger.debug(f"    Encoding error handler: {encoding_error_handler}")

            try:
                # Create StdIOStatefulClient for local MCP service
                # Only pass parameters provided by frontend, others use default values
                client_kwargs = {
                    'name': service_name,
                    'command': command,
                }

                # Add optional parameters (only if provided by frontend)
                if args_list is not None:
                    client_kwargs['args'] = args_list
                if env_vars is not None:
                    client_kwargs['env'] = env_vars
                if cwd is not None:
                    client_kwargs['cwd'] = cwd
                if encoding != 'utf-8':
                    client_kwargs['encoding'] = encoding
                if encoding_error_handler != 'strict':
                    client_kwargs['encoding_error_handler'] = encoding_error_handler

                client = StdIOStatefulClient(**client_kwargs)

                await client.connect()
                # Register the MCP client with toolkit
                await toolkit.register_mcp_client(client)
                # Add to list for later cleanup
                clients.append(client)
                logger.info(f"    ✓ Successfully registered {service_name}")

            except Exception as e:
                logger.error(f"    ✗ Error registering {service_name}: {e}")

    except Exception as e:
        logger.error(f"  - Error parsing configuration: {e}")
    
    return clients


async def _connect_remote_server(
    server: Dict[str, Any],
    toolkit: Toolkit
) -> None:
    """
    Connect to a remote MCP server.
    Reads from remoteConfig field which stores mcpServers format JSON.

    Args:
        server: Server configuration
        toolkit: AgentScope toolkit
    """
    logger.info(f"\n[Remote MCP] {server.get('name', 'Unknown')}")

    # Read remoteConfig field
    remote_config = server.get('remoteConfig', '')
    if not remote_config:
        logger.error(f"  - Remote config is empty")
        return

    try:
        config = json5.loads(remote_config)

        # Parse mcpServers nested format
        if 'mcpServers' not in config:
            logger.error(f"  - Invalid config format, mcpServers field required")
            return

        mcp_servers = config['mcpServers']
        # Each remoteConfig should contain exactly one server
        # Get the first server configuration (expected to be the only one)
        if len(mcp_servers) == 0:
            logger.error(f"  - No server found in mcpServers")
            return

        if len(mcp_servers) > 1:
            logger.warning(f"  - Multiple servers found in mcpServers, only the first will be used")
            logger.warning(f"    Found servers: {list(mcp_servers.keys())}")

        first_server_key = next(iter(mcp_servers.keys()))

        server_config = mcp_servers[first_server_key]
        url = server_config.get('url', '')
        transport_type = server_config.get('type', 'streamablehttp')
        # Convert to backend required format: streamablehttp -> streamable_http
        transport = 'streamable_http' if transport_type == 'streamablehttp' else transport_type
        headers = server_config.get('headers')
        timeout = server_config.get('timeout')
        sse_read_timeout = server_config.get('sse_read_timeout')
        client_kwargs = server_config.get('client_kwargs', {})

        if not url:
            logger.error(f"  - URL is required")
            return

        logger.info(f"  - Server Key: {first_server_key}")
        logger.info(f"  - URL: {url}")
        logger.info(f"  - Transport: {transport}")
        if headers:
            logger.debug(f"  - Headers: {headers}")
        if timeout:
            logger.debug(f"  - Timeout: {timeout}s")
        if sse_read_timeout:
            logger.debug(f"  - SSE Read Timeout: {sse_read_timeout}s")
        if client_kwargs:
            logger.debug(f"  - Additional client kwargs: {client_kwargs}")

    except Exception as e:
        logger.error(f"  - Error parsing remote config: {e}")
        return

    try:
        # Create HttpStatelessClient for remote MCP service
        # Only pass parameters provided by frontend, others use default values
        client_params = {
            'name': server.get('name', 'MCP Client'),
            'transport': transport,
            'url': url,
        }

        # Add optional parameters (only if provided by frontend)
        if headers is not None:
            client_params['headers'] = headers
        if timeout is not None:
            client_params['timeout'] = timeout
        if sse_read_timeout is not None:
            client_params['sse_read_timeout'] = sse_read_timeout

        # Merge additional client_kwargs
        if client_kwargs:
            client_params.update(client_kwargs)

        stateless_client = HttpStatelessClient(**client_params)

        await toolkit.register_mcp_client(stateless_client)
        logger.info(f"  ✓ Successfully registered remote server")

    except Exception as e:
        logger.error(f"  - {e}")


async def close_mcp_connections(
    local_mcp_clients: List[StdIOStatefulClient]
) -> None:
    """
    Close local MCP connections in LIFO order (last connected, first closed).

    Args:
        local_mcp_clients: List of local MCP clients to close
    """
    logger.info(f"Closing {len(local_mcp_clients)} local MCP connection(s)...")

    while local_mcp_clients:
        client = local_mcp_clients.pop()  # LIFO: pop from end
        try:
            await client.close()
            logger.info(f"  ✓ Closed connection: {client.name}")
        except Exception as e:
            logger.error(f"  ✗ Error closing {client.name}: {e}")
