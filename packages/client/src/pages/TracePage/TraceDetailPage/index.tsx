import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    CopyOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import {
    Button,
    Descriptions,
    Flex,
    Layout,
    message,
    Space,
    Tabs,
    Tag,
    Tree,
    TreeDataNode,
} from 'antd';
import dayjs from 'dayjs';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageTitleSpan from '@/components/spans/PageTitleSpan';
import { copyToClipboard } from '@/utils/common';
import { trpc } from '@/utils/trpc';
import { SpanData } from '@shared/types/trace';
import { getNestedValue } from '@shared/utils/objectUtils';

const { Content, Sider } = Layout;

interface SpanTreeNode extends TreeDataNode {
    span: SpanData;
    children?: SpanTreeNode[];
}

// Helper functions defined outside component to avoid hoisting issues
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

const getStatusIcon = (statusCode: number) => {
    if (statusCode === 2) {
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    } else if (statusCode === 1) {
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    return null;
};

interface TraceDetailPageProps {
    traceId: string;
    onClose?: () => void;
}

const TraceDetailPage = ({ traceId }: TraceDetailPageProps) => {
    const { t } = useTranslation();
    const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
    const [idPanelOpen, setIdPanelOpen] = useState(false);

    const { data: traceData, isLoading } = trpc.getTrace.useQuery(
        { traceId },
        {
            enabled: !!traceId,
            refetchOnMount: true,
            staleTime: 0,
            gcTime: 0, // v5 renamed cacheTime to gcTime
        },
    );

    // Build tree structure from spans
    const treeData = useMemo(() => {
        if (!traceData?.spans) return [];

        const spanMap = new Map<string, SpanTreeNode>();
        const rootNodes: SpanTreeNode[] = [];

        // First pass: create all nodes
        traceData.spans.forEach((span) => {
            const duration =
                Number(
                    BigInt(span.endTimeUnixNano) -
                    BigInt(span.startTimeUnixNano),
                ) / 1e9;

            const node: SpanTreeNode = {
                key: span.spanId,
                title: (
                    <Flex align="center" gap={8}>
                        <span>{span.name}</span>
                        <span
                            style={{
                                color: 'var(--muted-foreground)',
                                fontSize: '12px',
                            }}
                        >
                            {formatDuration(duration)}
                        </span>
                        {getStatusIcon(span.status?.code || 0)}
                    </Flex>
                ),
                span,
                children: [],
            };
            spanMap.set(span.spanId, node);
        });

        // Second pass: build tree structure
        traceData.spans.forEach((span) => {
            const node = spanMap.get(span.spanId)!;
            if (!span.parentSpanId || !spanMap.has(span.parentSpanId)) {
                rootNodes.push(node);
            } else {
                const parent = spanMap.get(span.parentSpanId)!;
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(node);
            }
        });

        return rootNodes;
    }, [traceData]);

    const selectedSpan = useMemo(() => {
        if (!selectedSpanId || !traceData?.spans) return null;
        return traceData.spans.find((s) => s.spanId === selectedSpanId) || null;
    }, [selectedSpanId, traceData]);

    // Get root span for overall trace info
    const rootSpan = useMemo(() => {
        if (!traceData?.spans) return null;
        return (
            traceData.spans.find((s) => !s.parentSpanId) ||
            traceData.spans[0] ||
            null
        );
    }, [traceData]);

    // Calculate trace total duration (from earliest start to latest end)
    const traceDuration = useMemo(() => {
        if (!traceData?.spans || traceData.spans.length === 0) return 0;
        const startTimes = traceData.spans.map((s) =>
            BigInt(s.startTimeUnixNano),
        );
        const endTimes = traceData.spans.map((s) => BigInt(s.endTimeUnixNano));
        const earliestStart = startTimes.reduce((a, b) => (a < b ? a : b));
        const latestEnd = endTimes.reduce((a, b) => (a > b ? a : b));
        return Number(latestEnd - earliestStart) / 1e9;
    }, [traceData]);

    // Display span (selected or root)
    const displaySpan = selectedSpan || rootSpan;

    const handleCopy = async (text: string, label: string) => {
        const success = await copyToClipboard(text);
        if (success) {
            message.success(`${label} 已复制`);
            setIdPanelOpen(false);
        } else {
            message.error('复制失败');
        }
    };

    const getStatusText = (statusCode: number): string => {
        if (statusCode === 2) return 'ERROR';
        if (statusCode === 1) return '正常';
        return 'UNSET';
    };

    const getStatusColor = (statusCode: number): string => {
        if (statusCode === 2) return 'error';
        if (statusCode === 1) return 'success';
        return 'default';
    };

    const extractInput = (span: SpanData): unknown => {
        // Try to extract input from attributes
        const attrs = span.attributes || {};

        // Check gen_ai.input.messages
        const genAiMessages = getNestedValue(attrs, 'gen_ai.input.messages');
        if (genAiMessages !== undefined) {
            return genAiMessages;
        }

        // Check agentscope.function.input
        const agentscopeInput = getNestedValue(
            attrs,
            'agentscope.function.input',
        );
        if (agentscopeInput !== undefined) {
            return agentscopeInput;
        }

        // Check direct input attribute
        const directInput = getNestedValue(attrs, 'input');
        if (directInput !== undefined) {
            return directInput;
        }

        // Return all attributes as fallback
        return attrs;
    };

    const extractOutput = (span: SpanData): unknown => {
        // Try to extract output from attributes
        const attrs = span.attributes || {};

        // Check gen_ai.output.messages
        const genAiMessages = getNestedValue(attrs, 'gen_ai.output.messages');
        if (genAiMessages !== undefined) {
            return genAiMessages;
        }

        // Check agentscope.function.output
        const agentscopeOutput = getNestedValue(
            attrs,
            'agentscope.function.output',
        );
        if (agentscopeOutput !== undefined) {
            return agentscopeOutput;
        }

        // Check direct output attribute
        const directOutput = getNestedValue(attrs, 'output');
        if (directOutput !== undefined) {
            return directOutput;
        }

        // Return empty if no output found
        return null;
    };

    const getTotalTokens = (span: SpanData): number | undefined => {
        const attrs = span.attributes || {};
        const inputTokens = getNestedValue(
            attrs,
            'gen_ai.usage.input_tokens',
        ) as number | undefined;
        const outputTokens = getNestedValue(
            attrs,
            'gen_ai.usage.output_tokens',
        ) as number | undefined;
        if (inputTokens !== undefined || outputTokens !== undefined) {
            return (inputTokens || 0) + (outputTokens || 0);
        }
        return undefined;
    };

    const getFirstPacketDuration = (span: SpanData): number | undefined => {
        // Try to get first packet duration from attributes
        const attrs = span.attributes || {};
        // Check for first packet time in various formats
        const firstPacketTime = getNestedValue(
            attrs,
            'gen_ai.first_packet_time',
        ) as number | undefined;
        if (firstPacketTime !== undefined) {
            return firstPacketTime;
        }
        // Could also check other attributes for first packet duration
        return undefined;
    };

    return (
        <Layout style={{ height: '100%', overflow: 'hidden' }}>
            <Sider
                width={400}
                style={{
                    background: 'var(--background)',
                    borderRight: '1px solid var(--border)',
                    overflow: 'auto',
                }}
            >
                <div style={{ padding: '16px' }}>
                    <PageTitleSpan
                        title={t('trace.nodeDetails') || '节点详情'}
                    />
                    {rootSpan && (
                        <div
                            style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'var(--muted)',
                                borderRadius: '4px',
                            }}
                        >
                            <div style={{ marginBottom: '8px' }}>
                                <span
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                        marginRight: '8px',
                                    }}
                                >
                                    状态:
                                </span>
                                <Tag
                                    color={getStatusColor(
                                        rootSpan.status?.code || 0,
                                    )}
                                >
                                    {getStatusText(rootSpan.status?.code || 0)}
                                </Tag>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <span
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                        marginRight: '8px',
                                    }}
                                >
                                    调用时长:
                                </span>
                                <span style={{ fontSize: '12px' }}>
                                    {formatDuration(traceDuration)}
                                </span>
                            </div>
                            <div>
                                <span
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                        marginRight: '8px',
                                    }}
                                >
                                    调用时间:
                                </span>
                                <span style={{ fontSize: '12px' }}>
                                    {formatTime(rootSpan.startTimeUnixNano)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {isLoading ? (
                    <div style={{ padding: '16px' }}>Loading...</div>
                ) : (
                    <Tree
                        showLine
                        treeData={treeData}
                        selectedKeys={selectedSpanId ? [selectedSpanId] : []}
                        onSelect={(keys) => {
                            if (keys.length > 0) {
                                setSelectedSpanId(keys[0] as string);
                            }
                        }}
                        defaultExpandAll
                        style={{
                            padding: '0 16px 16px 16px',
                        }}
                    />
                )}
            </Sider>
            <Content
                style={{
                    background: 'var(--background)',
                    padding: '24px',
                    overflow: 'auto',
                }}
            >
                {displaySpan ? (
                    <>
                        <div
                            style={{
                                marginBottom: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h2 style={{ margin: 0 }}>{displaySpan.name}</h2>
                            <Button
                                icon={<EyeOutlined />}
                                onClick={() => setIdPanelOpen(!idPanelOpen)}
                                type="text"
                            >
                                查看 ID
                            </Button>
                        </div>

                        {/* ID Panel */}
                        {idPanelOpen && (
                            <div
                                style={{
                                    marginBottom: '16px',
                                    padding: '16px',
                                    background: 'var(--muted)',
                                    borderRadius: '4px',
                                }}
                            >
                                <Space
                                    direction="vertical"
                                    style={{ width: '100%' }}
                                    size="middle"
                                >
                                    <Flex
                                        justify="space-between"
                                        align="center"
                                    >
                                        <span>
                                            Span ID: {displaySpan.spanId}
                                        </span>
                                        <Button
                                            type="text"
                                            icon={<CopyOutlined />}
                                            size="small"
                                            onClick={() =>
                                                handleCopy(
                                                    displaySpan.spanId,
                                                    'Span ID',
                                                )
                                            }
                                        />
                                    </Flex>
                                    <Flex
                                        justify="space-between"
                                        align="center"
                                    >
                                        <span>Trace ID: {traceId}</span>
                                        <Button
                                            type="text"
                                            icon={<CopyOutlined />}
                                            size="small"
                                            onClick={() =>
                                                handleCopy(traceId, 'Trace ID')
                                            }
                                        />
                                    </Flex>
                                </Space>
                            </div>
                        )}

                        {/* Performance Metrics Sidebar */}
                        <div
                            style={{
                                marginBottom: '16px',
                                padding: '16px',
                                background: 'var(--muted)',
                                borderRadius: '4px',
                                display: 'flex',
                                gap: '24px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                        marginBottom: '4px',
                                    }}
                                >
                                    开始时间
                                </div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                    }}
                                >
                                    {formatTime(displaySpan.startTimeUnixNano)}
                                </div>
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                        marginBottom: '4px',
                                    }}
                                >
                                    调用时长
                                </div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                    }}
                                >
                                    {formatDuration(
                                        Number(
                                            BigInt(
                                                displaySpan.endTimeUnixNano,
                                            ) -
                                            BigInt(
                                                displaySpan.startTimeUnixNano,
                                            ),
                                        ) / 1e9,
                                    )}
                                </div>
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                        marginBottom: '4px',
                                    }}
                                >
                                    首包时长
                                </div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                    }}
                                >
                                    {getFirstPacketDuration(displaySpan)
                                        ? `${getFirstPacketDuration(displaySpan)}ms`
                                        : '-'}
                                </div>
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                        marginBottom: '4px',
                                    }}
                                >
                                    Token 量
                                </div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                    }}
                                >
                                    {getTotalTokens(
                                        displaySpan,
                                    )?.toLocaleString() || '-'}
                                </div>
                            </div>
                        </div>
                        <Tabs
                            defaultActiveKey="info"
                            items={[
                                {
                                    key: 'info',
                                    label: t('trace.info') || 'Info',
                                    children: (
                                        <Descriptions column={1} bordered>
                                            <Descriptions.Item
                                                label={
                                                    t('trace.input') || 'Input'
                                                }
                                            >
                                                <pre
                                                    style={{
                                                        background:
                                                            'var(--muted)',
                                                        padding: '12px',
                                                        borderRadius: '4px',
                                                        overflow: 'auto',
                                                        maxHeight: '300px',
                                                    }}
                                                >
                                                    {JSON.stringify(
                                                        extractInput(
                                                            displaySpan,
                                                        ),
                                                        null,
                                                        2,
                                                    )}
                                                </pre>
                                            </Descriptions.Item>
                                            <Descriptions.Item
                                                label={
                                                    t('trace.output') ||
                                                    'Output'
                                                }
                                            >
                                                <pre
                                                    style={{
                                                        background:
                                                            'var(--muted)',
                                                        padding: '12px',
                                                        borderRadius: '4px',
                                                        overflow: 'auto',
                                                        maxHeight: '300px',
                                                    }}
                                                >
                                                    {JSON.stringify(
                                                        extractOutput(
                                                            displaySpan,
                                                        ),
                                                        null,
                                                        2,
                                                    )}
                                                </pre>
                                            </Descriptions.Item>
                                        </Descriptions>
                                    ),
                                },
                                {
                                    key: 'attributes',
                                    label:
                                        t('trace.attributes') || 'Attributes',
                                    children: (
                                        <pre
                                            style={{
                                                background: 'var(--muted)',
                                                padding: '12px',
                                                borderRadius: '4px',
                                                overflow: 'auto',
                                            }}
                                        >
                                            {JSON.stringify(
                                                displaySpan.attributes,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    ),
                                },
                            ]}
                        />
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        {t('trace.selectSpan') ||
                            'Select a span to view details'}
                    </div>
                )}
            </Content>
        </Layout>
    );
};

export default memo(TraceDetailPage);
