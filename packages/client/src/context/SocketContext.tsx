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

let sharedSocket: Socket | null = null;
let socketConsumers = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function acquireSocket(): Socket {
    if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
    }

    if (!sharedSocket) {
        // The server defaults to WebSocket-only operation so horizontally
        // scaled deployments do not require sticky sessions.
        sharedSocket = io(ClientConfig.socketPath, {
            transports: ['websocket'],
        });
    }

    socketConsumers += 1;
    return sharedSocket;
}

function releaseSocket(): void {
    socketConsumers = Math.max(0, socketConsumers - 1);
    if (socketConsumers !== 0) {
        return;
    }

    // React StrictMode immediately remounts effects in development. Deferring
    // cleanup by one task lets that remount reuse the existing connection
    // instead of resetting a WebSocket while Vite is proxying it.
    closeTimer = setTimeout(() => {
        if (socketConsumers === 0) {
            sharedSocket?.close();
            sharedSocket = null;
        }
        closeTimer = null;
    }, 0);
}

export function SocketContextProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        setSocket(acquireSocket());

        return () => {
            releaseSocket();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
