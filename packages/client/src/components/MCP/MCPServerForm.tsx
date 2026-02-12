import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useMCP } from '@/context/MCPContext';
import { MCPServer } from '@shared/config/friday';

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

    const handleSave = () => {
        const validation = validateServer(server);
        if (!validation.valid && validation.message) {
            alert(t(validation.message) + ' ' + t('mcp.required'));
            return;
        }
        onSave();
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
                    onChange={(e) =>
                        updateServer(index, 'name', e.target.value)
                    }
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
                            onChange={() =>
                                updateServer(index, 'type', 'local')
                            }
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
                            onChange={() =>
                                updateServer(index, 'type', 'remote')
                            }
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
                            updateServer(index, 'config', e.target.value)
                        }
                        className="font-mono text-sm w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        {t('mcp.config-hint')}
                    </p>
                </div>
            ) : (
                <>
                    {/* 远程服务配置 */}
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
                            value={server.url}
                            onChange={(e) =>
                                updateServer(index, 'url', e.target.value)
                            }
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
                            value={server.transportType || 'streamable_http'}
                            onValueChange={(value) =>
                                updateServer(index, 'transportType', value)
                            }
                        >
                            <SelectTrigger
                                id={`transport-${index}`}
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="streamable_http">
                                    Streamable HTTP
                                </SelectItem>
                                <SelectItem value="sse">SSE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor={`apikey-${index}`}
                            className="text-sm font-medium"
                        >
                            {t('mcp.api-key')}
                        </Label>
                        <Input
                            id={`apikey-${index}`}
                            type="password"
                            placeholder={t('mcp.api-key-placeholder')}
                            value={server.apiKey}
                            onChange={(e) =>
                                updateServer(index, 'apiKey', e.target.value)
                            }
                            className="w-full"
                        />
                    </div>
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
        </div>
    );
};
