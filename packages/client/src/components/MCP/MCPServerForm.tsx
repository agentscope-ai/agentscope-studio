import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import json5 from 'json5';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useMCP } from '@/context/MCPContext';
import { MCPServer } from '@shared/config/friday';
import { ValidationErrorDialog } from './ValidationErrorDialog';

interface MCPServerFormProps {
    server: MCPServer;
    index: number;
    onSave: () => void;
    onCancel: () => void;
}

export const MCPServerForm: React.FC<MCPServerFormProps> = ({
    server,
    index,
    onSave,
    onCancel,
}) => {
    const { t } = useTranslation();
    const { updateServer, validateServer } = useMCP();
    const [errorMessage, setErrorMessage] = useState<string>('');

    // 本地状态管理 headers 键值对
    const [headerEntries, setHeaderEntries] = useState<
        Array<{ key: string; value: string }>
    >(() => {
        if (server.headers && typeof server.headers === 'object') {
            const entries = Object.entries(server.headers).map(
                ([key, value]) => ({
                    key,
                    value,
                }),
            );
            // 如果有数据，返回数据；否则返回默认的一行
            return entries.length > 0 ? entries : [{ key: '', value: '' }];
        }
        // 默认显示一行空的输入框
        return [{ key: '', value: '' }];
    });

    // 处理模式切换
    const handleModeChange = (mode: 'simple' | 'advanced') => {
        if (mode === 'simple' && server.remoteConfigMode === 'advanced') {
            // JSON 模式切换到普通模式：解析 JSON 并回填
            if (server.remoteConfig) {
                try {
                    const config = json5.parse(server.remoteConfig);
                    const mcpServers = config.mcpServers || {};
                    const firstServerKey = Object.keys(mcpServers)[0];
                    if (firstServerKey) {
                        const serverConfig = mcpServers[firstServerKey];
                        if (serverConfig.url) {
                            updateServer(index, 'url', serverConfig.url);
                        }
                        if (serverConfig.type) {
                            updateServer(
                                index,
                                'transportType',
                                serverConfig.type,
                            );
                        }
                        if (serverConfig.headers) {
                            updateServer(
                                index,
                                'headers',
                                serverConfig.headers,
                            );
                            // 更新 headerEntries 状态
                            const entries = Object.entries(
                                serverConfig.headers,
                            ).map(([key, value]) => ({
                                key,
                                value: value as string,
                            }));
                            setHeaderEntries(
                                entries.length > 0
                                    ? entries
                                    : [{ key: '', value: '' }],
                            );
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse remote config:', e);
                }
            }
        }
        updateServer(index, 'remoteConfigMode', mode);
    };

    const handleSave = () => {
        const validation = validateServer(server, index);
        if (!validation.valid && validation.message) {
            setErrorMessage(t(validation.message) + ' ' + t('mcp.required'));
            return;
        }
        onSave();
    };

    // 添加新的 header 条目
    const addHeaderEntry = () => {
        setHeaderEntries([...headerEntries, { key: '', value: '' }]);
    };

    // 删除 header 条目
    const removeHeaderEntry = (entryIndex: number) => {
        const newEntries = headerEntries.filter((_, i) => i !== entryIndex);
        setHeaderEntries(newEntries);
        updateHeadersInServer(newEntries);
    };

    // 更新 header 条目
    const updateHeaderEntry = (
        entryIndex: number,
        field: 'key' | 'value',
        newValue: string,
    ) => {
        const newEntries = [...headerEntries];
        newEntries[entryIndex][field] = newValue;
        setHeaderEntries(newEntries);
        updateHeadersInServer(newEntries);
    };

    // 处理服务器名称修改：同步更新 JSON 中的 key
    const handleNameChange = (newName: string) => {
        updateServer(index, 'name', newName);

        // 同步更新 JSON 配置中的 key
        if (server.type === 'local' && server.config) {
            try {
                const config = json5.parse(server.config);
                if (config.mcpServers) {
                    const oldKeys = Object.keys(config.mcpServers);
                    if (oldKeys.length > 0) {
                        const oldKey = oldKeys[0];
                        const serverConfig = config.mcpServers[oldKey];
                        // 创建新的配置，替换 key
                        const newConfig = {
                            mcpServers: {
                                [newName]: serverConfig,
                            },
                        };
                        updateServer(
                            index,
                            'config',
                            JSON.stringify(newConfig, null, 2),
                        );
                    }
                }
            } catch (error) {
                // JSON 解析失败，显示警告但不阻止名称修改
                console.warn(
                    'Failed to sync name to local config JSON:',
                    error,
                );
                setErrorMessage(
                    t('mcp.json-parse-error') +
                        ': ' +
                        t('mcp.name-sync-failed'),
                );
                // 清除错误消息（3秒后）
                setTimeout(() => setErrorMessage(''), 3000);
            }
        } else if (server.type === 'remote' && server.remoteConfig) {
            try {
                const config = json5.parse(server.remoteConfig);
                if (config.mcpServers) {
                    const oldKeys = Object.keys(config.mcpServers);
                    if (oldKeys.length > 0) {
                        const oldKey = oldKeys[0];
                        const serverConfig = config.mcpServers[oldKey];
                        // 创建新的配置，替换 key
                        const newConfig = {
                            mcpServers: {
                                [newName]: serverConfig,
                            },
                        };
                        updateServer(
                            index,
                            'remoteConfig',
                            JSON.stringify(newConfig, null, 2),
                        );
                    }
                }
            } catch (error) {
                // JSON 解析失败，显示警告但不阻止名称修改
                console.warn(
                    'Failed to sync name to remote config JSON:',
                    error,
                );
                setErrorMessage(
                    t('mcp.json-parse-error') +
                        ': ' +
                        t('mcp.name-sync-failed'),
                );
                // 清除错误消息（3秒后）
                setTimeout(() => setErrorMessage(''), 3000);
            }
        }
    };

    // 处理类型切换：清空另一类型的配置
    const handleTypeChange = (newType: 'local' | 'remote') => {
        updateServer(index, 'type', newType);
        // 不再立即清空配置，等待用户保存时再清空
    };

    // 处理本地 MCP 配置改变：提取服务器名称
    const handleLocalConfigChange = (newConfig: string) => {
        updateServer(index, 'config', newConfig);

        try {
            const config = json5.parse(newConfig);
            if (config.mcpServers) {
                const keys = Object.keys(config.mcpServers);
                if (keys.length > 0) {
                    const firstKey = keys[0];
                    // 同步服务器名称
                    if (firstKey !== server.name) {
                        updateServer(index, 'name', firstKey);
                    }
                }
            }
        } catch {
            // JSON 解析失败，忽略
        }
    };

    // 处理远程 MCP 配置改变：同步所有字段到普通模式
    const handleRemoteConfigChange = (newConfig: string) => {
        updateServer(index, 'remoteConfig', newConfig);

        try {
            const config = json5.parse(newConfig);
            if (config.mcpServers) {
                const keys = Object.keys(config.mcpServers);
                if (keys.length > 0) {
                    const firstKey = keys[0];
                    const serverConfig = config.mcpServers[firstKey];

                    // 同步服务器名称
                    if (firstKey !== server.name) {
                        updateServer(index, 'name', firstKey);
                    }

                    // 同步 URL
                    if (serverConfig.url && serverConfig.url !== server.url) {
                        updateServer(index, 'url', serverConfig.url);
                    }

                    // 同步 transportType
                    if (
                        serverConfig.type &&
                        serverConfig.type !== server.transportType
                    ) {
                        updateServer(index, 'transportType', serverConfig.type);
                    }

                    // 同步 headers
                    if (serverConfig.headers) {
                        const newHeaders = serverConfig.headers;
                        const currentHeaders = server.headers || {};

                        // 判断 headers 是否有变化
                        const headersChanged =
                            JSON.stringify(newHeaders) !==
                            JSON.stringify(currentHeaders);

                        if (headersChanged) {
                            updateServer(index, 'headers', newHeaders);
                            // 更新 headerEntries 状态
                            const entries = Object.entries(newHeaders).map(
                                ([key, value]) => ({
                                    key,
                                    value: value as string,
                                }),
                            );
                            setHeaderEntries(
                                entries.length > 0
                                    ? entries
                                    : [{ key: '', value: '' }],
                            );
                        }
                    }
                }
            }
        } catch {
            // JSON 解析失败，忽略
        }
    };

    // 将 header 条目更新到 server
    const updateHeadersInServer = (
        entries: Array<{ key: string; value: string }>,
    ) => {
        const headersObj: Record<string, string> = {};
        entries.forEach(({ key, value }) => {
            if (key.trim()) {
                headersObj[key.trim()] = value;
            }
        });
        updateServer(index, 'headers', headersObj);
        // 同步到 JSON
        syncSimpleFieldsToJson('headers', headersObj);
    };

    // 普通模式字段实时同步到 JSON 模式
    const syncSimpleFieldsToJson = (
        field?: 'url' | 'transportType' | 'headers',
        value?: string | Record<string, string>,
    ) => {
        // 只有在远程模式下才同步
        if (server.type !== 'remote' || !server.remoteConfig) {
            return;
        }

        try {
            const config = json5.parse(server.remoteConfig);
            if (config.mcpServers) {
                const keys = Object.keys(config.mcpServers);
                if (keys.length > 0) {
                    const firstKey = keys[0];
                    const serverConfig = config.mcpServers[firstKey];

                    // 更新字段
                    if (field === 'url') {
                        serverConfig.url = value;
                    } else if (field === 'transportType') {
                        serverConfig.type = value;
                    } else if (field === 'headers') {
                        serverConfig.headers = value;
                    } else {
                        // 同步所有字段
                        serverConfig.url = server.url || '';
                        serverConfig.type =
                            server.transportType || 'streamablehttp';
                        if (
                            server.headers &&
                            Object.keys(server.headers).length > 0
                        ) {
                            serverConfig.headers = server.headers;
                        }
                    }

                    const newConfig = {
                        mcpServers: {
                            [firstKey]: serverConfig,
                        },
                    };
                    updateServer(
                        index,
                        'remoteConfig',
                        JSON.stringify(newConfig, null, 2),
                    );
                }
            }
        } catch {
            // JSON 解析失败，忽略
        }
    };

    return (
        <div className="space-y-4">
            {/* 服务器名称 */}
            <div className="space-y-2">
                <Label
                    htmlFor={`server-name-${index}`}
                    className="text-sm font-medium"
                >
                    {t('mcp.server-name')}{' '}
                    <span className="text-red-500">*</span>
                </Label>
                <Input
                    id={`server-name-${index}`}
                    placeholder={t('mcp.server-name-placeholder')}
                    value={server.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full"
                />
            </div>

            {/* 类型选择 */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">
                    {t('mcp.type')} <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={`type-${index}`}
                            value="local"
                            checked={server.type === 'local'}
                            onChange={() => handleTypeChange('local')}
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{t('mcp.local')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={`type-${index}`}
                            value="remote"
                            checked={server.type === 'remote'}
                            onChange={() => handleTypeChange('remote')}
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{t('mcp.remote')}</span>
                    </label>
                </div>
            </div>

            {/* 本地服务配置 */}
            {server.type === 'local' ? (
                <div className="space-y-2">
                    <Label
                        htmlFor={`config-${index}`}
                        className="text-sm font-medium"
                    >
                        {t('mcp.config')}{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        id={`config-${index}`}
                        placeholder={t('mcp.config-placeholder')}
                        rows={12}
                        value={server.config || ''}
                        onChange={(e) =>
                            handleLocalConfigChange(e.target.value)
                        }
                        className="font-mono text-sm w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        {t('mcp.config-hint')}
                    </p>
                </div>
            ) : (
                <>
                    {/* 远程配置模式选择 */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            {t('mcp.config-mode')}
                        </Label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={`config-mode-${index}`}
                                    value="simple"
                                    checked={
                                        !server.remoteConfigMode ||
                                        server.remoteConfigMode === 'simple'
                                    }
                                    onChange={() => handleModeChange('simple')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">
                                    {t('mcp.simple-mode')}
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={`config-mode-${index}`}
                                    value="advanced"
                                    checked={
                                        server.remoteConfigMode === 'advanced'
                                    }
                                    onChange={() =>
                                        handleModeChange('advanced')
                                    }
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">
                                    {t('mcp.advanced-mode')}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* 简单模式 */}
                    {(!server.remoteConfigMode ||
                        server.remoteConfigMode === 'simple') && (
                        <>
                            <div className="space-y-2">
                                <Label
                                    htmlFor={`url-${index}`}
                                    className="text-sm font-medium"
                                >
                                    {t('mcp.url')}{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id={`url-${index}`}
                                    placeholder={t('mcp.url-placeholder')}
                                    value={server.url || ''}
                                    onChange={(e) => {
                                        const newUrl = e.target.value;
                                        updateServer(index, 'url', newUrl);
                                        syncSimpleFieldsToJson('url', newUrl);
                                    }}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor={`transport-${index}`}
                                    className="text-sm font-medium"
                                >
                                    {t('mcp.transport-type')}{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={
                                        server.transportType || 'streamablehttp'
                                    }
                                    onValueChange={(value) => {
                                        updateServer(
                                            index,
                                            'transportType',
                                            value,
                                        );
                                        syncSimpleFieldsToJson(
                                            'transportType',
                                            value,
                                        );
                                    }}
                                >
                                    <SelectTrigger
                                        id={`transport-${index}`}
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="streamablehttp">
                                            Streamable HTTP
                                        </SelectItem>
                                        <SelectItem value="sse">SSE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Headers 键值对输入 */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    {t('mcp.headers')}
                                </Label>
                                <div className="space-y-2">
                                    {headerEntries.map((entry, entryIndex) => (
                                        <div
                                            key={entryIndex}
                                            className="flex gap-2 items-start"
                                        >
                                            <Input
                                                placeholder={t(
                                                    'mcp.header-key-placeholder',
                                                )}
                                                value={entry.key}
                                                onChange={(e) =>
                                                    updateHeaderEntry(
                                                        entryIndex,
                                                        'key',
                                                        e.target.value,
                                                    )
                                                }
                                                className="flex-1"
                                            />
                                            <Input
                                                placeholder={t(
                                                    'mcp.header-value-placeholder',
                                                )}
                                                value={entry.value}
                                                onChange={(e) =>
                                                    updateHeaderEntry(
                                                        entryIndex,
                                                        'value',
                                                        e.target.value,
                                                    )
                                                }
                                                className="flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    removeHeaderEntry(
                                                        entryIndex,
                                                    )
                                                }
                                                className="shrink-0"
                                            >
                                                <Trash2Icon className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addHeaderEntry}
                                        className="w-full"
                                    >
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        {t('mcp.add-header')}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 高级模式 */}
                    {server.remoteConfigMode === 'advanced' && (
                        <div className="space-y-2">
                            <Label
                                htmlFor={`remote-config-${index}`}
                                className="text-sm font-medium"
                            >
                                {t('mcp.remote-config')}{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id={`remote-config-${index}`}
                                placeholder={t('mcp.remote-config-placeholder')}
                                rows={12}
                                value={server.remoteConfig || ''}
                                onChange={(e) =>
                                    handleRemoteConfigChange(e.target.value)
                                }
                                className="font-mono text-sm w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('mcp.remote-config-hint')}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* 卡片操作按钮 */}
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                <Button variant="outline" size="sm" onClick={onCancel}>
                    {t('button.cancel')}
                </Button>
                <Button size="sm" onClick={handleSave}>
                    {t('button.save')}
                </Button>
            </div>

            {/* 错误提示弹框 */}
            <ValidationErrorDialog
                isOpen={!!errorMessage}
                errorMessage={errorMessage}
                onClose={() => setErrorMessage('')}
            />
        </div>
    );
};
