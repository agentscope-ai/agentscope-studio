import {
    BackendResponse,
    ContentBlocks,
    FridayReply,
    SocketEvents,
    SocketRoomName,
} from '@shared/types';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import stripAnsi from 'strip-ansi';
import { useTranslation } from 'react-i18next';

import { useSocket } from '@/context/SocketContext.tsx';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { useNotification } from '@/context/NotificationContext.tsx';

interface FridayAppRoomContextType {
    replies: FridayReply[];
    isReplying: boolean;
    handleUserInput: (
        name: string,
        role: string,
        content: ContentBlocks,
    ) => void;
    moreReplies: boolean;
    interruptReply: () => void;
    cleanCurrentHistory: () => void;
    cleaningHistory: boolean;
}

const FridayAppRoomContext = createContext<FridayAppRoomContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
}

export function FridayAppRoomContextProvider({ children }: Props) {
    const socket = useSocket();
    const [replies, setReplies] = useState<FridayReply[]>([]);
    const [isReplying, setIsReplying] = useState(false);
    const { notificationApi } = useNotification();
    const { messageApi } = useMessageApi();
    const [moreReplies, setMoreReplies] = useState(false);
    const [cleaningHistory, setCleaningHistory] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        if (!socket) {
            return;
        }

        socket.emit(
            SocketEvents.client.joinFridayAppRoom,
            (response: BackendResponse) => {
                if (!response.success) {
                    messageApi.error(response.message);
                }
            },
        );

        // Handle incoming messages
        socket.on(
            SocketEvents.server.pushReplies,
            (
                newReplies: FridayReply[],
                hasMore: boolean,
                override: boolean = false,
            ) => {
                if (override) {
                    setReplies(newReplies);
                } else {
                    setReplies((prevReplies) => {
                        const updatedReplies = [...prevReplies];
                        newReplies.forEach((newReply) => {
                            const index = updatedReplies.findIndex(
                                (reply) => reply.id === newReply.id,
                            );
                            if (index === -1) {
                                updatedReplies.push(newReply);
                            } else {
                                updatedReplies[index] = newReply;
                            }
                        });
                        return updatedReplies;
                    });
                }

                setMoreReplies(hasMore);
            },
        );

        socket.on(
            SocketEvents.server.pushReplyingState,
            (replyingState: boolean) => {
                setIsReplying(replyingState);
            },
        );

        return () => {
            socket.off(SocketEvents.server.pushReplyingState);
            socket.off(SocketEvents.server.pushReplies);
            socket.emit(
                SocketEvents.client.leaveRoom,
                SocketRoomName.FridayAppRoom,
            );
        };
    }, [socket]);

    const handleUserInput = (
        name: string,
        role: string,
        content: ContentBlocks,
    ) => {
        if (!socket) {
            messageApi.error('Socket not connected. Please refresh the page.');
        } else {
            socket.emit(
                SocketEvents.client.sendUserInputToFridayApp,
                name,
                role,
                content,
                (response: BackendResponse) => {
                    if (!response.success) {
                        notificationApi.error({
                            message: t('notification.friday-error-title'),
                            description: (
                                <pre className="w-full h-full overflow-auto text-[10px]">
                                    {stripAnsi(response.message)}
                                </pre>
                            ),
                            placement: 'topRight',
                            duration: 0,
                        });
                    }
                },
            );
        }
    };

    const interruptReply = () => {
        if (!socket) {
            messageApi.error('Socket not connected. Please refresh the page.');
        } else {
            socket.emit(SocketEvents.client.interruptReplyOfFridayApp);
        }
    };

    const cleanCurrentHistory = () => {
        if (!socket) {
            messageApi.error('Socket not connected. Please refresh the page.');
        } else {
            setCleaningHistory(true);
            socket.emit(SocketEvents.client.cleanHistoryOfFridayApp);
            setCleaningHistory(false);
        }
    };

    return (
        <FridayAppRoomContext.Provider
            value={{
                replies,
                isReplying,
                handleUserInput,
                moreReplies,
                interruptReply,
                cleanCurrentHistory,
                cleaningHistory,
            }}
        >
            {children}
        </FridayAppRoomContext.Provider>
    );
}

export function useFridayAppRoom() {
    const context = useContext(FridayAppRoomContext);
    if (!context) {
        throw new Error(
            'useFridayAppRoom must be used within a FridayAppRoomProvider',
        );
    }
    return context;
}
