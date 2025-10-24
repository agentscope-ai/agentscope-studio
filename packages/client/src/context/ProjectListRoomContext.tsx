import {
    createContext,
    useContext,
    ReactNode,
    useEffect,
    useState,
} from 'react';

import { useSocket } from './SocketContext';
import {
    ProjectData,
    SocketEvents,
    SocketRoomName,
    TableData,
    ResponseBody,
    TableRequestParams,
} from '@shared/types';
import { useMessageApi } from './MessageApiContext.tsx';
import { trpcClient } from '@/api/trpc';

// 定义 Context 类型
interface ProjectListRoomContextType {
    projects: ProjectData[];
    getProjects: (
        params: TableRequestParams,
    ) => Promise<ResponseBody<TableData<ProjectData>>>;
    deleteProjects: (projects: string[]) => void;
}

// Create context
const ProjectListRoomContext = createContext<ProjectListRoomContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
}

export function ProjectListRoomContextProvider({ children }: Props) {
    const socket = useSocket();
    const [projects, setProjects] = useState<ProjectData[]>([]);
    const { messageApi } = useMessageApi();

    useEffect(() => {
        if (!socket) {
            // TODO: 通过message提示用户
            return;
        }

        // 进入 projectList room
        socket.emit(SocketEvents.client.joinProjectListRoom);

        // 处理数据更新
        socket.on(
            SocketEvents.server.pushProjects,
            (projects: ProjectData[]) => {
                setProjects(projects);
            },
        );

        // 离开时清理
        return () => {
            socket.off(SocketEvents.server.pushProjects); // 移除事件监听
            socket.emit(
                SocketEvents.client.leaveRoom,
                SocketRoomName.ProjectListRoom,
            );
        };
    }, [socket]);

    /**
     * Get paginated projects with optional sorting and filtering
     *
     * @param params - Parameters for pagination, sorting, and filtering
     * @returns Promise resolving to ResponseBody containing TableData with projects
     */
    const getProjects = async (
        params: TableRequestParams,
    ): Promise<ResponseBody<TableData<ProjectData>>> => {
        try {
            // TODO: setProjects
            return await trpcClient.getProjects.query(params);
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            messageApi.error(errorMessage);
            return {
                success: false,
                message: errorMessage,
            } as ResponseBody<TableData<ProjectData>>;
        }
    };

    // TODO: 这里为测试代码！最终需要删除
    useEffect(() => {
        getProjects({
            pagination: { page: 1, pageSize: 10 },
        }).then((res) => {
            console.log('Fetched projects:', res);
        });
    }, []);

    const deleteProjects = (projects: string[]) => {
        if (!socket) {
            messageApi.error(
                'Server is not connected, please refresh the page.',
            );
        } else {
            socket.emit(
                SocketEvents.client.deleteProjects,
                projects,
                (response: { success: boolean; message?: string }) => {
                    if (response.success) {
                        messageApi.success('Projects deleted successfully.');
                    } else {
                        messageApi.error(
                            response.message || 'Failed to delete projects.',
                        );
                    }
                },
            );
        }
    };

    return (
        <ProjectListRoomContext.Provider
            value={{ projects, getProjects, deleteProjects }}
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
