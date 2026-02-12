import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from 'react';
import { MCPServer } from '@shared/config/friday';

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
    validateServer: (server: MCPServer) => { valid: boolean; message?: string };
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
    const validateServer = useCallback((server: MCPServer) => {
        if (!server.name) {
            return { valid: false, message: 'mcp.server-name' };
        }

        if (server.type === 'local') {
            if (!server.config) {
                return { valid: false, message: 'mcp.config' };
            }
            try {
                JSON.parse(server.config);
            } catch {
                return { valid: false, message: 'mcp.config-invalid' };
            }
        }

        if (server.type === 'remote' && !server.url) {
            return { valid: false, message: 'mcp.url' };
        }

        return { valid: true };
    }, []);

    // 保存服务器
    const saveServer = useCallback(
        async (index: number): Promise<boolean> => {
            const server = servers[index];
            const validation = validateServer(server);

            if (!validation.valid) {
                return false;
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
