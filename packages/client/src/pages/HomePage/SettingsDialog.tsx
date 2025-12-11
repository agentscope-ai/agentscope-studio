import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio } from 'antd';
import { Dialog, DialogContent } from '@/components/ui/dialog.tsx';
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
import { settingsMenuItems } from './config';

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
                <DialogContent className="sm:max-w-[700px]">
                    <Tabs
                        defaultValue="language"
                        className="flex gap-6 items-start"
                    >
                        <div className="h-[-webkit-fill-available] flex flex-col border-r border-border pr-4">
                            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1 w-[200px]">
                                {settingsMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <TabsTrigger
                                            key={item.value}
                                            value={item.value}
                                            className="w-full justify-start data-[state=active]:bg-muted gap-2 px-3 py-2"
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{t(item.labelKey)}</span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </div>

                        <div className="flex-1 min-h-[400px]">
                            {settingsMenuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <TabsContent
                                        key={item.value}
                                        value={item.value}
                                        className="mt-0"
                                    >
                                        <div className="flex flex-col gap-6">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-5 w-5" />
                                                    <div>
                                                        <h3 className="text-lg font-medium">
                                                            {t(item.labelKey)}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {t(item.descriptionKey)}
                                                </div>
                                            </div>
                                            {item.value === 'language' && (
                                                <div className="flex flex-col gap-4">
                                                    <Radio.Group
                                                        value={selectedLanguage}
                                                        onChange={(e) => {
                                                            setSelectedLanguage(
                                                                e.target.value,
                                                            );
                                                            if (
                                                                e.target
                                                                    .value !==
                                                                currentLanguage
                                                            ) {
                                                                handleLanguageChange();
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex flex-col gap-3">
                                                            <Radio value="zh">
                                                                中文
                                                            </Radio>
                                                            <Radio value="en">
                                                                English
                                                            </Radio>
                                                        </div>
                                                    </Radio.Group>
                                                </div>
                                            )}
                                            {item.value === 'data' && (
                                                <div className="flex flex-col gap-4">
                                                    <Button
                                                        variant="destructive"
                                                        onClick={
                                                            handleClearData
                                                        }
                                                    >
                                                        {t('action.clear-data')}
                                                    </Button>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t(
                                                            'settings.clear-data-warning',
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                            {item.value === 'version' && (
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">
                                                            {t(
                                                                'settings.current-version',
                                                            )}
                                                            :
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {__APP_VERSION__}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </div>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Clear Data Confirmation Dialog */}
            <Dialog
                open={clearDataDialogOpen}
                onOpenChange={setClearDataDialogOpen}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <div className="flex flex-col gap-4 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-destructive">
                                {t('settings.clear-data-confirm-title')}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-2">
                                {t('settings.clear-data-confirm-description')}
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
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
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default memo(SettingsDialog);
