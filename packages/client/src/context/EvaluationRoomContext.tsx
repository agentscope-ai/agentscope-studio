import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { Benchmark, EvalResult } from '@shared/types/evaluation.ts';
import { useSocket } from '@/context/SocketContext.tsx';
import { BackendResponse, SocketEvents, SocketRoomName } from '@shared/types';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { trpcClient } from '@/api/trpc.ts';

interface EvaluationRoomContextType {
    benchmarks: Benchmark[];
    deleteEvaluations: (evaluationIds: string[]) => void;
    deleteBenchmark: (benchmarkName: string) => void;
    importBenchmark: (evaluationDir: string) => Promise<boolean>;
    getEvaluationResult: (evaluationDir: string) => Promise<EvalResult | null>;
}

const EvaluationRoomContext = createContext<EvaluationRoomContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
}

export function EvaluationRoomContextProvider({ children }: Props) {
    const socket = useSocket();
    const { messageApi } = useMessageApi();
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

    useEffect(() => {
        if (!socket) {
            return;
        }

        // enter evaluation room
        socket.emit(SocketEvents.client.joinEvaluationRoom);

        // handle data update
        socket.on(SocketEvents.server.pushEvaluations, (data: Benchmark[]) => {
            setBenchmarks(data);
        });

        return () => {
            socket.off(SocketEvents.server.pushEvaluations);
            socket.emit(
                SocketEvents.client.leaveRoom,
                SocketRoomName.EvaluationRoom,
            );
        };
    }, [socket]);

    const deleteEvaluations = (evaluationIds: string[]) => {
        if (!socket) {
            messageApi.error(
                'Socket is not connected. Please refresh the page and try again.',
            );
        } else {
            socket.emit(
                SocketEvents.client.deleteEvaluations,
                evaluationIds,
                (response: BackendResponse) => {
                    if (response.success) {
                        messageApi.success(
                            `${evaluationIds.length} evaluations deleted successfully.`,
                        );
                    } else {
                        messageApi.error(
                            response.message || 'Failed to delete evaluations.',
                        );
                    }
                },
            );
        }
    };

    const deleteBenchmark = (benchmarkName: string) => {
        if (!socket) {
            messageApi.error(
                'Socket is not connected. Please refresh the page and try again.',
            );
        }
    };

    const importBenchmark = async (evaluationDir: string) => {
        if (!socket) {
            messageApi.error(
                'Socket is not connected. Please refresh the page and try again.',
            );
        }

        // Send a POST request to the server
        const response = await fetch('/trpc/importEvaluation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                evaluationDir: evaluationDir,
            }),
        });

        // Handle the response
        const jsonData = await response.json();
        const backendResponse: BackendResponse = jsonData.result.data;
        if (backendResponse.success) {
            // messageApi.info(backendResponse.message);
            return true;
        } else {
            messageApi.error(backendResponse.message);
            return false;
        }
    };

    /*
     * Obtain one evaluation result by its evaluation dir
     */
    const getEvaluationResult = async (evaluationDir: string) => {
        try {
            const res = await trpcClient.getEvaluationResult.mutate({
                evaluationDir,
            });
            if (res.success) {
                return res.data as EvalResult;
            } else {
                messageApi.error(
                    res.message || 'Failed to get evaluation result.',
                );
            }
        } catch (error) {
            messageApi.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to get evaluation result.',
            );
        }
        return null;
    };

    return (
        <EvaluationRoomContext.Provider
            value={{
                benchmarks,
                deleteEvaluations,
                deleteBenchmark,
                importBenchmark,
                getEvaluationResult,
            }}
        >
            {children}
        </EvaluationRoomContext.Provider>
    );
}

export function useEvaluationRoom() {
    const context = useContext(EvaluationRoomContext);
    if (!context) {
        throw new Error(
            'useEvaluationRoom must be used within an EvaluationRoomContextProvider',
        );
    }
    return context;
}
