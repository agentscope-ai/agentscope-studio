import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    CircleCheckBig,
    Bell,
    ExternalLink,
    CopyIcon,
    CopyCheckIcon,
    Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { SecondaryButton } from '@/components/buttons/ASButton';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { Dialog, DialogContent } from '@/components/ui/dialog.tsx';
import { useI18n } from '@/context/I18Context.tsx';
import { checkForUpdates } from '@/utils/versionCheck';
import { settingsMenuItems } from '../config';
import { useSidebar } from '@/context/SidebarContext';
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
        clearDataDialogOpen,
        latestVersion,
        currentVersion,
        databaseInfo,
        confirmClearData,
        setClearDataDialogOpen,
        setLatestVersion,
    } = useSidebar();
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
    const [copyedPath, setCopyedPath] = useState('');
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
        setCopyedPath('');
    }, [open, hasUpdate]);

    const handleLanguageChange = () => {
        changeLanguage();
    };

    const handleClearData = () => {
        setClearDataDialogOpen(true);
    };
    const goNewVersion = () => {
        window.open(
            'https://www.npmjs.com/package/@agentscope/studio',
            '_blank',
        );
    };
    const PathRender = ({ path, title }: { path?: string; title: string }) => {
        if (!path) return null;
        const handleCopyPath = async () => {
            const success = await copyToClipboard(path);
            if (success) {
                setCopyedPath(path);
                messageApi.success(t('trace.message.copySuccess'));
            } else messageApi.success(t('trace.message.copyFailed'));
        };
        return (
            <div className="text-xs py-1 w-[100%]">
                <div className="mr-2 mb-1 text-gray-500">{title}</div>
                <div className="flex items-center">
                    <div
                        className="flex items-center border border-gray-300 rounded-md h-8 px-2 w-[calc(100%-40px)]
                            hover:border-muted-foreground hover:shadow-sm hover:ring hover:ring-muted-foreground hover:ring-opacity-30
                            transition-all duration-200 ease-in-out"
                    >
                        <div className="text-xs truncate">{path}</div>
                    </div>
                    <div className="ml-4" onClick={handleCopyPath}>
                        {path === copyedPath ? (
                            <CopyCheckIcon className="h-3 w-3 text-emerald-500" />
                        ) : (
                            <CopyIcon className="h-3 w-3" />
                        )}
                    </div>
                </div>
            </div>
        );
    };
    return (
        <>
            {/* Settings Dialog */}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[820px] p-0">
                    <Tabs
                        defaultValue="language"
                        className="flex gap-6 items-start"
                    >
                        <div className="h-[-webkit-fill-available] flex flex-col border-r border-border">
                            <h3 className="text-sm p-4 -mb-2 text-left ml-2">
                                {t('common.settings')}
                            </h3>
                            <TabsList className="flex flex-col h-auto bg-transparent p-2 w-[200px]">
                                {settingsMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <TabsTrigger
                                            key={item.value}
                                            value={item.value}
                                            className="w-full justify-start data-[state=active]:bg-muted gap-2 px-2 py-2 relative hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <Icon className="size-4" />
                                            <span>{t(item.labelKey)}</span>
                                            {item.value === 'version' &&
                                                hasUpdate && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 p-0"
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
                                                    <Icon className="h-4 w-4" />
                                                    <div>
                                                        <h3 className="text-sm">
                                                            {t(item.labelKey)}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {t(item.descriptionKey)}
                                                </div>
                                            </div>
                                            {item.value === 'language' && (
                                                <div className="flex flex-col bg-muted/50 rounded-lg p-4">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">
                                                            {t(
                                                                'settings.language-settings',
                                                            )}
                                                        </span>
                                                        <ToggleGroup
                                                            type="single"
                                                            value={
                                                                selectedLanguage
                                                            }
                                                            onValueChange={(
                                                                value,
                                                            ) => {
                                                                if (
                                                                    value &&
                                                                    value !==
                                                                        currentLanguage
                                                                ) {
                                                                    setSelectedLanguage(
                                                                        value,
                                                                    );
                                                                    handleLanguageChange();
                                                                }
                                                            }}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            <ToggleGroupItem
                                                                value="zh"
                                                                className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                            >
                                                                中文
                                                            </ToggleGroupItem>
                                                            <ToggleGroupItem
                                                                value="en"
                                                                className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                            >
                                                                English
                                                            </ToggleGroupItem>
                                                        </ToggleGroup>
                                                    </div>
                                                </div>
                                            )}
                                            {item.value === 'data' && (
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-col bg-muted/50 rounded-lg p-4">
                                                        <div className="flex justify-between items-center text-sm mb-2">
                                                            <span className="font-medium">
                                                                Friday
                                                            </span>
                                                            <SecondaryButton
                                                                tooltip={t(
                                                                    'action.clear-data',
                                                                )}
                                                                icon={
                                                                    <Trash
                                                                        width={
                                                                            13
                                                                        }
                                                                        height={
                                                                            13
                                                                        }
                                                                    />
                                                                }
                                                                variant="dashed"
                                                                onClick={
                                                                    handleClearData
                                                                }
                                                            >
                                                                {t(
                                                                    'action.clear-data',
                                                                )}
                                                            </SecondaryButton>
                                                        </div>
                                                        <PathRender
                                                            path={
                                                                databaseInfo?.fridayConfigPath
                                                            }
                                                            title={t(
                                                                'settings.config-path',
                                                            )}
                                                        />
                                                        <PathRender
                                                            path={
                                                                databaseInfo?.fridayHistoryPath
                                                            }
                                                            title={t(
                                                                'settings.friday-history',
                                                            )}
                                                        />
                                                    </div>

                                                    {databaseInfo && (
                                                        <div className="flex flex-col bg-muted/50 rounded-lg p-4">
                                                            <div className="flex justify-between items-center text-sm mb-2">
                                                                <span className="font-medium">
                                                                    {t(
                                                                        'settings.database',
                                                                    )}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <span className="text-muted-foreground">
                                                                        {t(
                                                                            'settings.database-usage',
                                                                        )}
                                                                    </span>
                                                                    <span className="font-medium">
                                                                        {
                                                                            databaseInfo.formattedSize
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <PathRender
                                                                path={
                                                                    databaseInfo?.path
                                                                }
                                                                title={t(
                                                                    'settings.path',
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {item.value === 'version' && (
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-col bg-muted/50 rounded-lg p-4">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-muted-foreground">
                                                                {t(
                                                                    'settings.current-version',
                                                                )}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">
                                                                    {
                                                                        currentVersion
                                                                    }
                                                                </span>
                                                                {!hasUpdate && (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-emerald-700 bg-emerald-100">
                                                                        <CircleCheckBig className="h-3 w-3" />
                                                                        Latest
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {hasUpdate &&
                                                        latestVersion && (
                                                            <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Bell className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                                    <div>
                                                                        <div className="text-sm text-amber-800">
                                                                            {t(
                                                                                'settings.new-update-available',
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-amber-600 mt-0.5">
                                                                            {t(
                                                                                'settings.new-version-available',
                                                                                {
                                                                                    version:
                                                                                        latestVersion,
                                                                                },
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <SecondaryButton
                                                                    tooltip={t(
                                                                        'action.view-update',
                                                                    )}
                                                                    icon={
                                                                        <ExternalLink
                                                                            width={
                                                                                13
                                                                            }
                                                                            height={
                                                                                13
                                                                            }
                                                                        />
                                                                    }
                                                                    variant="dashed"
                                                                    onClick={
                                                                        goNewVersion
                                                                    }
                                                                >
                                                                    {t(
                                                                        'action.view-update',
                                                                    )}
                                                                </SecondaryButton>
                                                            </div>
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
