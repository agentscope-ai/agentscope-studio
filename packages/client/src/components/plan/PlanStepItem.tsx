import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CheckCircle2Icon,
    CircleIcon,
    LoaderCircleIcon,
    XCircleIcon,
    Edit2Icon,
    Trash2Icon,
    PlusIcon,
} from 'lucide-react';
import { SubTask, SubTaskStatus } from '@shared/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PlanStepItemProps {
    subtask: SubTask;
    index: number;
    onEdit: (subtask: SubTask) => void;
    onToggleStatus: (subtask: SubTask) => void;
    onDelete?: (subtask: SubTask) => void;
    onInsertAfter?: (index: number) => void;
    onDragStart?: (index: number) => void;
    onDragEnd?: () => void;
    onDragOver?: (index: number) => void;
    onDrop?: (index: number) => void;
    isReadOnly?: boolean;
    isDragging?: boolean;
}

const PlanStepItem = ({
    subtask,
    index,
    onEdit,
    onToggleStatus,
    onDelete,
    onInsertAfter,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    isReadOnly = false,
    isDragging = false,
}: PlanStepItemProps) => {
    const { t } = useTranslation();
    const getStatusIcon = () => {
        switch (subtask.state) {
            case SubTaskStatus.DONE:
                return (
                    <CheckCircle2Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                );
            case SubTaskStatus.IN_PROGRESS:
                return (
                    <LoaderCircleIcon className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                );
            case SubTaskStatus.ABANDONED:
                return (
                    <XCircleIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
                );
            case SubTaskStatus.TODO:
            default:
                return (
                    <CircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                );
        }
    };

    const getCardClassName = () => {
        const baseClass =
            'group relative flex flex-col gap-2 p-3 border transition-colors';
        switch (subtask.state) {
            case SubTaskStatus.DONE:
                return cn(baseClass, 'bg-green-50 border-green-200');
            case SubTaskStatus.IN_PROGRESS:
                return cn(baseClass, 'bg-blue-50 border-blue-200');
            case SubTaskStatus.ABANDONED:
                return cn(baseClass, 'bg-red-50 border-red-200');
            case SubTaskStatus.TODO:
            default:
                return cn(baseClass, 'bg-white border-border');
        }
    };

    // Check if subtask is completed (should disable edit/delete according to backend logic)
    const isCompleted = subtask.state === SubTaskStatus.DONE;

    // Status options for dropdown
    const statusOptions = [
        {
            value: SubTaskStatus.TODO,
            label: t('plan.subtask_status.todo'),
            icon: <CircleIcon className="w-3 h-3 text-gray-400" />,
        },
        {
            value: SubTaskStatus.IN_PROGRESS,
            label: t('plan.subtask_status.in_progress'),
            icon: <LoaderCircleIcon className="w-3 h-3 text-blue-600" />,
        },
        {
            value: SubTaskStatus.DONE,
            label: t('plan.subtask_status.done'),
            icon: <CheckCircle2Icon className="w-3 h-3 text-green-600" />,
        },
        {
            value: SubTaskStatus.ABANDONED,
            label: t('plan.subtask_status.abandoned'),
            icon: <XCircleIcon className="w-3 h-3 text-red-600" />,
        },
    ];

    const handleStatusChange = (newStatus: SubTaskStatus) => {
        if (newStatus === subtask.state) return;
        onToggleStatus({ ...subtask, state: newStatus });
    };

    return (
        <Card
            className={cn(
                getCardClassName(),
                isDragging && 'opacity-50',
                !isReadOnly && !isCompleted && 'cursor-move',
            )}
            draggable={!isReadOnly && !isCompleted}
            onDragStart={(e) => {
                if (isReadOnly || isCompleted || !onDragStart) return;
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(index);
            }}
            onDragEnd={() => {
                if (isReadOnly || isCompleted || !onDragEnd) return;
                onDragEnd();
            }}
            onDragOver={(e) => {
                if (isReadOnly || isCompleted || !onDragOver) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                onDragOver(index);
            }}
            onDrop={(e) => {
                if (isReadOnly || isCompleted || !onDrop) return;
                e.preventDefault();
                onDrop(index);
            }}
        >
            {/* Title Row: icon + title + action buttons */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Status Icon */}
                    {isReadOnly || isCompleted ? (
                        <div className="flex-shrink-0">{getStatusIcon()}</div>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex-shrink-0 hover:scale-110 transition-transform cursor-pointer">
                                    {getStatusIcon()}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {statusOptions.map((option) => (
                                    <DropdownMenuItem
                                        key={option.value}
                                        onClick={() =>
                                            handleStatusChange(option.value)
                                        }
                                        className={cn(
                                            'flex items-center gap-2',
                                            option.value === subtask.state &&
                                                'bg-muted',
                                        )}
                                    >
                                        {option.icon}
                                        <span>{option.label}</span>
                                        {option.value === subtask.state && (
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {t('plan.current_status')}
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <div className="relative group flex-1 min-w-0">
                        <span
                            className="text-sm font-medium text-foreground truncate block"
                            title={`${index + 1}. ${subtask.name}`}
                        >
                            {index + 1}. {subtask.name}
                        </span>
                        <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 px-2 py-1 bg-background border border-border rounded shadow-lg text-xs text-foreground whitespace-nowrap z-[100]">
                            {index + 1}. {subtask.name}
                            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border"></div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {!isReadOnly && (
                    <div className="flex gap-1 flex-shrink-0">
                        {onInsertAfter && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onInsertAfter(index)}
                                className="h-6 w-6 p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title={t('plan.insert_subtask')}
                            >
                                <PlusIcon className="w-3 h-3" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEdit(subtask)}
                            disabled={isCompleted}
                            className={cn(
                                'h-6 w-6 p-1',
                                isCompleted && 'cursor-not-allowed opacity-50',
                            )}
                            title={
                                isCompleted
                                    ? t('plan.edit_disabled')
                                    : t('plan.edit_subtask')
                            }
                        >
                            <Edit2Icon className="w-3 h-3" />
                        </Button>
                        {onDelete && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onDelete(subtask)}
                                className="h-6 w-6 p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title={t('plan.delete_subtask')}
                            >
                                <Trash2Icon className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Content */}
            <p
                className={cn(
                    'text-sm',
                    subtask.state === SubTaskStatus.DONE
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground',
                )}
            >
                {subtask.description}
            </p>
            {subtask.expected_outcome && (
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium">
                        {t('plan.expected_outcome')}:{' '}
                    </span>
                    {subtask.expected_outcome}
                </div>
            )}
            {subtask.outcome && (
                <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground border border-border">
                    <span className="font-medium">
                        {t('plan.actual_outcome')}:{' '}
                    </span>
                    {subtask.outcome}
                </div>
            )}
        </Card>
    );
};

export default memo(PlanStepItem);
