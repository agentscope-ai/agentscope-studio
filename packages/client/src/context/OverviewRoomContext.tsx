import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

import { useSocket } from './SocketContext.tsx';
import {
    OverviewData,
    SocketEvents,
    SocketRoomName,
} from '../../../shared/src/types/trpc';

interface OverviewRoomContextType {
    overviewData: OverviewData | null;
}

const OverviewRoomContext = createContext<OverviewRoomContextType | null>(null);

interface Props {
    children: ReactNode;
}

export function OverviewRoomContextProvider({ children }: Props) {
    const socket = useSocket();
    const [overviewData, setOverviewData] = useState<OverviewData | null>(null);

    useEffect(() => {
        if (!socket) {
            return;
        }

        // enter overview room
        socket.emit(SocketEvents.client.joinOverviewRoom);

        // handle data update
        socket.on(
            SocketEvents.server.pushOverviewData,
            (data: OverviewData) => {
                setOverviewData(data);
            },
        );

        return () => {
            socket.off(SocketEvents.server.pushOverviewData); // remove event listener
            socket.emit(
                SocketEvents.client.leaveRoom,
                SocketRoomName.OverviewRoom,
            );
        };
    }, [socket]);

    return (
        <OverviewRoomContext.Provider value={{ overviewData }}>
            {children}
        </OverviewRoomContext.Provider>
    );
}

export function useOverviewRoom() {
    const context = useContext(OverviewRoomContext);
    if (!context) {
        throw new Error(
            'useOverviewRoom must be used within a OverviewRoomProvider',
        );
    }
    return context;
}
