import { memo, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
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

    return (
        <div className="flex flex-col gap-4 py-4 px-6 relative">
            {servers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('mcp.empty-description')}
                    </p>
                </div>
            ) : (
                <Accordion
                    type="multiple"
                    className="space-y-3"
                    value={openItems}
                    onValueChange={setOpenItems}
                >
                    {servers.map((server, index) => {
                        const itemValue = `server-${index}`;
                        const isOpen = openItems.includes(itemValue);

                        return (
                            <AccordionItem
                                key={index}
                                value={itemValue}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                            >
                                <MCPServerCardHeader
                                    server={server}
                                    index={index}
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
                                    onDelete={() => handleDeleteClick(index)}
                                />

                                <AccordionContent className="px-4 pb-4 pt-2 bg-gray-50/30">
                                    <MCPServerForm
                                        server={server}
                                        index={index}
                                        onSave={() => handleSave(index)}
                                        onCancel={() => handleCancel(index)}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            )}

            <div className="pt-4 border-t border-gray-200">
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={addServer}
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
                className="w-[600px] sm:max-w-[600px] overflow-y-auto"
            >
                <SheetHeader>
                    <SheetTitle>{t('mcp.title')}</SheetTitle>
                    <SheetDescription>{t('mcp.description')}</SheetDescription>
                </SheetHeader>

                <MCPProvider initialServers={mcpServers} onSave={onSave}>
                    <MCPManagementSheetContent />
                </MCPProvider>
            </SheetContent>
        </Sheet>
    );
};

export default memo(MCPManagementSheet);
