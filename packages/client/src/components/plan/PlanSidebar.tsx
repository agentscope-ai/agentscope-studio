import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChevronRightIcon,
    PlusIcon,
    ClipboardListIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from 'lucide-react';
import { Plan, SubTask, PlanStatus, SubTaskStatus } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import PlanStepItem from './PlanStepItem';

interface PlanSidebarProps {
    plan: Plan | null;
    historicalPlans: Plan[];
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onEditSubtask: (subtask: SubTask) => void;
    onToggleSubtaskStatus: (subtask: SubTask) => void;
    onAddSubtask: () => void;
    onInsertSubtask?: (insertAfterIndex: number) => void;
    onReorderSubtasks?: (fromIndex: number, toIndex: number) => void;
    onDeleteSubtask?: (subtask: SubTask) => void;
}

const PlanSidebar = ({
    plan,
    historicalPlans,
    isCollapsed,
    onToggleCollapse,
    onEditSubtask,
    onToggleSubtaskStatus,
    onAddSubtask,
    onInsertSubtask,
    onReorderSubtasks,
    onDeleteSubtask,
}: PlanSidebarProps) => {
    const { t } = useTranslation();
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(
        new Set(),
    );
    // 当前计划默认展开
    const [isCurrentPlanExpanded, setIsCurrentPlanExpanded] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    // 侧边栏宽度，默认 288px (w-72)，可拖拽调整
    const [sidebarWidth, setSidebarWidth] = useState(288);

    const handleResizeMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;

            const handleMouseMove = (ev: MouseEvent) => {
                const delta = startX - ev.clientX;
                const newWidth = Math.max(
                    240,
                    Math.min(600, startWidth + delta),
                );
                setSidebarWidth(newWidth);
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [sidebarWidth],
    );

    const getPlanStatusBadge = (state: PlanStatus) => {
        const variants: Record<
            PlanStatus,
            { label: string; className: string }
        > = {
            [PlanStatus.TODO]: {
                label: t('plan.status.todo'),
                className: 'bg-muted text-muted-foreground border-border',
            },
            [PlanStatus.IN_PROGRESS]: {
                label: t('plan.status.in_progress'),
                className: 'bg-blue-50 text-blue-700 border-blue-200',
            },
            [PlanStatus.DONE]: {
                label: t('plan.status.done'),
                className: 'bg-green-50 text-green-700 border-green-200',
            },
            [PlanStatus.ABANDONED]: {
                label: t('plan.status.abandoned'),
                className: 'bg-red-50 text-red-700 border-red-200',
            },
        };

        const config = variants[state];
        return (
            <Badge
                variant="outline"
                className={cn('text-xs font-medium', config.className)}
            >
                {config.label}
            </Badge>
        );
    };

    const getEffectivePlanStatus = (planData: Plan): PlanStatus => {
        if (planData.state) return planData.state;
        const allDone = planData.subtasks.every(
            (s) => s.state === SubTaskStatus.DONE,
        );
        const anyInProgress = planData.subtasks.some(
            (s) => s.state === SubTaskStatus.IN_PROGRESS,
        );
        if (allDone && planData.subtasks.length > 0) return PlanStatus.DONE;
        if (anyInProgress) return PlanStatus.IN_PROGRESS;
        return PlanStatus.TODO;
    };

    const getPlanStats = (planData: Plan) => {
        const total = planData.subtasks.length;
        const completed = planData.subtasks.filter(
            (s) => s.state === SubTaskStatus.DONE,
        ).length;
        const percentage =
            total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, percentage };
    };

    const togglePlanExpanded = (planId: string) => {
        setExpandedPlanIds((prev) => {
            const next = new Set(prev);
            if (next.has(planId)) {
                next.delete(planId);
            } else {
                next.add(planId);
            }
            return next;
        });
    };

    const renderPlanCard = (planData: Plan, isHistory: boolean) => {
        const stats = getPlanStats(planData);
        const isExpanded = expandedPlanIds.has(planData.id);

        // Find the last completed subtask index for insert restrictions
        const lastCompletedIndex = planData.subtasks.reduce(
            (lastIdx, subtask, idx) =>
                subtask.state === SubTaskStatus.DONE ? idx : lastIdx,
            -1,
        );

        return (
            <div
                key={planData.id}
                className="border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow"
            >
                {/* Plan Header */}
                <div
                    className={cn(
                        'p-3 bg-muted cursor-pointer hover:bg-accent transition-colors',
                    )}
                    onClick={() =>
                        isHistory
                            ? togglePlanExpanded(planData.id)
                            : setIsCurrentPlanExpanded((v) => !v)
                    }
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                            <div className="relative group flex-1">
                                <h4
                                    className="text-sm font-medium text-foreground truncate"
                                    title={planData.name}
                                >
                                    {planData.name}
                                </h4>
                                <div className="invisible group-hover:visible absolute top-full left-0 mt-1 px-2 py-1 bg-background border border-border rounded shadow-lg text-xs text-foreground whitespace-nowrap z-[200]">
                                    {planData.name}
                                    <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-border"></div>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                {getPlanStatusBadge(
                                    getEffectivePlanStatus(planData),
                                )}
                            </div>
                        </div>
                        <button className="flex-shrink-0 p-1 hover:bg-accent rounded">
                            {(
                                isHistory ? isExpanded : isCurrentPlanExpanded
                            ) ? (
                                <ChevronUpIcon className="w-4 h-4 text-foreground" />
                            ) : (
                                <ChevronDownIcon className="w-4 h-4 text-foreground" />
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {t('plan.completed_stats', {
                                completed: stats.completed,
                                total: stats.total,
                                percentage: stats.percentage,
                            })}
                        </div>
                    </div>
                </div>

                {/* Plan Details (collapsible for all plans) */}
                {(isHistory ? isExpanded : isCurrentPlanExpanded) && (
                    <div className="p-3 space-y-3">
                        {planData.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3">
                                {planData.description}
                            </p>
                        )}

                        {planData.expected_outcome && (
                            <div className="text-xs text-muted-foreground">
                                <span className="font-medium">
                                    {t('plan.expected_outcome')}:{' '}
                                </span>
                                <span className="line-clamp-2">
                                    {planData.expected_outcome}
                                </span>
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${stats.percentage}%` }}
                            />
                        </div>

                        {/* Subtasks */}
                        <div className="space-y-2">
                            {planData.subtasks.map((subtask, index) => {
                                // Show insert button only after last completed task or for non-completed tasks
                                const showInsert =
                                    !isHistory &&
                                    onInsertSubtask !== undefined &&
                                    (lastCompletedIndex === -1 ||
                                        index === lastCompletedIndex ||
                                        subtask.state !== SubTaskStatus.DONE);

                                return (
                                    <PlanStepItem
                                        key={`${planData.id}-${index}`}
                                        subtask={subtask}
                                        index={index}
                                        onEdit={onEditSubtask}
                                        onToggleStatus={onToggleSubtaskStatus}
                                        onDelete={
                                            !isHistory
                                                ? onDeleteSubtask
                                                : undefined
                                        }
                                        onInsertAfter={
                                            showInsert
                                                ? onInsertSubtask
                                                : undefined
                                        }
                                        onDragStart={
                                            !isHistory
                                                ? (idx) => setDraggedIndex(idx)
                                                : undefined
                                        }
                                        onDragEnd={
                                            !isHistory
                                                ? () => setDraggedIndex(null)
                                                : undefined
                                        }
                                        onDragOver={
                                            !isHistory && onReorderSubtasks
                                                ? (idx) => {
                                                      if (
                                                          draggedIndex !==
                                                              null &&
                                                          draggedIndex !== idx
                                                      ) {
                                                          onReorderSubtasks(
                                                              draggedIndex,
                                                              idx,
                                                          );
                                                          setDraggedIndex(idx);
                                                      }
                                                  }
                                                : undefined
                                        }
                                        onDrop={
                                            !isHistory
                                                ? () => setDraggedIndex(null)
                                                : undefined
                                        }
                                        isReadOnly={isHistory}
                                        isDragging={draggedIndex === index}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (isCollapsed) {
        return null;
    }

    return (
        <div className="flex h-full">
            {/* Resize handle */}
            <div
                className="w-1 h-full cursor-ew-resize bg-border hover:bg-primary/50 active:bg-primary/70 transition-colors flex-shrink-0 select-none"
                onMouseDown={handleResizeMouseDown}
                title="拖拽调整宽度"
            />

            {/* Main sidebar panel */}
            <div
                className="flex flex-col h-full bg-background overflow-hidden"
                style={{ width: sidebarWidth }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <ClipboardListIcon className="w-5 h-5 text-foreground" />
                        <h2 className="text-base font-semibold text-foreground">
                            {t('plan.title')}
                        </h2>
                    </div>
                </div>

                {/* Content */}
                {plan || historicalPlans.length > 0 ? (
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-3 space-y-4">
                            {/* History Plans */}
                            {historicalPlans.length > 0 && (
                                <div className="space-y-2">
                                    <button
                                        className="flex items-center gap-2 w-full text-left p-2 hover:bg-muted rounded-lg transition-colors"
                                        onClick={() =>
                                            setIsHistoryExpanded(
                                                !isHistoryExpanded,
                                            )
                                        }
                                    >
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {t('plan.history_plans', {
                                                count: historicalPlans.length,
                                            })}
                                        </h3>
                                        {isHistoryExpanded ? (
                                            <ChevronUpIcon className="w-4 h-4 text-foreground" />
                                        ) : (
                                            <ChevronDownIcon className="w-4 h-4 text-foreground" />
                                        )}
                                    </button>

                                    {isHistoryExpanded && (
                                        <div className="space-y-3">
                                            {[...historicalPlans]
                                                .reverse()
                                                .map((p) =>
                                                    renderPlanCard(p, true),
                                                )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Current Plan */}
                            {plan && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {t('plan.current_plan')}
                                        </h3>
                                    </div>
                                    {renderPlanCard(plan, false)}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <ClipboardListIcon className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground mb-1">
                            {t('plan.empty_title')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t('plan.empty_desc')}
                        </p>
                    </div>
                )}

                {/* Footer - Only show when current plan exists */}
                {plan && (
                    <div className="flex-shrink-0 p-4 border-t border-border">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onAddSubtask}
                            className="w-full hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            {t('plan.add_subtask')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Collapse button column - positioned at the far right */}
            <div className="flex items-center justify-center w-3 bg-background border-l border-border">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onToggleCollapse}
                    className="h-8 w-8 p-0 hover:bg-muted rounded-full transition-colors"
                    title={t('plan.collapse_sidebar')}
                >
                    <ChevronRightIcon className="w-4 h-4 text-foreground" />
                </Button>
            </div>
        </div>
    );
};

export default memo(PlanSidebar);
