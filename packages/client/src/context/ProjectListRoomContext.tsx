import {
    createContext,
    useContext,
    ReactNode,
    useState,
    useEffect,
} from 'react';

import { ProjectData, SocketEvents, TableRequestParams } from '@shared/types';
import { trpc } from '@/api/trpc';
import { useSocket } from './SocketContext';
import { useMessageApi } from './MessageApiContext.tsx';

interface ProjectListRoomContextType {
    // table related parameters
    tableDataSource: ProjectData[];
    tableLoading: boolean;
    tableRequestParams: TableRequestParams;
    setTableRequestParams: (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => void;
    total: number;
    deleteProjects: (projects: string[]) => Promise<void>;
}

// Create context
const ProjectListRoomContext = createContext<ProjectListRoomContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
    pollingInterval?: number;
    pollingEnabled?: boolean;
}

export function ProjectListRoomContextProvider({
    children,
    pollingInterval = 5000,
    pollingEnabled = true,
}: Props) {
    const socket = useSocket();
    const { messageApi } = useMessageApi();
    const [tableRequestParams, setTableRequestParams] =
        useState<TableRequestParams>({
            pagination: {
                page: 1,
                pageSize: 50,
            },
        });

    // Use tRPC to fetch projects data
    const {
        data: response,
        isLoading,
        error,
        refetch,
    } = trpc.getProjects.useQuery(tableRequestParams, {
        refetchInterval: pollingEnabled ? pollingInterval : false,
        refetchIntervalInBackground: false,
        staleTime: 0,
    });

    useEffect(() => {
        if (error) {
            messageApi.error(`Failed to load projects: ${error.message}`);
        }
    }, [error]);

    /**
     * Update query params and reset polling timer
     *
     * @param updateFn - function to update the table request params
     */
    const handleUpdateTableRequestParams = (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => {
        // update the table request params state and reset the polling timer
        setTableRequestParams((prevParams) => {
            return updateFn(prevParams);
        });
        // Reset polling by calling refetch
        refetch();
    };

    // After deleting a project, refresh the project list
    const deleteProjects = (projects: string[]) => {
        return new Promise<void>((resolve, reject) => {
            if (!socket) {
                messageApi.error(
                    'Server is not connected, please refresh the page.',
                );
                reject(new Error('Socket not connected'));
                return;
            }

            socket.emit(
                SocketEvents.client.deleteProjects,
                projects,
                (response: { success: boolean; message?: string }) => {
                    if (response.success) {
                        messageApi.success('Projects deleted successfully.');
                        refetch(); // 删除成功后刷新数据
                        resolve();
                    } else {
                        const errorMsg =
                            response.message || 'Failed to delete projects.';
                        messageApi.error(errorMsg);
                        reject(new Error(errorMsg));
                    }
                },
            );
        });
    };

    return (
        <ProjectListRoomContext.Provider
            value={{
                tableDataSource: response?.data?.list || [],
                tableLoading: isLoading,
                total: response?.data?.total || 0,
                tableRequestParams,
                setTableRequestParams: handleUpdateTableRequestParams,
                deleteProjects,
            }}
        >
            {children}
        </ProjectListRoomContext.Provider>
    );
}

export function useProjectListRoom() {
    const context = useContext(ProjectListRoomContext);
    if (!context) {
        throw new Error(
            'useProjectListRoom must be used within a ProjectListRoomProvider',
        );
    }
    return context;
}
