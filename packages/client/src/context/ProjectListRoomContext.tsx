import {
    createContext,
    useContext,
    ReactNode,
    useEffect,
    useState,
} from 'react';
import { useSocket } from './SocketContext';
import {
    BackendResponse,
    ProjectData,
    SocketEvents,
    SocketRoomName
} from '../../../shared/src/types/trpc';
import { useMessageApi } from './MessageApiContext.tsx';

// 定义 Context 类型
interface ProjectListRoomContextType {
    projects: ProjectData[];
    deleteProjects: (projects: string[]) => void;
}

// 创建 Context
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

    const deleteProjects = (projects: string[]) => {
        if (!socket) {
            messageApi.error(
                'Server is not connected, please refresh the page.',
            );
        } else {
            socket.emit(
                SocketEvents.client.deleteProjects,
                projects,
                (response: BackendResponse) => {
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
        <ProjectListRoomContext.Provider value={{ projects, deleteProjects }}>
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
