import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio } from 'antd';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { useI18n } from '@/context/I18Context.tsx';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { useSocket } from '@/context/SocketContext.tsx';
import { SocketEvents } from '@shared/types/trpc';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
    const { t } = useTranslation();
    const { changeLanguage, currentLanguage } = useI18n();
    const { messageApi } = useMessageApi();
    const socket = useSocket();

    const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

    // Update selected language when current language changes
    useEffect(() => {
        setSelectedLanguage(currentLanguage);
    }, [currentLanguage]);

    const handleLanguageChange = () => {
        changeLanguage();
    };

    const handleClearData = () => {
        setClearDataDialogOpen(true);
    };

    const confirmClearData = () => {
        if (socket) {
            socket.emit(SocketEvents.client.cleanHistoryOfFridayApp);
            messageApi.success(t('message.settings.data-cleared'));
            setClearDataDialogOpen(false);
            onOpenChange(false);
        } else {
            messageApi.error(t('error.socket-not-connected'));
        }
    };

    return (
        <>
            {/* Settings Dialog */}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{t('common.settings')}</DialogTitle>
                        <DialogDescription>
                            {t('description.settings')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Tabs
                            defaultValue="language"
                            className="flex gap-4 items-start"
                        >
                            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1">
                                <TabsTrigger
                                    value="language"
                                    className="w-full justify-start data-[state=active]:bg-muted mb-1"
                                >
                                    {t('settings.language')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="data"
                                    className="w-full justify-start data-[state=active]:bg-muted"
                                >
                                    {t('settings.data-management')}
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 ml-8 min-h-[120px]">
                                <TabsContent value="language" className="mt-0">
                                    <div className="flex flex-col gap-4">
                                        <Radio.Group
                                            value={selectedLanguage}
                                            onChange={(e) => {
                                                setSelectedLanguage(
                                                    e.target.value,
                                                );
                                                if (
                                                    e.target.value !==
                                                    currentLanguage
                                                ) {
                                                    handleLanguageChange();
                                                }
                                            }}
                                        >
                                            <div className="flex flex-col gap-3">
                                                <Radio value="zh">中文</Radio>
                                                <Radio value="en">
                                                    English
                                                </Radio>
                                            </div>
                                        </Radio.Group>
                                    </div>
                                </TabsContent>

                                <TabsContent value="data" className="mt-0">
                                    <div className="flex flex-col gap-4">
                                        <Button
                                            variant="destructive"
                                            onClick={handleClearData}
                                        >
                                            {t('action.clear-data')}
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            {t('settings.clear-data-warning')}
                                        </p>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('action.cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clear Data Confirmation Dialog */}
            <Dialog
                open={clearDataDialogOpen}
                onOpenChange={setClearDataDialogOpen}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">
                            {t('settings.clear-data-confirm-title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('settings.clear-data-confirm-description')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setClearDataDialogOpen(false)}
                        >
                            {t('action.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmClearData}
                        >
                            {t('action.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default memo(SettingsDialog);
