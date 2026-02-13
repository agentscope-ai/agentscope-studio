import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from 'react';
import { MCPServer } from '@shared/config/friday';
import json5 from 'json5';

interface MCPContextType {
    servers: MCPServer[];
    setServers: (servers: MCPServer[]) => void;
    addServer: () => void;
    deleteServer: (index: number) => void;
    updateServer: (
        index: number,
        field: keyof MCPServer,
        value: string | boolean | string[] | Record<string, string>,
    ) => void;
    saveServer: (index: number) => Promise<boolean>;
    cancelServer: () => void;
    validateServer: (
        server: MCPServer,
        index: number,
    ) => { valid: boolean; message?: string };
    updateAndSaveEnabled: (index: number, enabled: boolean) => void;
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

interface MCPProviderProps {
    children: React.ReactNode;
    initialServers: MCPServer[];
    onSave: (servers: MCPServer[]) => void;
}

export const MCPProvider: React.FC<MCPProviderProps> = ({
    children,
    initialServers,
    onSave,
}) => {
    const [servers, setServers] = useState<MCPServer[]>(initialServers);
    const [originalServers, setOriginalServers] =
        useState<MCPServer[]>(initialServers);

    // 当 initialServers 变化时，同步更新状态
    useEffect(() => {
        setServers(initialServers);
        setOriginalServers(initialServers);
    }, [initialServers]);

    // 添加新服务器
    const addServer = useCallback(() => {
        const newServer: MCPServer = {
            name: '',
            type: 'local',
            enabled: true,
            config: '',
        };
        setServers([...servers, newServer]);
    }, [servers]);

    // 删除服务器
    const deleteServer = useCallback(
        (index: number) => {
            const newServers = servers.filter((_, i) => i !== index);
            setServers(newServers);
            setOriginalServers(newServers);
            onSave(newServers);
        },
        [servers, onSave],
    );

    // 更新服务器字段
    const updateServer = useCallback(
        (
            index: number,
            field: keyof MCPServer,
            value: string | boolean | string[] | Record<string, string>,
        ) => {
            const newServers = [...servers];
            if (field === 'args' && typeof value === 'string') {
                newServers[index][field] = value
                    .split(' ')
                    .filter((arg) => arg.trim() !== '');
            } else {
                (newServers[index] as Record<keyof MCPServer, unknown>)[field] =
                    value;
            }
            setServers(newServers);
        },
        [servers],
    );

    // 验证服务器配置
    const validateServer = useCallback(
        (server: MCPServer, index: number) => {
            if (!server.name) {
                return { valid: false, message: 'mcp.server-name' };
            }

            // 验证服务器名称唯一性
            const duplicateNames = servers.filter(
                (s, idx) => s.name === server.name && index !== idx,
            );
            if (duplicateNames.length > 0) {
                return { valid: false, message: 'mcp.server-name-duplicate' };
            }

            if (server.type === 'local') {
                if (!server.config) {
                    return { valid: false, message: 'mcp.config' };
                }
                try {
                    json5.parse(server.config);
                } catch {
                    return { valid: false, message: 'mcp.config-invalid' };
                }
            }

            if (server.type === 'remote') {
                const mode = server.remoteConfigMode || 'simple';

                if (mode === 'simple') {
                    // 简单模式验证
                    if (!server.url) {
                        return { valid: false, message: 'mcp.url' };
                    }
                    // transportType 有默认值，不需要验证
                    // headers 为对象类型，不需要 JSON 验证
                } else {
                    // JSON 模式验证
                    if (!server.remoteConfig) {
                        return { valid: false, message: 'mcp.remote-config' };
                    }
                    try {
                        const config = json5.parse(server.remoteConfig);
                        // 验证 mcpServers 格式
                        if (!config.mcpServers) {
                            return {
                                valid: false,
                                message:
                                    'mcp.remote-config-mcpservers-required',
                            };
                        }
                        const mcpServers = config.mcpServers;
                        const firstServerKey = Object.keys(mcpServers)[0];
                        if (
                            !firstServerKey ||
                            !mcpServers[firstServerKey].url
                        ) {
                            return {
                                valid: false,
                                message: 'mcp.remote-config-url-required',
                            };
                        }
                    } catch {
                        return {
                            valid: false,
                            message: 'mcp.remote-config-invalid',
                        };
                    }
                }
            }

            return { valid: true };
        },
        [servers],
    );

    // 保存服务器
    const saveServer = useCallback(
        async (index: number): Promise<boolean> => {
            const server = servers[index];
            const validation = validateServer(server, index);

            if (!validation.valid) {
                return false;
            }

            // 根据类型清空另一类型的配置
            if (server.type === 'local') {
                // 本地模式：清空远程配置
                server.remoteConfig = '';
                server.remoteConfigMode = 'simple';
                server.url = '';
                server.transportType = 'streamablehttp';
                server.headers = {};
            } else if (server.type === 'remote') {
                // 远程模式：清空本地配置
                server.config = '';

                // 确保 remoteConfig 存在
                const mode = server.remoteConfigMode || 'simple';

                if (mode === 'simple') {
                    // 普通模式：转换为 mcpServers 格式并存储
                    const serverName = server.name || 'mcp-server';
                    const serverConfig: {
                        type: string;
                        url: string;
                        headers?: Record<string, string>;
                    } = {
                        type: server.transportType || 'streamablehttp',
                        url: server.url || '',
                    };
                    if (
                        server.headers &&
                        Object.keys(server.headers).length > 0
                    ) {
                        serverConfig.headers = server.headers;
                    }
                    const config = {
                        mcpServers: {
                            [serverName]: serverConfig,
                        },
                    };
                    server.remoteConfig = JSON.stringify(config, null, 2);
                }
            }

            onSave(servers);
            setOriginalServers(servers);
            return true;
        },
        [servers, validateServer, onSave],
    );

    // 取消编辑
    const cancelServer = useCallback(() => {
        setServers(originalServers);
    }, [originalServers]);

    // 更新并立即保存 enabled 状态
    const updateAndSaveEnabled = useCallback(
        (index: number, enabled: boolean) => {
            const newServers = [...servers];
            newServers[index].enabled = enabled;
            setServers(newServers);
            setOriginalServers(newServers);
            onSave(newServers);
        },
        [servers, onSave],
    );

    const value: MCPContextType = {
        servers,
        setServers,
        addServer,
        deleteServer,
        updateServer,
        saveServer,
        cancelServer,
        validateServer,
        updateAndSaveEnabled,
    };

    return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
};

export const useMCP = () => {
    const context = useContext(MCPContext);
    if (context === undefined) {
        throw new Error('useMCP must be used within a MCPProvider');
    }
    return context;
};
