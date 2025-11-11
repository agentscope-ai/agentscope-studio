import {
    CheckCircleOutlined,
    CopyOutlined,
    InfoCircleOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import {
    Button,
    Drawer,
    Flex,
    Input,
    message,
    Popover,
    Select,
    Space,
    Table,
    TableColumnsType,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import dayjs from 'dayjs';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import NumberCounter from '@/components/numbers/NumberCounter';
import { copyToClipboard } from '@/utils/common';
import { trpc } from '@/utils/trpc';
import TraceDetailPage from '../TraceDetailPage';

const { Option } = Select;

interface TraceListItem {
    traceId: string;
    name: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: number;
    spanCount: number;
    totalTokens?: number;
    input?: unknown;
    output?: unknown;
    nodeType?: string;
}

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
                    <Tooltip title={title}>
                        <InfoCircleOutlined
                            style={{
                                fontSize: '12px',
                                color: 'var(--muted-foreground)',
                            }}
                        />
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
    const [searchText, setSearchText] = useState<string>('');
    const [searchField, setSearchField] = useState<string>('traceId');
    const [timeRange, setTimeRange] = useState<string>('week');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

    // Calculate time range (convert to nanoseconds as string)
    const timeRangeFilter = useMemo(() => {
        const now = dayjs();
        let startTime: string | undefined;

        switch (timeRange) {
            case 'week':
                startTime = (
                    BigInt(now.subtract(7, 'day').startOf('day').valueOf()) *
                    BigInt(1_000_000)
                ).toString();
                break;
            case 'month':
                startTime = (
                    BigInt(now.subtract(30, 'day').startOf('day').valueOf()) *
                    BigInt(1_000_000)
                ).toString();
                break;
            case 'all':
            default:
                startTime = undefined;
                break;
        }
        const endTime = (
            BigInt(now.endOf('day').valueOf()) * BigInt(1_000_000)
        ).toString();

        return { startTime, endTime };
    }, [timeRange]);

    const { data, isLoading, error } = trpc.getTraceList.useQuery(
        {
            limit: pageSize,
            offset: (page - 1) * pageSize,
            ...timeRangeFilter,
        },
        {
            refetchOnMount: true,
            staleTime: 0,
            gcTime: 0,
        },
    );

    const { data: statistics } = trpc.getTraceStatistic.useQuery(
        timeRangeFilter,
        {
            refetchOnMount: true,
            staleTime: 0,
            gcTime: 0,
        },
    );

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
                <Flex align="center" gap={4}>
                    <CheckCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span>ERROR</span>
                </Flex>
            );
        } else if (status === 1) {
            return (
                <Flex align="center" gap={4}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>正常</span>
                </Flex>
            );
        }
        return (
            <Flex align="center" gap={4}>
                <CheckCircleOutlined style={{ color: '#999' }} />
                <span>UNSET</span>
            </Flex>
        );
    };

    const getNodeTypeTag = (nodeType?: string) => {
        const type = nodeType || 'CHAIN';
        return (
            <Tag
                color="green"
                style={{
                    borderRadius: '4px',
                    fontWeight: 600,
                    padding: '2px 8px',
                }}
            >
                {type}
            </Tag>
        );
    };

    const getLatencyColor = (seconds: number): string => {
        if (seconds > 30) return '#ff4d4f'; // red
        if (seconds > 10) return '#fa8c16'; // orange
        return '#52c41a'; // green
    };

    const handleCopyTraceId = async (traceId: string) => {
        const success = await copyToClipboard(traceId);
        if (success) {
            message.success('Trace ID 已复制');
        } else {
            message.error('复制失败');
        }
    };

    const columns: TableColumnsType<TraceListItem> = [
        {
            title: t('trace.nodeType') || '节点类型',
            key: 'nodeType',
            width: '10%',
            render: (_, record) => getNodeTypeTag(record.nodeType),
        },
        {
            title: t('trace.name') || '名称',
            key: 'name',
            width: '15%',
            render: (_, record) => (
                <Flex align="center" gap={4}>
                    <Typography.Link
                        style={{
                            padding: 0,
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTraceId(record.traceId);
                            setDrawerOpen(true);
                        }}
                    >
                        {record.name}
                    </Typography.Link>
                    <Popover
                        content={
                            <Space
                                direction="vertical"
                                size="small"
                                style={{ fontSize: '12px' }}
                            >
                                <div>Trace ID: </div>
                                <div>
                                    {record.traceId}
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyTraceId(record.traceId);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: 0,
                                            marginLeft: '8px',
                                        }}
                                    ></Button>
                                </div>
                            </Space>
                        }
                        placement="topLeft"
                        trigger="click"
                    >
                        <InfoCircleOutlined
                            style={{
                                fontSize: '12px',
                                color: 'var(--muted-foreground)',
                                cursor: 'pointer',
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        />
                    </Popover>
                </Flex>
            ),
        },

        {
            title: t('trace.callTime') || '调用时间',
            key: 'startTime',
            width: '12%',
            render: (_, record) => formatTime(record.startTime),
        },
        {
            title: t('trace.latency') || '延时',
            key: 'duration',
            width: '10%',
            render: (_, record) => (
                <span style={{ color: getLatencyColor(record.duration) }}>
                    {formatDuration(record.duration)}
                </span>
            ),
        },
        {
            title: t('trace.tokenCount') || 'Token 量',
            key: 'totalTokens',
            width: '8%',
            render: (_, record) =>
                record.totalTokens ? record.totalTokens.toLocaleString() : '-',
        },
        {
            title: t('trace.status') || '状态',
            key: 'status',
            width: '10%',
            render: (_, record) => getStatusDisplay(record.status),
        },
    ];

    const filteredData = useMemo(() => {
        if (!data?.traces) return [];
        return data.traces.filter((trace) => {
            if (!searchText) return true;
            const searchValue = searchText.toLowerCase();
            switch (searchField) {
                case 'traceId':
                    return trace.traceId.toLowerCase().includes(searchValue);
                case 'name':
                    return trace.name.toLowerCase().includes(searchValue);
                default:
                    return (
                        trace.traceId.toLowerCase().includes(searchValue) ||
                        trace.name.toLowerCase().includes(searchValue)
                    );
            }
        });
    }, [data?.traces, searchText, searchField]);

    // Calculate average first packet time (simplified - using 0 for now)
    const avgFirstPacketTime = 0.6; // This would need to be calculated from spans

    return (
        <Flex
            style={{ width: '100%', height: '100%', padding: '32px 48px' }}
            vertical={true}
            gap="large"
        >
            {/* Top section: Time selection and statistics */}
            <Flex vertical={false} justify="space-between" align="flex-start">
                <Select
                    value={timeRange}
                    onChange={setTimeRange}
                    style={{ width: 120 }}
                >
                    <Option value="week">一周</Option>
                    <Option value="month">一月</Option>
                    <Option value="all">全部</Option>
                </Select>

                <div
                    className="grid grid-cols-4 gap-4"
                    style={{ flex: 1, marginLeft: '24px' }}
                >
                    <StatCard
                        title="调用次数"
                        value={statistics?.totalTraces}
                        unit="次"
                    />
                    <StatCard
                        title="LLM Token 总量"
                        value={statistics?.totalTokens}
                        unit="Tokens"
                    />
                    <StatCard
                        title="平均延时"
                        value={
                            statistics?.avgDuration
                                ? formatDuration(statistics.avgDuration)
                                : '-'
                        }
                    />
                    <StatCard
                        title="平均首包时长"
                        value={`${avgFirstPacketTime}ms`}
                    />
                </div>
            </Flex>

            {/* Search bar */}
            <Flex vertical={false} gap="middle" align="center">
                <Select
                    value={searchField}
                    onChange={setSearchField}
                    style={{ width: 120 }}
                >
                    <Option value="traceId">traceId</Option>
                    <Option value="name">名称</Option>
                </Select>
                <Input
                    value={searchText}
                    onChange={(event) => {
                        setSearchText(event.target.value);
                    }}
                    style={{
                        flex: 1,
                        borderRadius: 'calc(var(--radius) - 2px)',
                    }}
                    variant="outlined"
                    placeholder={`搜索 ${searchField === 'traceId' ? 'traceId' : '名称'}...`}
                    prefix={
                        <SearchOutlined
                            style={{
                                marginRight: '8px',
                                color: 'var(--muted-foreground)',
                            }}
                        />
                    }
                />
            </Flex>

            {error && (
                <div style={{ color: 'red', padding: '16px' }}>
                    Error: {error.message || 'Failed to load traces'}
                </div>
            )}

            {/* Table */}
            <Table<TraceListItem>
                columns={columns}
                dataSource={filteredData}
                loading={isLoading}
                rowKey="traceId"
                pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: data?.total || 0,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (newPage, newPageSize) => {
                        setPage(newPage);
                        setPageSize(newPageSize);
                    },
                }}
            />

            {/* Trace Detail Drawer */}
            <Drawer
                title={null}
                placement="right"
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedTraceId(null);
                }}
                open={drawerOpen}
                width="80%"
                styles={{
                    body: {
                        padding: 0,
                    },
                }}
                closable={true}
                maskClosable={true}
            >
                {selectedTraceId && (
                    <TraceDetailPage
                        traceId={selectedTraceId}
                        onClose={() => {
                            setDrawerOpen(false);
                            setSelectedTraceId(null);
                        }}
                    />
                )}
            </Drawer>
        </Flex>
    );
};

export default memo(TraceListPage);
