import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio } from 'antd';
import { CircleCheckBig, Bell, Download, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs.tsx';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert.tsx';
import { Dialog, DialogContent } from '@/components/ui/dialog.tsx';
import { useI18n } from '@/context/I18Context.tsx';
import { checkForUpdates } from '@/utils/versionCheck';
import { settingsMenuItems } from '../config';
import { useSidebar } from '@/context/SidebarContext';
import { DatabaseChart } from './databasechart';
import { copyToClipboard } from '@/utils/common';
import { useMessageApi } from '@/context/MessageApiContext.tsx';

interface SettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hasUpdate: boolean;
}

const Settings = ({ open, hasUpdate, onOpenChange }: SettingsProps) => {
    const { t } = useTranslation();
    const { changeLanguage, currentLanguage } = useI18n();
    const { messageApi } = useMessageApi();
    const {
        isUpdating,
        clearDataDialogOpen,
        latestVersion,
        currentVersion,
        databaseInfo,
        confirmClearData,
        handleUpdate,
        setClearDataDialogOpen,
        setLatestVersion,
    } = useSidebar();
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

    // Update selected language when current language changes
    useEffect(() => {
        setSelectedLanguage(currentLanguage);
    }, [currentLanguage]);

    // Fetch latest version when dialog opens and there's an update
    useEffect(() => {
        if (open && hasUpdate) {
            checkForUpdates().then((updateInfo) => {
                if (updateInfo.latestVersion) {
                    setLatestVersion(updateInfo.latestVersion);
                }
            });
        }
    }, [open, hasUpdate]);

    const handleLanguageChange = () => {
        changeLanguage();
    };

    const handleClearData = () => {
        setClearDataDialogOpen(true);
    };
    const PathRender = ({ path }: { path?: string }) => {
        if (!path) return null;
        const handleCopyPath = async () => {
            const success = await copyToClipboard(path);
            if (success) messageApi.success(t('trace.message.copySuccess'));
            else messageApi.success(t('trace.message.copyFailed'));
        };
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center text-xs mr-2  whitespace-nowrap max-w-40 truncate cursor-default">
                        {path.trim().split('/').pop()}
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={handleCopyPath}
                        >
                            <CopyIcon className="size-3" />
                        </Button>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{path}</p>
                </TooltipContent>
            </Tooltip>
        );
    };
    return (
        <>
            {/* Settings Dialog */}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[800px] p-0">
                    <Tabs
                        defaultValue="language"
                        className="flex gap-6 items-start"
                    >
                        <div className="h-[-webkit-fill-available] flex flex-col border-r border-border">
                            <h3 className="text-lg font-medium p-4 -mb-2 text-left ml-2">
                                {t('common.settings')}
                            </h3>
                            <TabsList className="flex flex-col h-auto bg-transparent p-3 gap-1 w-[200px]">
                                {settingsMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <TabsTrigger
                                            key={item.value}
                                            value={item.value}
                                            className="w-full justify-start data-[state=active]:bg-muted gap-2 px-3 py-2 relative"
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{t(item.labelKey)}</span>
                                            {item.value === 'version' &&
                                                hasUpdate && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="absolute right-1 top-1 h-1.5 w-1.5 p-0"
                                                    />
                                                )}
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </div>
                        <div className="flex-1 min-h-[540px]">
                            {settingsMenuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <TabsContent
                                        key={item.value}
                                        value={item.value}
                                        className="mt-4 pr-6"
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
                                                <div className="flex flex-col bg-gray-50 rounded-lg p-4">
                                                    <div className="text-sm font-medium text-bolt-elements-textPrimary mb-2">
                                                        {t(
                                                            'settings.language-settings',
                                                        )}
                                                    </div>
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
                                                        <div className="flex gap-3">
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
                                                    <div className="flex flex-col bg-gray-50 rounded-lg p-4">
                                                        <div className="text-sm font-medium text-bolt-elements-textPrimary mb-2">
                                                            {t(
                                                                'settings.fridaydata',
                                                            )}
                                                        </div>
                                                        {databaseInfo && (
                                                            <PathRender
                                                                path={
                                                                    databaseInfo.fridayConfigPath
                                                                }
                                                            />
                                                        )}
                                                        <div className="flex items-center text-xs text-muted-foreground">
                                                            {t(
                                                                'settings.clear-data-warning',
                                                            )}
                                                            <Button
                                                                className="h-6 px-1.5 not-last:text-xs ml-2"
                                                                variant="destructive"
                                                                onClick={
                                                                    handleClearData
                                                                }
                                                            >
                                                                {t(
                                                                    'action.clear-data',
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {databaseInfo && (
                                                        <div className="flex flex-col bg-gray-50 rounded-lg p-4">
                                                            <div className="text-sm font-medium text-bolt-elements-textPrimary mb-2">
                                                                {t(
                                                                    'settings.database',
                                                                )}
                                                            </div>
                                                            {databaseInfo && (
                                                                <PathRender
                                                                    path={
                                                                        databaseInfo.path
                                                                    }
                                                                />
                                                            )}

                                                            <DatabaseChart
                                                                size={
                                                                    databaseInfo.formattedSize
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {item.value === 'version' && (
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-col bg-gray-50 rounded-lg p-4">
                                                        <div className="text-sm font-medium text-bolt-elements-textPrimary mb-2">
                                                            {t(
                                                                'settings.current-version',
                                                            )}
                                                        </div>
                                                        <div className="font-medium text-2xl">
                                                            {currentVersion}
                                                            {!hasUpdate && (
                                                                <span className="w-18 flex items-center justify-around rounded-md text-xs text-[#166534] ml-18 -mt-5 bg-[#DCFCE6]">
                                                                    <CircleCheckBig className="h-3 w-3" />
                                                                    Latest
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {hasUpdate &&
                                                        latestVersion && (
                                                            <Alert
                                                                variant="default"
                                                                className="border-none bg-[#fffbeb]"
                                                            >
                                                                <AlertTitle className="flex items-center">
                                                                    <Bell className="h-4 w-4 mr-2" />
                                                                    {t(
                                                                        'settings.new-update-available',
                                                                    )}
                                                                </AlertTitle>
                                                                <AlertDescription className="flex items-center">
                                                                    {t(
                                                                        'settings.new-version-available',
                                                                        {
                                                                            version:
                                                                                latestVersion,
                                                                        },
                                                                    )}
                                                                    <Button
                                                                        variant="default"
                                                                        onClick={() =>
                                                                            handleUpdate(
                                                                                latestVersion,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isUpdating
                                                                        }
                                                                        className="ml-2"
                                                                    >
                                                                        <Download className="mr-2 h-4 w-4" />
                                                                        {isUpdating
                                                                            ? t(
                                                                                  'action.updating',
                                                                              )
                                                                            : t(
                                                                                  'action.update-now',
                                                                              )}
                                                                    </Button>
                                                                </AlertDescription>
                                                            </Alert>
                                                        )}
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

export default memo(Settings);
