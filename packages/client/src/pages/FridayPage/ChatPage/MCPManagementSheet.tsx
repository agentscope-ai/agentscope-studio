import { memo, useState, useMemo } from 'react';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
} from '@/components/ui/accordion';
import { MCPServer } from '@shared/config/friday';
import { MCPProvider, useMCP } from '@/context/MCPContext';
import { MCPServerCardHeader } from '@/components/MCP/MCPServerCardHeader';
import { MCPServerForm } from '@/components/MCP/MCPServerForm';
import { DeleteConfirmDialog } from '@/components/MCP/DeleteConfirmDialog';

interface MCPManagementSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mcpServers: MCPServer[];
    onSave: (servers: MCPServer[]) => void;
}

const MCPManagementSheetContent = memo(() => {
    const { t } = useTranslation();
    const { servers, addServer, deleteServer, saveServer, cancelServer } =
        useMCP();
    const [openItems, setOpenItems] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [serverToDelete, setServerToDelete] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleAddServer = () => {
        const newIndex = addServer();
        // 默认展开新增的卡片
        const itemValue = `server-${newIndex}`;
        setOpenItems([...openItems, itemValue]);
    };

    const handleDeleteClick = (index: number) => {
        setServerToDelete(index);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (serverToDelete !== null) {
            deleteServer(serverToDelete);
        }
        setDeleteDialogOpen(false);
        setServerToDelete(null);
    };

    const handleSave = async (index: number) => {
        const success = await saveServer(index);
        if (success) {
            // 收起卡片
            const itemValue = `server-${index}`;
            setOpenItems(openItems.filter((item) => item !== itemValue));
        }
    };

    const handleCancel = (index: number) => {
        cancelServer();
        // 收起卡片
        const itemValue = `server-${index}`;
        setOpenItems(openItems.filter((item) => item !== itemValue));
    };

    // 过滤服务器列表
    const filteredServers = useMemo(() => {
        if (!searchQuery.trim()) {
            return servers.map((server, index) => ({
                server,
                originalIndex: index,
            }));
        }
        const query = searchQuery.toLowerCase();
        return servers
            .map((server, index) => ({ server, originalIndex: index }))
            .filter(({ server }) => server.name.toLowerCase().includes(query));
    }, [servers, searchQuery]);

    return (
        <div className="flex flex-col h-full">
            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
                {/* 搜索框 - 始终显示 */}
                <div className="relative mb-4">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={t('mcp.search-placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {servers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-muted-foreground">
                            {t('mcp.empty-description')}
                        </p>
                    </div>
                ) : filteredServers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-muted-foreground">
                            {t('mcp.no-results')}
                        </p>
                    </div>
                ) : (
                    <Accordion
                        type="multiple"
                        className="space-y-3"
                        value={openItems}
                        onValueChange={setOpenItems}
                    >
                        {filteredServers.map(({ server, originalIndex }) => {
                            const itemValue = `server-${originalIndex}`;
                            const isOpen = openItems.includes(itemValue);

                            return (
                                <AccordionItem
                                    key={originalIndex}
                                    value={itemValue}
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                                >
                                    <MCPServerCardHeader
                                        server={server}
                                        index={originalIndex}
                                        isOpen={isOpen}
                                        onToggle={() => {
                                            if (isOpen) {
                                                setOpenItems(
                                                    openItems.filter(
                                                        (item) =>
                                                            item !== itemValue,
                                                    ),
                                                );
                                            } else {
                                                setOpenItems([
                                                    ...openItems,
                                                    itemValue,
                                                ]);
                                            }
                                        }}
                                        onDelete={() =>
                                            handleDeleteClick(originalIndex)
                                        }
                                    />

                                    <AccordionContent className="px-4 pb-4 pt-2 bg-gray-50/30">
                                        <MCPServerForm
                                            server={server}
                                            index={originalIndex}
                                            onSave={() =>
                                                handleSave(originalIndex)
                                            }
                                            onCancel={() =>
                                                handleCancel(originalIndex)
                                            }
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                )}
            </div>

            {/* 固定在底部的按钮 */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAddServer}
                >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {t('mcp.add-server')}
                </Button>
            </div>

            <DeleteConfirmDialog
                isOpen={deleteDialogOpen}
                serverName={
                    serverToDelete !== null
                        ? servers[serverToDelete]?.name ||
                          `${t('mcp.server')} ${serverToDelete + 1}`
                        : ''
                }
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteDialogOpen(false)}
            />
        </div>
    );
});

MCPManagementSheetContent.displayName = 'MCPManagementSheetContent';

const MCPManagementSheet = ({
    open,
    onOpenChange,
    mcpServers,
    onSave,
}: MCPManagementSheetProps) => {
    const { t } = useTranslation();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-[600px] sm:max-w-[600px] p-0 !h-screen !max-h-screen overflow-hidden"
            >
                <div className="flex flex-col h-full overflow-hidden">
                    <SheetHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                        <SheetTitle>{t('mcp.title')}</SheetTitle>
                        <SheetDescription>
                            {t('mcp.description')}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-hidden">
                        <MCPProvider
                            initialServers={mcpServers}
                            onSave={onSave}
                        >
                            <MCPManagementSheetContent />
                        </MCPProvider>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default memo(MCPManagementSheet);
