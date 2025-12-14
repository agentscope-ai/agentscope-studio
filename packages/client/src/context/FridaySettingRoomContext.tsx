import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { RouterPath } from '@/pages/RouterPath.ts';
import { useSocket } from '@/context/SocketContext.tsx';
import { FridayConfig } from '@shared/config/friday.ts';
import { BackendResponse, SocketEvents } from '@shared/types';

interface FridaySettingRoomContextType {
    saveFridayConfig: (config: FridayConfig) => Promise<BackendResponse>;
    installFridayRequirements: (pythonEnv: string) => Promise<BackendResponse>;
    loadingConfig: boolean;
    fridayConfig?: FridayConfig | null;
    verifyPythonEnv: (pythonEnv: string) => Promise<BackendResponse>;
}

const FridaySettingRoomContext =
    createContext<FridaySettingRoomContextType | null>(null);

interface Props {
    children: ReactNode;
}

export function FridaySettingRoomContextProvider({ children }: Props) {
    const socket = useSocket();
    // Loading config from the backend
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [fridayConfig, setFridayConfig] = useState<FridayConfig | null>(null);

    const navigate = useNavigate();

    const location = useLocation();
    const { autoNavigateToChat } = location.state || {
        autoNavigateToChat: false,
    };

    useEffect(() => {
        if (!socket) {
            return;
        }

        // Obtain the friday config from the backend
        setLoadingConfig(true);

        // Obtain config from the backend
        socket.emit(
            SocketEvents.client.getFridayConfig,
            (response: BackendResponse) => {
                if (response.data) {
                    setFridayConfig(response.data as FridayConfig);

                    if (autoNavigateToChat) {
                        navigate(
                            `${RouterPath.FRIDAY}/${RouterPath.FRIDAY_CHAT}`,
                        );
                    }
                }
                setLoadingConfig(false);
            },
        );
        return () => {};
    }, [socket]);

    const saveFridayConfig = async (
        config: FridayConfig,
    ): Promise<BackendResponse> => {
        return new Promise((resolve, reject) => {
            if (socket) {
                socket.emit(
                    SocketEvents.client.saveFridayConfig,
                    config,
                    (response: BackendResponse) => {
                        resolve(response);
                    },
                );
            } else {
                reject(new Error('Socket is not connected'));
            }
        });
    };

    const installFridayRequirements = async (
        pythonEnv: string,
    ): Promise<BackendResponse> => {
        return new Promise((resolve, reject) => {
            if (socket) {
                socket.emit(
                    SocketEvents.client.installFridayRequirements,
                    pythonEnv,
                    (response: BackendResponse) => {
                        resolve(response);
                    },
                );
            } else {
                reject(new Error('Socket is not connected'));
            }
        });
    };

    const verifyPythonEnv = (pythonEnv: string): Promise<BackendResponse> => {
        return new Promise((resolve, reject) => {
            if (!socket) {
                reject(new Error('Missing connection to the server'));
                return;
            }
            socket.emit(
                SocketEvents.client.verifyFridayConfig,
                pythonEnv,
                (response: BackendResponse) => {
                    resolve(response);
                },
            );
        });
    };

    return (
        <FridaySettingRoomContext.Provider
            value={{
                saveFridayConfig,
                installFridayRequirements,
                loadingConfig,
                fridayConfig,
                verifyPythonEnv,
            }}
        >
            {children}
        </FridaySettingRoomContext.Provider>
    );
}

export function useFridaySettingRoom() {
    const context = useContext(FridaySettingRoomContext);
    if (!context) {
        throw new Error(
            'useFridaySettingRoom must be used within a FridaySettingRoomProvider',
        );
    }
    return context;
}
