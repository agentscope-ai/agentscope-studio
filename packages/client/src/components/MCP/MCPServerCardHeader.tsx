import React from 'react';
import { Trash2Icon, ChevronDownIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useMCP } from '@/context/MCPContext';
import { MCPServer } from '@shared/config/friday';

interface MCPServerCardHeaderProps {
    server: MCPServer;
    index: number;
    isOpen: boolean;
    onToggle: () => void;
    onDelete: () => void;
}

export const MCPServerCardHeader: React.FC<MCPServerCardHeaderProps> = ({
    server,
    index,
    isOpen,
    onToggle,
    onDelete,
}) => {
    const { t } = useTranslation();
    const { updateAndSaveEnabled } = useMCP();

    const handleEnabledChange = (checked: boolean) => {
        // 立即更新并保存开关状态
        updateAndSaveEnabled(index, checked);
    };

    return (
        <div className="flex items-center justify-between pr-2">
            <button
                type="button"
                className="flex items-center gap-3 flex-1 py-4 px-4 text-left hover:no-underline focus:outline-none"
                onClick={onToggle}
            >
                <Switch
                    checked={server.enabled !== false}
                    onCheckedChange={handleEnabledChange}
                    onClick={(e) => e.stopPropagation()}
                    className="data-[state=checked]:bg-green-500"
                />
                <span className="text-sm font-medium text-gray-800 flex-1">
                    {server.name || `${t('mcp.server')} ${index + 1}`}
                </span>
            </button>
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
                <Trash2Icon className="h-4 w-4" />
            </Button>
            <div
                className="flex items-center justify-center w-8 h-8 cursor-pointer"
                onClick={onToggle}
            >
                <ChevronDownIcon
                    className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </div>
        </div>
    );
};
