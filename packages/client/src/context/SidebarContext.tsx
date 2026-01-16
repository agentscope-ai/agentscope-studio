import { useState } from 'react';
import { createContext, ReactNode, useContext } from 'react';
import { trpc } from '@/api/trpc';
import { useTranslation } from 'react-i18next';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { useSocket } from '@/context/SocketContext.tsx';
import { SocketEvents } from '@shared/types/trpc';

interface DatabaseInfoType {
    size: number;
    formattedSize: string;
    path: string;
    fridayConfigPath: string;
    fridayHistoryPath: string;
}
interface SidebarContextType {
    isUpdating: boolean;
    clearDataDialogOpen: boolean;
    latestVersion: string;
    currentVersion: string;
    databaseInfo?: DatabaseInfoType | null;
    handleUpdate: (version: string) => Promise<void>;
    confirmClearData: () => void;
    setClearDataDialogOpen: (open: boolean) => void;
    setLatestVersion: (version: string) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const StudioSidebarProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const { t } = useTranslation();
    const { messageApi } = useMessageApi();
    const socket = useSocket();

    const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);
    const { data: currentVersionData } = trpc.getCurrentVersion.useQuery();
    const { data: databaseInfo } = trpc.getDatabaseInfo.useQuery();
    const updateStudioMutation = trpc.updateStudio.useMutation();

    const confirmClearData = () => {
        if (socket) {
            socket.emit(SocketEvents.client.cleanHistoryOfFridayApp);
            messageApi.success(t('message.settings.data-cleared'));
            setClearDataDialogOpen(false);
        } else {
            messageApi.error(t('error.socket-not-connected'));
        }
    };

    // Handle update
    const handleUpdate = async (latestVersion: string) => {
        if (!latestVersion) return;

        setIsUpdating(true);
        messageApi.loading({
            content: t('message.settings.updating', { version: latestVersion }),
            duration: 0,
            key: 'updating',
        });

        try {
            const result = await updateStudioMutation.mutateAsync({
                version: latestVersion,
            });

            messageApi.destroy('updating');
            messageApi.success({
                content: t('message.settings.update-success', {
                    version: result.version,
                }),
                duration: 5,
            });

            // Prompt the user to restart the application
            setTimeout(() => {
                messageApi.info({
                    content: t('message.settings.restart-required'),
                    duration: 10,
                });
            }, 1000);
        } catch (error) {
            messageApi.destroy('updating');
            messageApi.error({
                content: t('message.settings.update-failed', {
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                }),
                duration: 5,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const value: SidebarContextType = {
        isUpdating,
        clearDataDialogOpen,
        latestVersion,
        currentVersion: currentVersionData?.data?.version || '',
        databaseInfo: databaseInfo?.data || null,
        handleUpdate,
        confirmClearData,
        setLatestVersion,
        setClearDataDialogOpen,
    };

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error(
            'useSidebar must be used within a StudioSidebarProvider',
        );
    }
    return context;
};
