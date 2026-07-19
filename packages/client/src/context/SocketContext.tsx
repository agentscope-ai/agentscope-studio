import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

import { ClientConfig } from '@shared/config/client';

const SocketContext = createContext<Socket | null>(null);

export function SocketContextProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // The server defaults to WebSocket-only operation so horizontally
        // scaled deployments do not require sticky sessions. Socket.IO
        // otherwise starts with polling, which the server correctly rejects.
        const newSocket = io(ClientConfig.socketPath, {
            transports: ['websocket'],
        });
        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
