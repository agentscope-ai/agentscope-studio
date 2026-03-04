import {
    ResponseBody,
    ContentBlocks,
    FridayReply,
    SocketEvents,
    SocketRoomName,
    Plan,
    SubTask,
    SubTaskStatus,
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
import { trpc } from '@/api/trpc';

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
    // Plan related
    currentPlan: Plan | null;
    historicalPlans: Plan[];
    updatePlan: (plan: Plan) => void;
    updateSubtaskStatus: (subtask: SubTask, newStatus: SubTaskStatus) => void;
    updateSubtask: (subtask: SubTask) => void;
    addSubtask: (
        name: string,
        description: string,
        expectedOutcome?: string,
        insertAfterIndex?: number,
    ) => void;
    reorderSubtasks: (fromIndex: number, toIndex: number) => void;
    deleteSubtask: (subtask: SubTask) => void;
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
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
    const [historicalPlans, setHistoricalPlans] = useState<Plan[]>([]);

    // Load plans from storage on mount
    const { data: plansData, refetch: refetchPlans } =
        trpc.getFridayPlans.useQuery(undefined, {
            refetchOnMount: true,
            refetchOnWindowFocus: false,
        });

    // Plan management mutations
    const revisePlanMutation = trpc.reviseFridayPlan.useMutation({
        onSuccess: (data) => {
            if (data.success) {
                // Don't show backend message for plan operations
                // messageApi.info(data.message);
                refetchPlans();
            } else {
                messageApi.error(data.message);
            }
        },
        onError: (error) => {
            messageApi.error(`操作失败: ${error.message}`);
        },
    });

    const updateSubtaskStateMutation =
        trpc.updateFridaySubtaskState.useMutation({
            onSuccess: (data) => {
                if (data.success) {
                    // Don't show backend message for subtask state updates
                    // messageApi.info(data.message);
                    refetchPlans();
                } else {
                    messageApi.error(data.message);
                }
            },
            onError: (error) => {
                messageApi.error(`状态更新失败: ${error.message}`);
            },
        });

    const finishSubtaskMutation = trpc.finishFridaySubtask.useMutation({
        onSuccess: (data) => {
            if (data.success) {
                refetchPlans();
            } else {
                messageApi.error(data.message);
            }
        },
        onError: (error) => {
            messageApi.error(`完成子任务失败: ${error.message}`);
        },
    });

    const reorderSubtasksMutation = trpc.reorderFridaySubtasks.useMutation({
        onSuccess: (data) => {
            if (!data.success) {
                messageApi.error(data.message);
            }
            refetchPlans();
        },
        onError: (error) => {
            messageApi.error(`重排序失败: ${error.message}`);
        },
    });

    useEffect(() => {
        if (plansData) {
            // Only set current plan from backend if we don't already have one
            // This prevents overwriting WebSocket updates
            if (!currentPlan && plansData.currentPlan) {
                setCurrentPlan(plansData.currentPlan as Plan);
            }

            // Only set historical plans if we haven't received any yet
            // This ensures WebSocket pushes take priority over tRPC initial load
            setHistoricalPlans((prev) => {
                // If prev is empty and we have data from tRPC, use tRPC data
                if (prev.length === 0 && plansData.historicalPlans) {
                    return plansData.historicalPlans as Plan[];
                }
                // Otherwise keep existing (possibly from WebSocket)
                return prev;
            });
        }
    }, [plansData, currentPlan]);

    useEffect(() => {
        if (!socket) {
            return;
        }

        socket.emit(
            SocketEvents.client.joinFridayAppRoom,
            (response: ResponseBody) => {
                if (!response.success) {
                    messageApi.error(response.message);
                } else {
                    // On successful join/rejoin, refresh historical plans
                    // This handles the case where plans were completed while disconnected
                    refetchPlans();
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

        // Handle plan updates (current plan changes, and historical plans when finished)
        socket.on(
            SocketEvents.server.pushCurrentPlan,
            (planData: {
                currentPlan: Plan | null;
                historicalPlans?: Plan[];
            }) => {
                setCurrentPlan(planData.currentPlan);

                // If historicalPlans is provided (when plan is finished), update it directly
                if (planData.historicalPlans !== undefined) {
                    setHistoricalPlans(planData.historicalPlans);
                }

                // If current plan becomes null (finished) and no historical plans provided, fetch them
                if (
                    planData.currentPlan === null &&
                    !planData.historicalPlans
                ) {
                    refetchPlans();
                }
            },
        );

        return () => {
            socket.off(SocketEvents.server.pushReplyingState);
            socket.off(SocketEvents.server.pushReplies);
            socket.off(SocketEvents.server.pushCurrentPlan);
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
                (response: ResponseBody) => {
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
                    } else {
                        // After agent finishes, do a final sync to ensure
                        // plan state is up to date (plan events arrive via socket
                        // in real-time, this is a safety net)
                        refetchPlans();
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

    // Plan management functions
    const updatePlan = (plan: Plan) => {
        setCurrentPlan(plan);
    };

    const updateSubtaskStatus = (
        subtask: SubTask,
        newStatus: SubTaskStatus,
    ) => {
        if (!currentPlan) return;

        // Find the subtask index
        const subtaskIndex = currentPlan.subtasks.findIndex(
            (st) =>
                st.name === subtask.name &&
                st.created_at === subtask.created_at,
        );

        if (subtaskIndex === -1) return;

        // Get status label for success message
        const getStatusLabel = (status: SubTaskStatus) => {
            switch (status) {
                case SubTaskStatus.TODO:
                    return '待执行';
                case SubTaskStatus.IN_PROGRESS:
                    return '执行中';
                case SubTaskStatus.DONE:
                    return '已完成';
                case SubTaskStatus.ABANDONED:
                    return '已废弃';
                default:
                    return '';
            }
        };

        // According to backend PlanNotebook logic:
        // - finish_subtask: for marking as done (requires outcome)
        // - update_subtask_state: for todo/in_progress/abandoned
        if (newStatus === SubTaskStatus.DONE) {
            // Should have been handled with prompt in UI, but just in case
            const outcome = subtask.outcome || prompt('请输入子任务完成结果:');
            if (outcome) {
                finishSubtaskMutation.mutate(
                    {
                        subtaskIdx: subtaskIndex,
                        outcome: outcome,
                    },
                    {
                        onSuccess: (data) => {
                            if (data.success) {
                                messageApi.success('子任务已完成');
                                refetchPlans();
                            } else {
                                messageApi.error(data.message);
                            }
                        },
                    },
                );
            }
        } else if (newStatus === SubTaskStatus.ABANDONED) {
            updateSubtaskStateMutation.mutate(
                {
                    subtaskIdx: subtaskIndex,
                    state: 'abandoned',
                },
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            messageApi.success(
                                `状态已更新为${getStatusLabel(newStatus)}`,
                            );
                            refetchPlans();
                        } else {
                            messageApi.error(data.message);
                        }
                    },
                },
            );
        } else {
            // For todo or in_progress
            updateSubtaskStateMutation.mutate(
                {
                    subtaskIdx: subtaskIndex,
                    state: newStatus as 'todo' | 'in_progress',
                },
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            messageApi.success(
                                `状态已更新为${getStatusLabel(newStatus)}`,
                            );
                            refetchPlans();
                        } else {
                            messageApi.error(data.message);
                        }
                    },
                },
            );
        }
    };

    const updateSubtask = (updatedSubtask: SubTask) => {
        if (!currentPlan) return;

        // Find the subtask index
        const subtaskIndex = currentPlan.subtasks.findIndex(
            (st) =>
                st.name === updatedSubtask.name &&
                st.created_at === updatedSubtask.created_at,
        );

        if (subtaskIndex === -1) return;

        // Revise the subtask
        revisePlanMutation.mutate(
            {
                subtaskIdx: subtaskIndex,
                action: 'revise',
                subtask: updatedSubtask,
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        messageApi.success('子任务修改成功');
                        refetchPlans();
                    } else {
                        messageApi.error(data.message);
                    }
                },
            },
        );
    };

    const addSubtask = (
        name: string,
        description: string,
        expectedOutcome?: string,
        insertAfterIndex?: number,
    ) => {
        if (!currentPlan) return;

        const newSubtask: SubTask = {
            name,
            description,
            expected_outcome: expectedOutcome || '',
            outcome: null,
            state: SubTaskStatus.TODO,
            created_at: new Date().toISOString(),
            finished_at: null,
        };

        // If insertAfterIndex is provided, insert after that index; otherwise add at the end
        const insertIndex =
            insertAfterIndex !== undefined
                ? insertAfterIndex + 1
                : currentPlan.subtasks.length;

        revisePlanMutation.mutate(
            {
                subtaskIdx: insertIndex,
                action: 'add',
                subtask: newSubtask,
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        messageApi.success('子任务添加成功');
                        refetchPlans();
                    } else {
                        messageApi.error(data.message);
                    }
                },
            },
        );
    };

    const deleteSubtask = (subtask: SubTask) => {
        if (!currentPlan) return;

        const subtaskIndex = currentPlan.subtasks.findIndex(
            (st) =>
                st.name === subtask.name &&
                st.created_at === subtask.created_at,
        );

        if (subtaskIndex === -1) return;

        revisePlanMutation.mutate(
            {
                subtaskIdx: subtaskIndex,
                action: 'delete',
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        messageApi.success('子任务删除成功');
                        refetchPlans();
                    } else {
                        messageApi.error(data.message);
                    }
                },
            },
        );
    };

    const reorderSubtasks = (fromIndex: number, toIndex: number) => {
        if (!currentPlan || fromIndex === toIndex) return;
        reorderSubtasksMutation.mutate({ fromIndex, toIndex });
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
                currentPlan,
                historicalPlans,
                updatePlan,
                updateSubtaskStatus,
                updateSubtask,
                addSubtask,
                reorderSubtasks,
                deleteSubtask,
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
