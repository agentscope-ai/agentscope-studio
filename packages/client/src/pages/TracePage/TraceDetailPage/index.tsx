import dayjs from 'dayjs';
import {
    CheckCircle2Icon,
    ChevronDownIcon,
    ChevronRightIcon,
    CopyIcon,
    EyeIcon,
    XCircleIcon,
} from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageTitleSpan from '@/components/spans/PageTitleSpan';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { useTraceContext } from '@/context/TraceContext';
import { copyToClipboard } from '@/utils/common';
import { SpanData } from '@shared/types/trace';
import { getNestedValue } from '@shared/utils/objectUtils';

interface SpanTreeNode {
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
        return <XCircleIcon className="size-4 text-destructive" />;
    } else if (statusCode === 1) {
        return <CheckCircle2Icon className="size-4 text-green-500" />;
    }
    return null;
};

interface TraceDetailPageProps {
    traceId: string;
}

const TraceDetailPage = ({ traceId }: TraceDetailPageProps) => {
    const { t } = useTranslation();
    const {
        traceData,
        isLoadingTrace: isLoading,
        selectedTraceId,
        setSelectedTraceId,
    } = useTraceContext();
    const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
    const [idPanelOpen, setIdPanelOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Sync traceId prop with context's selectedTraceId
    useEffect(() => {
        if (traceId && traceId !== selectedTraceId) {
            setSelectedTraceId(traceId);
        }
    }, [traceId, selectedTraceId, setSelectedTraceId]);

    // Build tree structure from spans
    const treeData = useMemo(() => {
        if (!traceData?.spans) return [];

        const spanMap = new Map<string, SpanTreeNode>();
        const rootNodes: SpanTreeNode[] = [];

        // First pass: create all nodes
        traceData.spans.forEach((span) => {
            const node: SpanTreeNode = {
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

    const handleCopy = async (text: string) => {
        const success = await copyToClipboard(text);
        if (success) {
            // TODO: Add toast notification
            console.log(t('trace.message.copySuccess'));
            setIdPanelOpen(false);
        } else {
            console.error(t('trace.message.copyFailed'));
        }
    };

    const getStatusText = (statusCode: number): string => {
        if (statusCode === 2) return t('trace.status.error');
        if (statusCode === 1) return t('trace.status.ok');
        return t('trace.status.unset');
    };

    const getStatusColor = (statusCode: number): string => {
        if (statusCode === 2) return 'bg-destructive/10 text-destructive';
        if (statusCode === 1) return 'bg-green-500/10 text-green-500';
        return 'bg-muted text-muted-foreground';
    };

    const extractInput = (span: SpanData): unknown => {
        const attrs = span.attributes || {};
        const genAiMessages = getNestedValue(attrs, 'gen_ai.input.messages');
        if (genAiMessages !== undefined) {
            return genAiMessages;
        }
        const agentscopeInput = getNestedValue(
            attrs,
            'agentscope.function.input',
        );
        if (agentscopeInput !== undefined) {
            return agentscopeInput;
        }
        const directInput = getNestedValue(attrs, 'input');
        if (directInput !== undefined) {
            return directInput;
        }
        return attrs;
    };

    const extractOutput = (span: SpanData): unknown => {
        const attrs = span.attributes || {};
        const genAiMessages = getNestedValue(attrs, 'gen_ai.output.messages');
        if (genAiMessages !== undefined) {
            return genAiMessages;
        }
        const agentscopeOutput = getNestedValue(
            attrs,
            'agentscope.function.output',
        );
        if (agentscopeOutput !== undefined) {
            return agentscopeOutput;
        }
        const directOutput = getNestedValue(attrs, 'output');
        if (directOutput !== undefined) {
            return directOutput;
        }
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

    const renderTreeNode = (node: SpanTreeNode, level = 0): React.ReactNode => {
        const duration =
            Number(
                BigInt(node.span.endTimeUnixNano) -
                    BigInt(node.span.startTimeUnixNano),
            ) / 1e9;
        const isSelected = selectedSpanId === node.span.spanId;
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={node.span.spanId} className="w-full">
                <div
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted ${
                        isSelected ? 'bg-muted' : ''
                    }`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => setSelectedSpanId(node.span.spanId)}
                >
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const newExpanded = new Set(expandedNodes);
                                if (newExpanded.has(node.span.spanId)) {
                                    newExpanded.delete(node.span.spanId);
                                } else {
                                    newExpanded.add(node.span.spanId);
                                }
                                setExpandedNodes(newExpanded);
                            }}
                            className="p-0.5"
                        >
                            {expandedNodes.has(node.span.spanId) ? (
                                <ChevronDownIcon className="size-3" />
                            ) : (
                                <ChevronRightIcon className="size-3" />
                            )}
                        </button>
                    )}
                    {!hasChildren && <div className="w-4" />}
                    <span className="flex-1 text-sm">{node.span.name}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDuration(duration)}
                    </span>
                    {getStatusIcon(node.span.status?.code || 0)}
                </div>
                {hasChildren &&
                    expandedNodes.has(node.span.spanId) &&
                    node.children?.map((child) =>
                        renderTreeNode(child, level + 1),
                    )}
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-full lg:w-[400px] lg:min-w-[400px] bg-background border-b lg:border-b-0 lg:border-r border-border overflow-auto max-h-[40vh] lg:max-h-none">
                <div className="p-4">
                    <PageTitleSpan title={t('trace.nodeDetails')} />
                    {rootSpan && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                            <div className="mb-2">
                                <span className="text-xs text-muted-foreground mr-2">
                                    {t('common.status')}:
                                </span>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded ${getStatusColor(
                                        rootSpan.status?.code || 0,
                                    )}`}
                                >
                                    {getStatusText(rootSpan.status?.code || 0)}
                                </span>
                            </div>
                            <div className="mb-2">
                                <span className="text-xs text-muted-foreground mr-2">
                                    {t('table.column.duration')}:
                                </span>
                                <span className="text-xs">
                                    {formatDuration(traceDuration)}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground mr-2">
                                    {t('table.column.startTime')}:
                                </span>
                                <span className="text-xs">
                                    {formatTime(rootSpan.startTimeUnixNano)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {isLoading ? (
                    <div className="p-4">{t('trace.detail.loading')}</div>
                ) : (
                    <div className="p-4 pt-0">
                        {treeData.map((node) => renderTreeNode(node))}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-background p-4 sm:p-6 overflow-auto min-h-0">
                {displaySpan ? (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                            <h2 className="m-0 text-lg sm:text-xl break-words">
                                {displaySpan.name}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIdPanelOpen(!idPanelOpen)}
                                className="shrink-0"
                            >
                                <EyeIcon className="size-4 mr-2" />
                                {t('common.id')}
                            </Button>
                        </div>

                        {/* ID Panel */}
                        {idPanelOpen && (
                            <div className="mb-4 p-4 bg-muted rounded-md">
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-sm break-all min-w-0">
                                            {t('trace.spanId')}:{' '}
                                            {displaySpan.spanId}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() =>
                                                handleCopy(displaySpan.spanId)
                                            }
                                            className="shrink-0"
                                        >
                                            <CopyIcon className="size-3" />
                                        </Button>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-sm break-all min-w-0">
                                            {t('trace.traceId')}: {traceId}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => handleCopy(traceId)}
                                            className="shrink-0"
                                        >
                                            <CopyIcon className="size-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Performance Metrics */}
                        <div className="mb-4 p-4 bg-muted rounded-md grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                    {t('common.start-time')}
                                </div>
                                <div className="text-sm font-medium break-words">
                                    {formatTime(displaySpan.startTimeUnixNano)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                    {t('table.column.duration')}
                                </div>
                                <div className="text-sm font-medium">
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
                                <div className="text-xs text-muted-foreground mb-1">
                                    {t('common.total-tokens')}
                                </div>
                                <div className="text-sm font-medium">
                                    {getTotalTokens(
                                        displaySpan,
                                    )?.toLocaleString() || '-'}
                                </div>
                            </div>
                        </div>

                        {/* Tabs using Accordion */}
                        <Accordion
                            type="single"
                            collapsible
                            defaultValue="info"
                        >
                            <AccordionItem value="info">
                                <AccordionTrigger>
                                    {t('common.metadata')}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-medium">
                                                    {t('common.input')}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleCopy(
                                                            JSON.stringify(
                                                                extractInput(
                                                                    displaySpan,
                                                                ),
                                                                null,
                                                                2,
                                                            ),
                                                        )
                                                    }
                                                    className="h-6 w-6"
                                                >
                                                    <CopyIcon className="size-3" />
                                                </Button>
                                            </div>
                                            <pre className="bg-muted p-3 rounded-md overflow-auto max-h-[300px] text-xs">
                                                {JSON.stringify(
                                                    extractInput(displaySpan),
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </div>
                                        <Separator />
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-medium">
                                                    {t('common.output')}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleCopy(
                                                            JSON.stringify(
                                                                extractOutput(
                                                                    displaySpan,
                                                                ),
                                                                null,
                                                                2,
                                                            ),
                                                        )
                                                    }
                                                    className="h-6 w-6"
                                                >
                                                    <CopyIcon className="size-3" />
                                                </Button>
                                            </div>
                                            <pre className="bg-muted p-3 rounded-md overflow-auto max-h-[300px] text-xs">
                                                {JSON.stringify(
                                                    extractOutput(displaySpan),
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="attributes">
                                <AccordionTrigger>
                                    {t('common.attributes')}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-sm font-medium">
                                            {t('common.attributes')}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() =>
                                                handleCopy(
                                                    JSON.stringify(
                                                        displaySpan.attributes,
                                                        null,
                                                        2,
                                                    ),
                                                )
                                            }
                                            className="h-6 w-6"
                                        >
                                            <CopyIcon className="size-3" />
                                        </Button>
                                    </div>
                                    <pre className="bg-muted p-3 rounded-md overflow-auto text-xs">
                                        {JSON.stringify(
                                            displaySpan.attributes,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </>
                ) : (
                    <div className="text-center p-12 text-muted-foreground">
                        {t('trace.selectSpan')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(TraceDetailPage);
