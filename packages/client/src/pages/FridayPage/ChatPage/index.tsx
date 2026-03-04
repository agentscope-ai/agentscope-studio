import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SettingsIcon, Trash2Icon, PanelRightOpenIcon } from 'lucide-react';

import { RouterPath } from '@/pages/RouterPath';
import { useFridayAppRoom } from '@/context/FridayAppRoomContext.tsx';
import AsChat from '@/components/chat/AsChat';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Message, Reply, SubTask, SubTaskStatus } from '@shared/types';
import { useTranslation } from 'react-i18next';
import PlanSidebar from '@/components/plan/PlanSidebar';
import { EditSubtaskDialog } from '@/components/plan/EditSubtaskDialog';
import { FinishSubtaskDialog } from '@/components/plan/FinishSubtaskDialog';

const ChatPage = () => {
    const { t } = useTranslation();
    const {
        replies,
        isReplying,
        handleUserInput,
        interruptReply,
        cleaningHistory,
        cleanCurrentHistory,
        currentPlan,
        historicalPlans,
        updateSubtaskStatus,
        addSubtask,
        reorderSubtasks,
        deleteSubtask,
        updateSubtask,
    } = useFridayAppRoom();
    const navigate = useNavigate();
    const { messageApi } = useMessageApi();
    const [isPlanCollapsed, setIsPlanCollapsed] = useState(false);
    const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [insertAfterIndex, setInsertAfterIndex] = useState<
        number | undefined
    >(undefined);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [finishingSubtask, setFinishingSubtask] = useState<SubTask | null>(
        null,
    );
    const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);

    // Handle subtask edit
    const handleEditSubtask = (subtask: SubTask) => {
        setEditingSubtask(subtask);
        setIsEditDialogOpen(true);
    };

    // Handle subtask save (edit mode)
    const handleSaveSubtask = (updatedSubtask: SubTask) => {
        updateSubtask(updatedSubtask);
        setEditingSubtask(null);
        setIsEditDialogOpen(false);
    };

    // Handle subtask add
    const handleAddSubtask = (newSubtask: SubTask) => {
        addSubtask(
            newSubtask.name,
            newSubtask.description,
            newSubtask.expected_outcome,
            insertAfterIndex,
        );
        setIsAddDialogOpen(false);
        setInsertAfterIndex(undefined);
    };

    // Handle insert after a subtask
    const handleInsertSubtask = (afterIndex: number) => {
        setInsertAfterIndex(afterIndex);
        setIsAddDialogOpen(true);
    };

    // Handle reorder subtasks
    const handleReorderSubtasks = (fromIndex: number, toIndex: number) => {
        reorderSubtasks(fromIndex, toIndex);
    };

    // Handle finish subtask
    const handleFinishSubtask = (outcome: string) => {
        if (finishingSubtask) {
            const updatedSubtask = {
                ...finishingSubtask,
                outcome,
            };
            updateSubtaskStatus(updatedSubtask, SubTaskStatus.DONE);
            setFinishingSubtask(null);
        }
    };

    // 判断下当前是早上、晚上、还是下午,获取morning,afternoon,evening 字段
    const hour = new Date().getHours();
    let timeOfDay = 'afternoon';
    if (hour < 12) {
        timeOfDay = 'morning';
    } else if (hour >= 18) {
        timeOfDay = 'evening';
    }

    // 做个转化，从FridayReply[]到Reply[]

    const convertedReplies = replies.map((reply) => {
        return {
            replyId: reply.id,
            replyName: reply.name,
            replyRole: reply.role,
            createdAt: reply.startTimeStamp,
            finishedAt: reply.endTimeStamp,
            messages: [
                {
                    id: reply.id,
                    name: reply.name,
                    role: reply.role,
                    content: reply.content,
                    timestamp: reply.startTimeStamp,
                    metadata: {},
                } as Message,
            ],
        } as Reply;
    });

    return (
        <div className="flex flex-row w-full h-full flex-1 bg-[rgb(246,247,248)]">
            <div className="flex flex-1 h-full justify-center">
                <AsChat
                    replies={convertedReplies}
                    isReplying={isReplying}
                    onSendClick={(blocksInput) => {
                        handleUserInput('You', 'user', blocksInput);
                    }}
                    disableSendBtn={cleaningHistory}
                    allowInterrupt={true}
                    onInterruptClick={interruptReply}
                    onBubbleClick={() => {}}
                    actions={
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={cleanCurrentHistory}
                            >
                                <Trash2Icon className="max-h-3 max-w-3" />
                                Clean history
                            </Button>
                        </>
                    }
                    placeholder={t(`placeholder.input-friday-${timeOfDay}`)}
                    tooltips={{
                        sendButton: isReplying
                            ? t('tooltip.button.interrupt-reply')
                            : t('tooltip.button.send-message'),
                        interruptButton: t('tooltip.button.interrupt-reply'),
                        attachButton: t('tooltip.button.attachment-add'),
                        expandTextarea: t('tooltip.button.expand-textarea'),
                        voiceButton: t('tooltip.button.voice-button'),
                    }}
                    attachMaxFileSize={20 * 1024 * 1024}
                    onError={(error) => {
                        messageApi.error(error);
                    }}
                    attachAccept={['image/*', 'audio/*']}
                    userAvatarRight={false}
                />
            </div>

            {/* Plan Sidebar - Always shown */}
            <PlanSidebar
                plan={currentPlan}
                historicalPlans={historicalPlans}
                isCollapsed={isPlanCollapsed}
                onToggleCollapse={() => setIsPlanCollapsed(!isPlanCollapsed)}
                onEditSubtask={handleEditSubtask}
                onToggleSubtaskStatus={(subtaskWithNewState) => {
                    if (!currentPlan) return;

                    const newState = subtaskWithNewState.state;

                    // If changing to DONE, open dialog to input outcome
                    if (newState === SubTaskStatus.DONE) {
                        setFinishingSubtask(subtaskWithNewState);
                        setIsFinishDialogOpen(true);
                    } else {
                        // For other state changes, update directly
                        updateSubtaskStatus(subtaskWithNewState, newState);
                    }
                }}
                onAddSubtask={() => setIsAddDialogOpen(true)}
                onInsertSubtask={handleInsertSubtask}
                onReorderSubtasks={handleReorderSubtasks}
                onDeleteSubtask={deleteSubtask}
            />

            {/* Edit Subtask Dialog */}
            <EditSubtaskDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                subtask={editingSubtask}
                onSave={handleSaveSubtask}
                mode="edit"
            />

            {/* Add Subtask Dialog */}
            <EditSubtaskDialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) {
                        setInsertAfterIndex(undefined);
                    }
                }}
                subtask={null}
                onSave={handleAddSubtask}
                mode="add"
                customTitle={
                    insertAfterIndex !== undefined
                        ? t('plan.insert_subtask_title', {
                              index: insertAfterIndex + 1,
                          })
                        : undefined
                }
            />

            {/* Finish Subtask Dialog */}
            <FinishSubtaskDialog
                open={isFinishDialogOpen}
                onOpenChange={(open) => {
                    setIsFinishDialogOpen(open);
                    if (!open) {
                        setFinishingSubtask(null);
                    }
                }}
                subtask={finishingSubtask}
                onFinish={handleFinishSubtask}
            />

            <div className="flex flex-col w-[48px] h-full border-l border-l-border py-2 items-center bg-white">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                        navigate(
                            `${RouterPath.FRIDAY}${RouterPath.FRIDAY_SETTING}`,
                            {
                                state: {
                                    autoNavigateToChat: false,
                                },
                            },
                        );
                    }}
                >
                    <SettingsIcon width={15} height={15} />
                </Button>
                {isPlanCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setIsPlanCollapsed(false)}
                        title="展开任务计划"
                        className="mt-2"
                    >
                        <PanelRightOpenIcon width={15} height={15} />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default memo(ChatPage);
