import {
    createContext,
    useContext,
    ReactNode,
    useEffect,
    useState,
} from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents, RunData, ResponseBody } from '@shared/types';
import { useMessageApi } from './MessageApiContext.tsx';

// 定义 Context 类型
interface ProjectRoomContextType {
    project: string;
    runs: RunData[]; // 项目下的运行列表

    deleteRuns: (runIds: string[]) => void;
}

// 创建 Context
const ProjectRoomContext = createContext<ProjectRoomContextType | null>(null);

interface Props {
    project: string;
    children: ReactNode;
}

export function ProjectRoomContextProvider({ project, children }: Props) {
    const socket = useSocket();
    const roomName = `project-${project}`;
    const [runs, setRuns] = useState<RunData[]>([]);
    const { messageApi } = useMessageApi();

    useEffect(() => {
        if (!socket) {
            // TODO: 通过message提示用户
            return;
        }

        // 加入项目房间
        socket.emit(
            SocketEvents.client.joinProjectRoom,
            project,
            (response: ResponseBody) => {
                if (!response.success) {
                    messageApi.error(response.message);
                }
            },
        );

        // 监听项目相关的更新
        socket.on(SocketEvents.server.pushRunsData, (runs: RunData[]) => {
            setRuns(runs);
        });

        return () => {
            // 清理事件监听
            socket.off(SocketEvents.server.pushRunsData);
            socket.emit(SocketEvents.client.leaveRoom, roomName);
        };
    }, [socket, project, roomName]);

    const deleteRuns = (runIds: string[]) => {
        if (!socket) {
            messageApi.error(
                'Server is not connected, please refresh the page.',
            );
        } else {
            socket.emit(
                SocketEvents.client.deleteRuns,
                runIds,
                (response: { success: boolean; message?: string }) => {
                    if (response.success) {
                        messageApi.success('Runs deleted successfully.');
                    } else {
                        messageApi.error(
                            response.message || 'Failed to delete runs.',
                        );
                    }
                },
            );
            // The server will push the new data to the client
        }
    };

    return (
        <ProjectRoomContext.Provider value={{ project, runs, deleteRuns }}>
            {children}
        </ProjectRoomContext.Provider>
    );
}

// 提供使用 Context 的 hook
export function useProjectRoom() {
    const context = useContext(ProjectRoomContext);
    if (!context) {
        throw new Error(
            'useProjectRoom must be used within a ProjectRoomProvider',
        );
    }
    return context;
}
