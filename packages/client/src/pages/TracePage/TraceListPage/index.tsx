import { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { CheckCircle2Icon, CopyIcon, InfoIcon } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import NumberCounter from '@/components/numbers/NumberCounter';
import PageTitleSpan from '@/components/spans/PageTitleSpan';
import AsTable from '@/components/tables/AsTable';
import { Button } from '@/components/ui/button.tsx';
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { useTraceContext } from '@/context/TraceContext';
import { copyToClipboard } from '@/utils/common';
import { TraceListItem } from '@shared/types';
import TraceDetailPage from '../TraceDetailPage';

// Helper component for statistic cards
const StatCard = ({
    title,
    value,
    unit,
    icon,
}: {
    title: string;
    value: number | string | undefined;
    unit?: string;
    icon?: React.ReactNode;
}) => {
    return (
        <div className="border border-border rounded-lg p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-muted-foreground">
                    {title}
                </span>
                {icon && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <InfoIcon className="size-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>{title}</TooltipContent>
                    </Tooltip>
                )}
            </div>
            <div className="flex items-baseline gap-1">
                {typeof value === 'number' ? (
                    <NumberCounter
                        number={value}
                        style={{ fontSize: 20, fontWeight: 700 }}
                    />
                ) : (
                    <span style={{ fontSize: 20, fontWeight: 700 }}>
                        {value || '-'}
                    </span>
                )}
                {unit && (
                    <span className="text-[12px] text-muted-foreground">
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );
};

const TraceListPage = () => {
    const { t } = useTranslation();
    const {
        // Filter state
        timeRange,
        setTimeRange,

        // Pagination state
        page,
        setPage,
        pageSize,
        setPageSize,

        // Data
        traces,
        statistics,
        isLoading,
        error,
        total,

        // Selected trace
        selectedTraceId,
        setSelectedTraceId,
        drawerOpen,
        setDrawerOpen,
    } = useTraceContext();

    const formatDuration = (seconds: number): string => {
        if (seconds < 1) {
            return `${(seconds * 1000).toFixed(2)}ms`;
        }
        return `${seconds.toFixed(2)}s`;
    };

    const formatTime = (timeNs: string): string => {
        const timeMs = Number(BigInt(timeNs) / BigInt(1_000_000));
        return dayjs(timeMs).format('YYYY-MM-DD HH:mm:ss.SSS');
    };

    const getStatusDisplay = (status: number) => {
        if (status === 2) {
            return (
                <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-destructive" />
                    <span>{t('trace.status.error')}</span>
                </div>
            );
        } else if (status === 1) {
            return (
                <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-green-500" />
                    <span>{t('trace.status.ok')}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-muted-foreground" />
                <span>{t('trace.status.unset')}</span>
            </div>
        );
    };

    const getLatencyColor = (seconds: number): string => {
        if (seconds > 30) return 'text-destructive';
        if (seconds > 10) return 'text-orange-500';
        return 'text-green-500';
    };

    const handleCopyTraceId = async (traceId: string) => {
        const success = await copyToClipboard(traceId);
        if (success) {
            // TODO: Add toast notification
            console.log(t('trace.message.copySuccess'));
        } else {
            console.error(t('trace.message.copyFailed'));
        }
    };

    const columns: TableColumnsType<TraceListItem> = useMemo(
        () => [
            {
                key: 'name',
                width: 200,
                minWidth: 150,
                render: (_, record) => (
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            className="text-left hover:underline truncate"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTraceId(record.traceId);
                                setDrawerOpen(true);
                            }}
                        >
                            {record.name}
                        </button>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    className="shrink-0"
                                >
                                    <InfoIcon className="size-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex flex-col gap-2 text-xs">
                                    <div>
                                        {t('trace.traceId')}: {record.traceId}
                                    </div>
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyTraceId(record.traceId);
                                        }}
                                    >
                                        <CopyIcon className="size-3" />
                                    </Button>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                ),
            },
            {
                key: 'startTime',
                width: 180,
                minWidth: 150,
                render: (_, record) => (
                    <span className="text-xs sm:text-sm">
                        {formatTime(record.startTime)}
                    </span>
                ),
            },
            {
                key: 'duration',
                width: 100,
                minWidth: 80,
                render: (_, record) => (
                    <span
                        className={`text-xs sm:text-sm ${getLatencyColor(record.duration)}`}
                    >
                        {formatDuration(record.duration)}
                    </span>
                ),
            },
            {
                key: 'totalTokens',
                width: 100,
                minWidth: 80,
                render: (_, record) => (
                    <span className="text-xs sm:text-sm">
                        {record.totalTokens
                            ? record.totalTokens.toLocaleString()
                            : '-'}
                    </span>
                ),
            },
            {
                key: 'status',
                width: 120,
                minWidth: 100,
                render: (_, record) => getStatusDisplay(record.status),
            },
        ],
        [t, setSelectedTraceId, setDrawerOpen, handleCopyTraceId],
    );

    const timeRangeOptions = [
        { value: 'week', label: t('trace.timeRange.week') },
        { value: 'month', label: t('trace.timeRange.month') },
        { value: 'all', label: t('trace.timeRange.all') },
    ];

    return (
        <div className="flex flex-1 flex-col gap-4 py-8 px-4 sm:px-8 lg:px-12 h-full w-full overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageTitleSpan title={t('common.traces')} />
                {/* Time selection in top right */}
                <ToggleGroup
                    type="single"
                    value={timeRange}
                    onValueChange={(value) => {
                        if (value) {
                            setTimeRange(value as 'week' | 'month' | 'all');
                        }
                    }}
                    variant="outline"
                    size="sm"
                >
                    {timeRangeOptions.map((option) => (
                        <ToggleGroupItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <StatCard
                    title={t('common.total')}
                    value={statistics?.totalTraces}
                    unit={t('unit.times')}
                />
                <StatCard
                    title={t('common.total-tokens')}
                    value={statistics?.totalTokens}
                    unit={t('unit.tokens')}
                />
                <StatCard
                    title={`${t('common.average')} ${t('common.latency')}`}
                    value={
                        statistics?.avgDuration
                            ? formatDuration(statistics.avgDuration)
                            : '-'
                    }
                />
            </div>

            {error && (
                <div className="text-destructive p-4 bg-destructive/10 rounded-md">
                    {t('trace.message.loadFailed')}: {error.message}
                </div>
            )}

            {/* Table */}
            <div className="flex-1 min-h-0 w-full">
                <AsTable<TraceListItem>
                    columns={columns}
                    dataSource={traces}
                    loading={isLoading}
                    rowKey="traceId"
                    onRow={(record) => ({
                        onClick: () => {
                            setSelectedTraceId(record.traceId);
                            setDrawerOpen(true);
                        },
                        className: 'cursor-pointer',
                    })}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => `${t('common.total')}: ${total}`,
                        onChange: (newPage, newPageSize) => {
                            setPage(newPage);
                            setPageSize(newPageSize);
                        },
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </div>

            {/* Trace Detail Sheet */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:w-[80%] sm:max-w-[80%] p-0"
                >
                    {selectedTraceId && (
                        <TraceDetailPage traceId={selectedTraceId} />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default memo(TraceListPage);
