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
    InputRequestData,
    ModelInvocationData,
    Reply,
    RunData,
    SocketEvents,
} from '../../../shared/src/types/trpc';

import {
    TraceData,
    SpanData,
    TraceStatus,
} from '../../../shared/src/types/trace';
import { useParams } from 'react-router-dom';
import { ProjectNotFoundPage } from '../pages/DefaultPage';
import { ContentBlocks } from '../../../shared/src/types/messageForm';
import { useMessageApi } from './MessageApiContext.tsx';
import { getTimeDifference } from '../../../shared/src/utils/timeUtils';

interface RunRoomContextType {
    replies: Reply[];
    trace: TraceData | null;
    spans: SpanData[];
    inputRequests: InputRequestData[];
    runData: RunData | null;
    runId: string;
    modelInvocationData: ModelInvocationData | null;
    sendUserInputToServer: (
        requestId: string,
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
}

const RunRoomContext = createContext<RunRoomContextType | null>(null);

interface Props {
    children: ReactNode;
}

const calculateTraceData = (spans: SpanData[]) => {
    if (!spans.length) return null;

    const startTimes = spans.map((span) => new Date(span.startTime).getTime());
    const endTimes = spans.map((span) => new Date(span.endTime).getTime());

    const earliestStart = new Date(Math.min(...startTimes)).toISOString();
    const latestEnd = new Date(Math.max(...endTimes)).toISOString();

    const status = spans.some((span) => span.status === TraceStatus.ERROR)
        ? TraceStatus.ERROR
        : TraceStatus.OK;

    const data = {
        startTime: earliestStart,
        endTime: latestEnd,
        duration: getTimeDifference(earliestStart, latestEnd),
        status: status,
    };
    return data;
};

export function RunRoomContextProvider({ children }: Props) {
    const { runId } = useParams<{ runId: string }>();
    const { messageApi } = useMessageApi();

    const socket = useSocket();
    const roomName = `run-${runId}`;
    const [replies, setReplies] = useState<Reply[]>([]);

    const [spans, setSpans] = useState<SpanData[]>([]);
    const [trace, setTrace] = useState<TraceData | null>(null);

    const [inputRequests, setInputRequests] = useState<InputRequestData[]>([]);
    const [runData, setRunData] = useState<RunData | null>(null);
    const [modelInvocationData, setModelInvocationData] =
        useState<ModelInvocationData | null>(null);

    useEffect(() => {
        if (spans.length > 0) {
            const traceData = calculateTraceData(spans);

            if (traceData) {
                setTrace({
                    startTime: traceData.startTime,
                    endTime: traceData.endTime,
                    latencyMs: traceData.duration,
                    status: traceData.status,
                    runId: runId,
                } as TraceData);
            }
        }
    }, [spans]);

    useEffect(() => {
        if (!socket) {
            // TODO: 通过message提示用户
            return;
        }

        // Clear the data first
        setInputRequests([]);
        setReplies([]);
        setSpans([]);
        setRunData(null);
        setModelInvocationData(null);

        socket.emit(
            SocketEvents.client.joinRunRoom,
            runId,
            (response: BackendResponse) => {
                if (!response.success) {
                    messageApi.error(response.message);
                }
            },
        );

        // New messages
        socket.on(SocketEvents.server.pushMessages, (newReplies: Reply[]) => {
            setReplies((prev) => {
                const updatedReplies: Reply[] = [...prev];
                newReplies.forEach((newReply) => {
                    const index = updatedReplies.findIndex(
                        (reply) => reply.replyId === newReply.replyId,
                    );

                    if (index === -1) {
                        // New reply, add it
                        updatedReplies.push(newReply);
                    } else {
                        // Existing reply, update messages
                        updatedReplies[index] = newReply;
                    }
                });
                return updatedReplies;
            });
        });

        socket.on(SocketEvents.server.pushSpans, (newSpans: SpanData[]) => {
            setSpans((prevSpans) => {
                const updatedSpans = [...prevSpans];
                newSpans.forEach((newSpan) => {
                    const index = updatedSpans.findIndex(
                        (span) => span.id === newSpan.id,
                    );
                    if (index === -1) {
                        updatedSpans.push(newSpan);
                    } else {
                        updatedSpans[index] = newSpan;
                    }
                });

                return updatedSpans.sort((a, b) => {
                    return a.startTime.localeCompare(b.startTime);
                });
            });
        });

        socket.on(
            SocketEvents.server.pushModelInvocationData,
            (newModelInvocationData: ModelInvocationData) => {
                setModelInvocationData(newModelInvocationData);
            },
        );

        // New user input requests
        socket.on(
            SocketEvents.server.pushInputRequests,
            (newInputRequests: InputRequestData[]) => {
                setInputRequests((prevRequests) => {
                    return [...prevRequests, ...newInputRequests];
                });
            },
        );

        // Run data updates
        socket.on(SocketEvents.server.pushRunData, (newRunData: RunData) => {
            setRunData(newRunData);
        });

        // Clear input requests
        socket.on(SocketEvents.server.clearInputRequests, () => {
            setInputRequests([]);
        });

        return () => {
            if (socket) {
                // Clear the listeners and leave the room
                socket.off(SocketEvents.server.pushMessages);
                socket.off(SocketEvents.server.pushSpans);
                socket.off(SocketEvents.server.pushInputRequests);
                socket.off(SocketEvents.server.pushRunData);
                socket.off(SocketEvents.server.clearInputRequests);
                socket.off(SocketEvents.server.pushModelInvocationData);
                socket.emit(SocketEvents.client.leaveRoom, roomName);
            }
        };
    }, [socket, runId, roomName]);

    if (!runId) {
        return <ProjectNotFoundPage />;
    }

    /**
     * Send the user input to the server
     *
     * @param requestId
     * @param blocksInput
     * @param structuredInput
     */
    const sendUserInputToServer = (
        requestId: string,
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => {
        if (!socket) {
            messageApi.error(
                'Server is not connected, please refresh the page.',
            );
        } else {
            socket.emit(
                SocketEvents.client.sendUserInputToServer,
                requestId,
                blocksInput,
                structuredInput,
            );
            // Update the request queue
            setInputRequests((prevRequests) =>
                prevRequests.filter(
                    (request) => request.requestId !== requestId,
                ),
            );
        }
    };

    return (
        <RunRoomContext.Provider
            value={{
                runId,
                replies,
                trace,
                spans,
                inputRequests,
                runData,
                sendUserInputToServer,
                modelInvocationData,
            }}
        >
            {children}
        </RunRoomContext.Provider>
    );
}

export function useRunRoom() {
    const context = useContext(RunRoomContext);
    if (!context) {
        throw new Error('useRunRoom must be used within a RunRoomProvider');
    }
    return context;
}
