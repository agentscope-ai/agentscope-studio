# -*- coding: utf-8 -*-
"""MCP (Model Context Protocol) connection manager for Friday."""
from typing import List, Dict, Any
import json5

from agentscope.mcp import HttpStatelessClient, StdIOStatefulClient
from agentscope.tool import Toolkit


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
    
    print(f"[Friday] Loaded {len(mcp_servers)} MCP server(s) from configuration")
    
    # Log and process MCP server details
    for idx, server in enumerate(mcp_servers, 1):
        server_type = server.get('type', 'local')
        server_name = server.get('name', f'Server {idx}')
        is_enabled = server.get('enabled', True)
        
        status = "✓ Enabled" if is_enabled else "✗ Disabled"
        print(f"[Friday] MCP Server {idx}: {server_name} (Type: {server_type}) [{status}]")
        
        # Skip disabled servers
        if not is_enabled:
            print(f"  - Skipped (disabled)")
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
        print(f"  - Error: No configuration provided")
        return clients
    
    try:
        # Parse JSON configuration
        config = json5.loads(config_str)
        mcp_servers_config = config.get('mcpServers', {})
        
        if not mcp_servers_config:
            print(f"  - Error: No 'mcpServers' field in configuration")
            return clients
        
        # Register each service in the mcpServers object
        for service_name, service_config in mcp_servers_config.items():
            command = service_config.get('command', '')
            args_list = service_config.get('args', [])
            env_vars = service_config.get('env', {})
            
            if not command:
                print(f"  - Error: Service '{service_name}' missing 'command' field")
                continue
            
            print(f"  - Registering service: {service_name}")
            print(f"    Command: {command}")
            print(f"    Args: {args_list}")
            if env_vars:
                print(f"    Environment variables: {len(env_vars)} vars")
            
            try:
                # Create StdIOStatefulClient for local MCP service
                client = StdIOStatefulClient(
                    name=service_name,
                    command=command,
                    args=args_list,
                    env=env_vars if env_vars else None
                )
                
                await client.connect()
                # Register the MCP client with toolkit
                await toolkit.register_mcp_client(client)
                # Add to list for later cleanup
                clients.append(client)
                print(f"    ✓ Successfully registered {service_name}")
                
            except Exception as e:
                print(f"    ✗ Error registering {service_name}: {e}")
                
    except Exception as e:
        print(f"  - Error parsing configuration: {e}")
    
    return clients


async def _connect_remote_server(
    server: Dict[str, Any],
    toolkit: Toolkit
) -> None:
    """
    Connect to a remote MCP server.
    
    Args:
        server: Server configuration
        toolkit: AgentScope toolkit
    """
    url = server.get('url', '')
    transport = server.get('transportType', 'streamable_http')
    api_key = server.get('apiKey', '')
    
    print(f"  - URL: {url}")
    print(f"  - Transport: {transport}")
    print(f"  - API Key: {api_key}")
    
    try:
        stateless_client = HttpStatelessClient(
            name=server.get('name', 'MCP Client'),
            transport=transport,
            url=url,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        await toolkit.register_mcp_client(stateless_client)
        print(f"  ✓ Successfully registered remote server")
        
    except Exception as e:
        print(f"  - Error: {e}")


async def close_mcp_connections(
    local_mcp_clients: List[StdIOStatefulClient]
) -> None:
    """
    Close local MCP connections in LIFO order (last connected, first closed).
    
    Args:
        local_mcp_clients: List of local MCP clients to close
    """
    print(f"[Friday] Closing {len(local_mcp_clients)} local MCP connection(s)...")
    
    while local_mcp_clients:
        client = local_mcp_clients.pop()  # LIFO: pop from end
        try:
            await client.close()
            print(f"  ✓ Closed connection: {client.name}")
        except Exception as e:
            print(f"  ✗ Error closing {client.name}: {e}")
