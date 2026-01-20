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
interface StudioSidebarContextType {
    clearDataDialogOpen: boolean;
    latestVersion: string;
    currentVersion: string;
    databaseInfo?: DatabaseInfoType | null;
    confirmClearData: () => void;
    setClearDataDialogOpen: (open: boolean) => void;
    setLatestVersion: (version: string) => void;
}

const StudioSidebarContext = createContext<StudioSidebarContextType | null>(
    null,
);

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
    const { data: currentVersionData } = trpc.getCurrentVersion.useQuery();
    const { data: databaseInfo } = trpc.getDataInfo.useQuery();

    const confirmClearData = () => {
        if (socket) {
            socket.emit(SocketEvents.client.cleanHistoryOfFridayApp);
            messageApi.success(t('message.settings.data-cleared'));
            setClearDataDialogOpen(false);
        } else {
            messageApi.error(t('error.socket-not-connected'));
        }
    };

    const value: StudioSidebarContextType = {
        clearDataDialogOpen,
        latestVersion,
        currentVersion: currentVersionData?.data?.version || '',
        databaseInfo: databaseInfo?.data || null,
        confirmClearData,
        setLatestVersion,
        setClearDataDialogOpen,
    };

    return (
        <StudioSidebarContext.Provider value={value}>
            {children}
        </StudioSidebarContext.Provider>
    );
};

export const useStudioSidebar = () => {
    const context = useContext(StudioSidebarContext);
    if (!context) {
        throw new Error(
            'useStudioSidebar must be used within a StudioSidebarProvider',
        );
    }
    return context;
};
