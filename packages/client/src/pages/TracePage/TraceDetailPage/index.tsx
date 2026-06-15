import {
    Bot,
    Braces,
    Brain,
    ChartGantt,
    CheckCircle2Icon,
    Download,
    ListFilter,
    ListTree,
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    Circle,
    CopyIcon,
    EyeIcon,
    Expand,
    FileText,
    Fullscreen,
    Layers,
    Link2,
    LogIn,
    Maximize2,
    Minimize2,
    Palette,
    PhoneCall,
    RefreshCw,
    Wrench,
    XCircleIcon,
} from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tabs } from 'antd';

import PageTitleSpan from '@/components/spans/PageTitleSpan';
import { Button } from '@/components/ui/button.tsx';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { useTraceContext } from '@/context/TraceContext';
import {
    ChatMessagesList,
    isChatOp,
    parseMessages,
    type ChatMessage,
} from './ChatMessagesList';
import {
    RetrievalDocumentsList,
    parseRetrievalDocuments,
} from './RetrievalDocumentsList';
import {
    copyToClipboard,
    formatDateTime,
    formatDurationWithUnit,
} from '@/utils/common';
import { SpanData } from '@shared/types/trace';
import { getNestedValue } from '@shared/utils/objectUtils';
import { spansToOtlpJson } from '@shared/utils/otlpExport';
import JsonView from '@uiw/react-json-view';

interface SpanTreeNode {
    span: SpanData;
    children?: SpanTreeNode[];
}

const OP_NONE_KEY = '__none__';

const GEN_AI_OPERATION_COLORS: Record<string, string> = {
    chain: 'hsl(280 65% 55% / 0.8)',
    chat: 'hsl(142 71% 45% / 0.8)',
    create_agent: 'hsl(271 91% 65% / 0.8)',
    embeddings: 'hsl(25 95% 53% / 0.8)',
    enter: 'hsl(195 90% 55% / 0.8)',
    execute_tool: 'hsl(174 72% 45% / 0.8)',
    generate_content: 'hsl(239 84% 67% / 0.8)',
    invoke_agent: 'hsl(217 91% 60% / 0.8)',
    react: 'hsl(160 90% 45% / 0.8)',
    retrieval: 'hsl(43 96% 56% / 0.8)',
    text_completion: 'hsl(350 89% 60% / 0.8)',
};

const getFlameBarColor = (span: SpanData): string => {
    const attrs = span.attributes || {};
    const op = (getNestedValue(attrs, 'gen_ai.operation.name') ??
        attrs['gen_ai.operation.name']) as string | undefined;
    return (op && GEN_AI_OPERATION_COLORS[op]) ?? 'hsl(0 0% 60% / 0.6)';
};

function getGenAiOperationName(span: SpanData): string | undefined {
    const attrs = span.attributes || {};
    return (getNestedValue(attrs, 'gen_ai.operation.name') ??
        attrs['gen_ai.operation.name']) as string | undefined;
}

function getReactStepMeta(span: SpanData): {
    round?: number;
    finishReason?: string;
} {
    const attrs = span?.attributes ?? {};
    const round = getNestedValue(attrs, 'gen_ai.react.round') ??
        attrs['gen_ai.react.round'];
    const finishReason = getNestedValue(attrs, 'gen_ai.react.finish_reason') ??
        attrs['gen_ai.react.finish_reason'];
    const roundNum =
        typeof round === 'number'
            ? round
            : typeof round === 'string'
              ? parseInt(round, 10)
              : undefined;
    return {
        round: Number.isFinite(roundNum) ? roundNum : undefined,
        finishReason: typeof finishReason === 'string' ? finishReason : undefined,
    };
}

/** 将 finish_reason 转为可读标签，如 stop -> Stop, max_turns -> Max Turns */
function formatFinishReason(reason: string): string {
    return reason
        .split(/[_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

function getSpanTypeIcon(span: SpanData): React.ReactNode {
    const op = getGenAiOperationName(span);
    const iconClassName = 'size-3.5 shrink-0 text-muted-foreground';
    if (!op) {
        return <PhoneCall className={iconClassName} />;
    }
    switch (op) {
        case 'chat':
        case 'generate_content':
        case 'text_completion':
            return <Brain className={iconClassName} />;
        case 'invoke_agent':
        case 'create_agent':
            return <Bot className={iconClassName} />;
        case 'execute_tool':
            return <Wrench className={iconClassName} />;
        case 'retrieval':
            return <FileText className={iconClassName} />;
        case 'embeddings':
            return <Layers className={iconClassName} />;
        case 'format':
            return <Palette className={iconClassName} />;
        case 'invoke_generic_function':
            return <Braces className={iconClassName} />;
        case 'enter':
            return <LogIn className={iconClassName} />;
        case 'react':
            return <RefreshCw className={iconClassName} />;
        case 'chain':
            return <Link2 className={iconClassName} />;
        default:
            return <Circle className={iconClassName} />;
    }
}

const getStatusIcon = (statusCode: number) => {
    if (statusCode === 2) {
        return <XCircleIcon className="size-4 text-destructive" />;
    } else if (statusCode === 1) {
        return <CheckCircle2Icon className="size-4 text-green-500" />;
    }
    return null;
};

/** Attributes 转 key-value 列表，不递归展开嵌套对象 */
function flattenAttributes(
    attrs: Record<string, unknown> | undefined,
): Array<{ key: string; value: unknown }> {
    if (!attrs || typeof attrs !== 'object') return [];
    return Object.entries(attrs)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, value }));
}

const VALUE_LINE_LIMIT = 5;

/** Format value for display in key-value list */
function formatAttributeValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value, null, 2);
}

/** Try parse string as JSON, return parsed object or null */
function tryParseJson(str: string): object | null {
    const trimmed = str.trim();
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        try {
            const parsed = JSON.parse(str);
            return typeof parsed === 'object' && parsed !== null ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
}

/** 格式化用于复制的值：字符串原样返回，对象用 JSON 格式化 */
function formatForCopy(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value ?? null, null, 2);
}

/** 根据值类型渲染：JSON 用 JsonView，否则用纯文本 */
function ValueDisplay({
    value,
    className = '',
}: {
    value: unknown;
    className?: string;
}) {
    if (value === undefined || value === null) {
        return (
            <div className={`text-sm text-muted-foreground ${className}`}>—</div>
        );
    }
    if (typeof value === 'string') {
        const parsed = tryParseJson(value);
        if (parsed) {
            return (
                <div className={`rounded-md border border-border bg-muted/30 p-3 overflow-x-auto text-xs ${className}`}>
                    <JsonView
                        value={parsed}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        collapsed={false}
                        shortenTextAfterLength={0}
                    />
                </div>
            );
        }
        return (
            <pre className={`m-0 text-sm whitespace-pre-wrap break-words font-sans ${className}`}>
                {value}
            </pre>
        );
    }
    if (typeof value === 'object') {
        return (
            <div className={`rounded-md border border-border bg-muted/30 p-3 overflow-x-auto text-xs ${className}`}>
                <JsonView
                    value={value as object}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    collapsed={false}
                    shortenTextAfterLength={0}
                />
            </div>
        );
    }
    return (
        <pre className={`m-0 text-sm font-sans ${className}`}>
            {String(value)}
        </pre>
    );
}

interface AttributesKeyValueListProps {
    attributes: Record<string, unknown> | undefined;
    onCopy?: (text: string) => void;
}

const AttributesKeyValueList = memo(function AttributesKeyValueList({
    attributes,
    onCopy,
}: AttributesKeyValueListProps) {
    const { t } = useTranslation();
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [modalValue, setModalValue] = useState<{
        key: string;
        displayValue: string;
    } | null>(null);

    const rows = useMemo(
        () => flattenAttributes(attributes),
        [attributes],
    );

    const toggleExpand = (rowKey: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(rowKey)) {
                next.delete(rowKey);
            } else {
                next.add(rowKey);
            }
            return next;
        });
    };

    if (rows.length === 0) {
        return (
            <div className="text-sm text-muted-foreground py-8 text-center">
                —
            </div>
        );
    }

    return (
        <>
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="text-left font-medium text-muted-foreground px-2 py-2 w-[180px] min-w-[140px]">
                                {t('trace.attrsKey')}
                            </th>
                            <th className="text-left font-medium text-muted-foreground px-2 py-2">
                                {t('trace.attrsValue')}
                            </th>
                            <th className="px-2 py-2" aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ key, value }, index) => {
                            const displayValue = formatAttributeValue(value);
                            const lineCount =
                                displayValue.split('\n').length;
                            const exceedsLimit = lineCount > VALUE_LINE_LIMIT;
                            const isExpanded = expandedRows.has(key);
                            const isLong =
                                displayValue.length > 120 ||
                                displayValue.includes('\n');
                            return (
                                <tr
                                    key={key}
                                    className={`group border-b border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors ${
                                        index % 2 === 1 ? 'bg-muted/20' : ''
                                    }`}
                                >
                                    <td className="px-2 py-1.5 align-middle w-[180px] min-w-[140px]">
                                        <code className="text-xs font-mono text-foreground/90 bg-muted/50 px-1.5 py-0.5 rounded break-all block">
                                            {key}
                                        </code>
                                    </td>
                                    <td className="px-2 py-1.5 align-middle min-w-0">
                                        <div
                                            className={`relative min-w-0 overflow-x-auto ${
                                                exceedsLimit && !isExpanded
                                                    ? 'line-clamp-5 overflow-y-hidden'
                                                    : ''
                                            }`}
                                        >
                                            <pre
                                                className={`m-0 font-sans text-foreground/85 whitespace-pre-wrap break-words ${
                                                    isLong ? 'text-[10px]' : 'text-xs'
                                                }`}
                                            >
                                                {displayValue}
                                            </pre>
                                            {exceedsLimit && !isExpanded && (
                                                <button
                                                    type="button"
                                                    className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-1.5 pt-3 bg-gradient-to-t from-background via-background/70 to-transparent cursor-pointer text-left hover:from-background/95"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleExpand(key);
                                                    }}
                                                    title={t('trace.expandValue')}
                                                >
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground bg-muted/80 border border-border/60 shrink-0 hover:bg-muted">
                                                        {t('trace.collapsedHint', {
                                                            count: lineCount - VALUE_LINE_LIMIT,
                                                        })}
                                                        <Expand className="size-2.5" />
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 align-middle">
                                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {exceedsLimit && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-7 w-7 mr-auto"
                                                            onClick={() =>
                                                                toggleExpand(key)
                                                            }
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUpIcon className="size-3" />
                                                            ) : (
                                                                <Expand className="size-3" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {isExpanded
                                                            ? t(
                                                                  'trace.collapseValue',
                                                              )
                                                            : t(
                                                                  'trace.expandValue',
                                                              )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="h-7 w-7"
                                                        onClick={() =>
                                                            setModalValue({
                                                                key,
                                                                displayValue,
                                                            })
                                                        }
                                                    >
                                                        <Maximize2 className="size-3" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {t(
                                                        'trace.viewInModal',
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                            {onCopy && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-7 w-7"
                                                            onClick={() =>
                                                                onCopy(
                                                                    displayValue,
                                                                )
                                                            }
                                                        >
                                                            <CopyIcon className="size-3" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {t(
                                                            'trace.copyValue',
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Value detail modal */}
            <Dialog
                open={!!modalValue}
                onOpenChange={(open) =>
                    !open && setModalValue(null)
                }
            >
                <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-sm break-all">
                            {modalValue?.key}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto min-h-0 rounded-md border border-border bg-muted/30 p-4">
                        {modalValue && (
                            <>
                                {(() => {
                                    const parsed = tryParseJson(
                                        modalValue.displayValue,
                                    );
                                    if (parsed) {
                                        return (
                                            <JsonView
                                                value={parsed}
                                                displayDataTypes={false}
                                                displayObjectSize={false}
                                                collapsed={false}
                                                shortenTextAfterLength={0}
                                            />
                                        );
                                    }
                                    return (
                                        <pre className="m-0 text-xs font-sans whitespace-pre-wrap break-words">
                                            {modalValue.displayValue}
                                        </pre>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
});

interface TraceDetailPageProps {
    traceId: string;
    isFullWidth?: boolean;
    onToggleFullWidth?: () => void;
}

const TraceDetailPage = ({
    traceId,
    isFullWidth = false,
    onToggleFullWidth,
}: TraceDetailPageProps) => {
    const { t } = useTranslation();
    const {
        traceData,
        isLoadingTrace: isLoading,
        selectedTraceId,
        setSelectedTraceId,
    } = useTraceContext();
    const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
    const [idPanelOpen, setIdPanelOpen] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<string>('chatHistory');
    const [isWaterfallView, setIsWaterfallView] = useState(false);
    // 瀑布图操作类型过滤：空 Set 表示显示全部，非空则仅显示选中的类型
    const [waterfallOpFilter, setWaterfallOpFilter] = useState<Set<string>>(
        new Set(),
    );
    // 瀑布图：收起的 react step 组（Set 中的 id 为收起状态）
    const [collapsedReactSteps, setCollapsedReactSteps] = useState<Set<string>>(
        new Set(),
    );
    // JSON 弹窗：用于在弹窗中查看 Input/Output/Message 的原始 JSON
    const [jsonModalContent, setJsonModalContent] = useState<{
        title: string;
        value: unknown;
    } | null>(null);

    // Sync traceId prop with context's selectedTraceId
    useEffect(() => {
        if (traceId && traceId !== selectedTraceId) {
            setSelectedTraceId(traceId);
        }
    }, [traceId, selectedTraceId, setSelectedTraceId]);

    // Use all spans from trace data
    const filteredSpans = useMemo(() => {
        if (!traceData?.spans) return [];
        return traceData.spans;
    }, [traceData]);

    // Build tree structure from spans
    const treeData = useMemo(() => {
        if (!filteredSpans.length) return [];

        const spanMap = new Map<string, SpanTreeNode>();
        const rootNodes: SpanTreeNode[] = [];

        // First pass: create all nodes
        filteredSpans.forEach((span) => {
            const node: SpanTreeNode = {
                span,
                children: [],
            };
            spanMap.set(span.spanId, node);
        });

        // Second pass: build tree structure
        filteredSpans.forEach((span) => {
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
    }, [filteredSpans]);

    // Default expand all nodes in the waterfall tree
    useEffect(() => {
        const collectExpandableIds = (nodes: SpanTreeNode[]): Set<string> => {
            const ids = new Set<string>();
            nodes.forEach((node) => {
                if (node.children && node.children.length > 0) {
                    ids.add(node.span.spanId);
                    collectExpandableIds(node.children).forEach((id) =>
                        ids.add(id),
                    );
                }
            });
            return ids;
        };
        setExpandedNodes(collectExpandableIds(treeData));
    }, [treeData]);

    const selectedSpan = useMemo(() => {
        if (!selectedSpanId || !filteredSpans.length) return null;
        return filteredSpans.find((s) => s.spanId === selectedSpanId) || null;
    }, [selectedSpanId, filteredSpans]);

    // Get root span for overall trace info
    const rootSpan = useMemo(() => {
        if (!filteredSpans.length) return null;
        return (
            filteredSpans.find((s) => !s.parentSpanId) ||
            filteredSpans[0] ||
            null
        );
    }, [filteredSpans]);

    // Calculate trace total duration (from earliest start to latest end)
    const traceDuration = useMemo(() => {
        if (!filteredSpans.length) return 0;
        const startTimes = filteredSpans.map((s) =>
            BigInt(s.startTimeUnixNano),
        );
        const endTimes = filteredSpans.map((s) => BigInt(s.endTimeUnixNano));
        const earliestStart = startTimes.reduce((a, b) => (a < b ? a : b));
        const latestEnd = endTimes.reduce((a, b) => (a > b ? a : b));
        return Number(latestEnd - earliestStart) / 1e9;
    }, [filteredSpans]);

    // 瀑布图视图：按开始时间排序的扁平 span 列表
    const waterfallSortedSpans = useMemo(() => {
        if (!filteredSpans.length) return [];
        return [...filteredSpans].sort((a, b) => {
            const ta = BigInt(a.startTimeUnixNano);
            const tb = BigInt(b.startTimeUnixNano);
            return ta < tb ? -1 : ta > tb ? 1 : 0;
        });
    }, [filteredSpans]);

    // 瀑布图：当前 trace 中出现的所有 gen_ai.operation.name 类型
    const waterfallUniqueOpTypes = useMemo(() => {
        const set = new Set<string>();
        filteredSpans.forEach((s) => {
            const op = getGenAiOperationName(s);
            set.add(op ?? OP_NONE_KEY);
        });
        return Array.from(set).sort((a, b) => {
            if (a === OP_NONE_KEY) return 1;
            if (b === OP_NONE_KEY) return -1;
            return a.localeCompare(b);
        });
    }, [filteredSpans]);

    // 瀑布图：根据操作类型过滤后的 span 列表（空过滤 = 显示全部）
    const waterfallFilteredSpans = useMemo(() => {
        if (!waterfallOpFilter.size) return waterfallSortedSpans;
        return waterfallSortedSpans.filter((span) => {
            const op = getGenAiOperationName(span) ?? OP_NONE_KEY;
            return waterfallOpFilter.has(op);
        });
    }, [waterfallSortedSpans, waterfallOpFilter]);

    // 瀑布图：按 react step 分组，用于渲染带边框的组（基于过滤后的 spans）
    const waterfallReactStepGroups = useMemo(() => {
        if (!waterfallFilteredSpans.length) return [];
        const spanMap = new Map<string, SpanData>(
            filteredSpans.map((s) => [s.spanId, s]),
        );
        const getReactStepId = (span: SpanData): string | null => {
            let current: SpanData | undefined = span;
            while (current) {
                if (getGenAiOperationName(current) === 'react') {
                    return current.spanId;
                }
                current = current.parentSpanId
                    ? spanMap.get(current.parentSpanId)
                    : undefined;
            }
            return null;
        };
        const groups: Array<{
            reactStepId: string | null;
            reactSpan?: SpanData;
            spans: SpanData[];
        }> = [];
        let currentGroup: {
            reactStepId: string | null;
            reactSpan?: SpanData;
            spans: SpanData[];
        } | null = null;
        for (const span of waterfallFilteredSpans) {
            const rid = getReactStepId(span);
            const reactSpan = rid ? spanMap.get(rid) : undefined;
            if (currentGroup && currentGroup.reactStepId === rid) {
                currentGroup.spans.push(span);
            } else {
                currentGroup = {
                    reactStepId: rid,
                    reactSpan,
                    spans: [span],
                };
                groups.push(currentGroup);
            }
        }
        return groups;
    }, [waterfallFilteredSpans, filteredSpans]);

    // Time range for flame graph: min = earliest start, max = latest end
    const flameGraphTimeRange = useMemo(() => {
        if (!filteredSpans.length) return null;
        const startTimes = filteredSpans.map((s) =>
            BigInt(s.startTimeUnixNano),
        );
        const endTimes = filteredSpans.map((s) => BigInt(s.endTimeUnixNano));
        const min = startTimes.reduce((a, b) => (a < b ? a : b));
        const max = endTimes.reduce((a, b) => (a > b ? a : b));
        const range = max - min;
        return { min, max, range: range > 0n ? range : 1n };
    }, [filteredSpans]);

    // Display span (selected or root)
    const displaySpan = selectedSpan || rootSpan;

    // 当 operation 为 react 或不存在时，切换到 Attributes 页签；当 Metadata 页签被隐藏时，若当前在 metadata 则切换
    useEffect(() => {
        if (!displaySpan?.attributes) return;
        const op = (getNestedValue(
            displaySpan.attributes,
            'gen_ai.operation.name',
        ) ??
            displaySpan.attributes['gen_ai.operation.name']) as
            | string
            | undefined;
        const hasAgentscopeMetadata =
            getNestedValue(
                displaySpan.attributes,
                'agentscope.function.input',
            ) !== undefined ||
            getNestedValue(
                displaySpan.attributes,
                'agentscope.function.output',
            ) !== undefined;
        const hideChatHistory =
            !op || op === 'react' || op === 'format';
        if (hideChatHistory && activeTab === 'chatHistory') {
            setActiveTab(hasAgentscopeMetadata ? 'metadata' : 'attributes');
        } else if (
            activeTab === 'metadata' &&
            !hasAgentscopeMetadata
        ) {
            setActiveTab(hideChatHistory ? 'attributes' : 'chatHistory');
        }
    }, [displaySpan, activeTab]);

    const handleCopy = async (text: string) => {
        const success = await copyToClipboard(text);
        if (success) {
            // TODO: Add toast notification
            console.log(t('trace.message.copySuccess'));
        } else {
            console.error(t('trace.message.copyFailed'));
        }
    };

    const handleExportOtlp = () => {
        if (!traceData?.spans?.length) return;
        const otlp = spansToOtlpJson(traceData.spans);
        const json = JSON.stringify(otlp, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trace-${traceId ?? 'export'}.json`;
        a.click();
        URL.revokeObjectURL(url);
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

    const getGenAiOp = (span: SpanData): string | undefined =>
        (getNestedValue(span.attributes ?? {}, 'gen_ai.operation.name') ??
            (span.attributes ?? {})['gen_ai.operation.name']) as
            | string
            | undefined;

    const extractInput = (span: SpanData): unknown => {
        const attrs = span.attributes || {};
        const op = getGenAiOp(span);
        if (op === 'chain') {
            const val = getNestedValue(attrs, 'gen_ai.input.value') ??
                getNestedValue(attrs, 'input.value');
            return val;
        }
        if (op === 'execute_tool') {
            return getNestedValue(attrs, 'gen_ai.tool.call.arguments');
        }
        if (op === 'retrieval') {
            return getNestedValue(attrs, 'gen_ai.retrieval.query.text');
        }
        const genAiMessages = getNestedValue(attrs, 'gen_ai.input.messages');
        if (genAiMessages !== undefined) {
            return genAiMessages;
        }
        return undefined;
    };

    const extractOutput = (span: SpanData): unknown => {
        const attrs = span.attributes || {};
        const op = getGenAiOp(span);
        if (op === 'chain') {
            const val = getNestedValue(attrs, 'gen_ai.output.value') ??
                getNestedValue(attrs, 'output.value');
            return val;
        }
        if (op === 'execute_tool') {
            return getNestedValue(attrs, 'gen_ai.tool.call.result');
        }
        if (op === 'retrieval') {
            return getNestedValue(attrs, 'gen_ai.retrieval.documents');
        }
        const genAiMessages = getNestedValue(attrs, 'gen_ai.output.messages');
        if (genAiMessages !== undefined) {
            return genAiMessages;
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

    const getFlameBarStyle = (span: SpanData) => {
        if (!flameGraphTimeRange) return { left: 0, width: 0 };
        const start = BigInt(span.startTimeUnixNano);
        const end = BigInt(span.endTimeUnixNano);
        const { min, range } = flameGraphTimeRange;
        const rangeNum = Number(range);
        const leftPercent = (Number(start - min) / rangeNum) * 100;
        // 浮点计算避免 BigInt 整数除法吞掉短耗时 span 的宽度；右边界 +0.01s 保证最小可见
        const durationNs = Number(end - start);
        const widthPercent = Math.max(
            (durationNs / rangeNum) * 100,
            (10_000_000 / rangeNum) * 100, // 0.01s 对应的百分比
            1,
        );
        return { left: leftPercent, width: widthPercent };
    };

    // 火焰图条左边缘与行内容区对齐，不随层级缩进，便于时间轴对比
    const FLAME_BAR_LEFT_OFFSET_PX = 8;
    // 瀑布图：Span Name 最右边界（耗时+状态在此区域内）
    const WATERFALL_NAME_RIGHT_PX = 70;
    // 瀑布图：高亮条右边界（条在此结束，预留空间给 Span Name 展示）
    const WATERFALL_BAR_RIGHT_PX = WATERFALL_NAME_RIGHT_PX + 120;

    const renderTreeNode = (node: SpanTreeNode, level = 0): React.ReactNode => {
        const duration =
            Number(
                BigInt(node.span.endTimeUnixNano) -
                    BigInt(node.span.startTimeUnixNano),
            ) / 1e9;
        const isSelected = selectedSpanId === node.span.spanId;
        const hasChildren = node.children && node.children.length > 0;
        const flameStyle = getFlameBarStyle(node.span);

        return (
            <div key={node.span.spanId} className="w-full">
                <div
                    className={`group relative flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted overflow-hidden ${
                        isSelected ? 'bg-muted' : ''
                    }`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => setSelectedSpanId(node.span.spanId)}
                >
                    {/* 火焰图条：作为 Span 行背景 */}
                    {flameGraphTimeRange && (
                        <div
                            className="absolute top-1.5 bottom-1.5 z-0 bg-muted/20 overflow-visible pointer-events-none rounded"
                            style={{
                                left: `${FLAME_BAR_LEFT_OFFSET_PX}px`,
                                right: 8,
                            }}
                        >
                            <div
                                className={`absolute inset-y-0 rounded transition-opacity ${
                                    isSelected ? 'opacity-75' : 'opacity-45'
                                } group-hover:opacity-75`}
                                style={{
                                    left: `${flameStyle.left}%`,
                                    width: `${flameStyle.width}%`,
                                    backgroundColor: getFlameBarColor(
                                        node.span,
                                    ),
                                }}
                            />
                        </div>
                    )}
                    {hasChildren && (
                        <button
                            className="relative z-10 p-0.5"
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
                        >
                            {expandedNodes.has(node.span.spanId) ? (
                                <ChevronDownIcon className="size-3" />
                            ) : (
                                <ChevronRightIcon className="size-3" />
                            )}
                        </button>
                    )}
                    {!hasChildren && <div className="w-4 relative z-10" />}
                    <span className="relative z-10">{getSpanTypeIcon(node.span)}</span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex-1 text-base truncate min-w-0 relative z-10">
                                {node.span.name}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <span className="text-xs break-all max-w-[400px]">
                                {node.span.name}
                            </span>
                            {flameGraphTimeRange && (
                                <>
                                    <br />
                                    <span className="text-xs text-muted-foreground">
                                        {formatDurationWithUnit(duration)}
                                    </span>
                                </>
                            )}
                        </TooltipContent>
                    </Tooltip>
                    <span className="text-xs text-muted-foreground shrink-0 relative z-10">
                        {formatDurationWithUnit(duration)}
                    </span>
                    <span className="relative z-10">{getStatusIcon(node.span.status?.code || 0)}</span>
                </div>
                {hasChildren &&
                    expandedNodes.has(node.span.spanId) &&
                    node.children?.map((child) =>
                        renderTreeNode(child, level + 1),
                    )}
            </div>
        );
    };

    const renderWaterfallRow = (span: SpanData): React.ReactNode => {
        const duration =
            Number(
                BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano),
            ) / 1e9;
        const isSelected = selectedSpanId === span.spanId;
        const flameStyle = getFlameBarStyle(span);

        return (
            <div key={span.spanId} className="w-full">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={`group relative flex items-center w-full p-2 rounded-md cursor-pointer hover:bg-muted overflow-hidden ${
                                isSelected ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedSpanId(span.spanId)}
                        >
                            {/* 高亮条区域：条 + Span Name（name 以 bar 为基准，延伸到右侧预留区） */}
                            {flameGraphTimeRange && (
                                <div
                                    className="absolute top-1.5 bottom-1.5 z-0 overflow-visible pointer-events-none rounded"
                                    style={{
                                        left: `${FLAME_BAR_LEFT_OFFSET_PX}px`,
                                        right: WATERFALL_BAR_RIGHT_PX,
                                    }}
                                >
                                    <div
                                        className="absolute inset-y-0 bg-muted/20 rounded"
                                        style={{ left: 0, right: 0 }}
                                    />
                                    <div
                                        className={`absolute inset-y-0 rounded transition-opacity ${
                                            isSelected ? 'opacity-75' : 'opacity-45'
                                        } group-hover:opacity-75`}
                                        style={{
                                            left: `${flameStyle.left}%`,
                                            width: `${flameStyle.width}%`,
                                            backgroundColor: getFlameBarColor(
                                                span,
                                            ),
                                        }}
                                    />
                                    {/* Span Name：以 bar 容器为基准，从 bar 起始位置延伸到右侧预留区（overflow 出 bar 容器） */}
                                    <div
                                        className="absolute inset-y-0 flex items-center gap-1.5 pl-1 min-w-0 overflow-hidden"
                                        style={{
                                            left: `${flameStyle.left}%`,
                                            right: -(WATERFALL_BAR_RIGHT_PX - WATERFALL_NAME_RIGHT_PX),
                                        }}
                                    >
                                        <span className="relative z-10 shrink-0">
                                            {getSpanTypeIcon(span)}
                                        </span>
                                        <span className="relative z-10 truncate text-base min-w-0">
                                            {span.name}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <span className="text-xs text-muted-foreground shrink-0 relative z-10 ml-auto pl-2">
                                {formatDurationWithUnit(duration)}
                            </span>
                            <span className="relative z-10 ml-1 shrink-0">
                                {getStatusIcon(span.status?.code || 0)}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <span className="text-xs break-all max-w-[400px]">
                            {span.name}
                        </span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                            {formatDurationWithUnit(duration)}
                        </span>
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Sidebar / 瀑布图区域 */}
            <div
                className={`w-full bg-background border-b lg:border-b-0 lg:border-r border-border overflow-auto max-h-[40vh] lg:max-h-none ${
                    isWaterfallView
                        ? 'lg:w-[70%] lg:min-w-0'
                        : 'lg:w-[400px] lg:min-w-[400px]'
                }`}
            >
                <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <PageTitleSpan title={t('trace.nodeDetails')} />
                        <div className="flex items-center gap-1 shrink-0">
                            {isWaterfallView && (
                                <DropdownMenu>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant={
                                                        waterfallOpFilter.size > 0
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    size="sm"
                                                >
                                                    <ListFilter className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {t('trace.filterByOpType')}
                                        </TooltipContent>
                                    </Tooltip>
                                    <DropdownMenuContent
                                        align="end"
                                        className="max-h-[280px] overflow-y-auto"
                                    >
                                        <DropdownMenuLabel>
                                            {t('trace.filterByOpType')}
                                        </DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={
                                                waterfallOpFilter.size === 0
                                            }
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setWaterfallOpFilter(
                                                        new Set(),
                                                    );
                                                }
                                            }}
                                        >
                                            {t('trace.filterOpAll')}
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuSeparator />
                                        {waterfallUniqueOpTypes.map((op) => {
                                            const isChecked =
                                                waterfallOpFilter.size === 0 ||
                                                waterfallOpFilter.has(op);
                                            return (
                                                <DropdownMenuCheckboxItem
                                                    key={op}
                                                    checked={isChecked}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) => {
                                                        setWaterfallOpFilter(
                                                            (prev) => {
                                                                const all =
                                                                    waterfallUniqueOpTypes;
                                                                if (checked) {
                                                                    const next =
                                                                        new Set(
                                                                            prev,
                                                                        );
                                                                    next.add(op);
                                                                    return next;
                                                                }
                                                                if (prev.size ===
                                                                    0) {
                                                                    return new Set(
                                                                        all.filter(
                                                                            (
                                                                                x,
                                                                            ) =>
                                                                                x !==
                                                                                op,
                                                                        ),
                                                                    );
                                                                }
                                                                const next =
                                                                    new Set(prev);
                                                                next.delete(op);
                                                                return next.size >
                                                                    0
                                                                    ? next
                                                                    : new Set();
                                                            },
                                                        );
                                                    }}
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {getSpanTypeIcon(
                                                            op === OP_NONE_KEY
                                                                ? ({
                                                                      attributes:
                                                                          {},
                                                                  } as unknown as SpanData)
                                                                : ({
                                                                      attributes:
                                                                          {
                                                                              'gen_ai.operation.name':
                                                                                  op,
                                                                          },
                                                                  } as unknown as SpanData),
                                                        )}
                                                        {op === OP_NONE_KEY
                                                            ? t(
                                                                  'trace.filterOpNone',
                                                              )
                                                            : op
                                                                  .split('_')
                                                                  .map(
                                                                      (w) =>
                                                                          w.charAt(
                                                                              0,
                                                                          ).toUpperCase() +
                                                                          w.slice(
                                                                              1,
                                                                          ).toLowerCase(),
                                                                  )
                                                                  .join(' ')}
                                                    </span>
                                                </DropdownMenuCheckboxItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={
                                            isWaterfallView ? 'secondary' : 'ghost'
                                        }
                                        size="sm"
                                        onClick={() =>
                                            setIsWaterfallView(!isWaterfallView)
                                        }
                                    >
                                        {isWaterfallView ? (
                                            <ListTree className="size-4" />
                                        ) : (
                                            <ChartGantt className="size-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isWaterfallView
                                        ? t('trace.treeView')
                                        : t('trace.waterfallView')}
                                </TooltipContent>
                            </Tooltip>
                            {onToggleFullWidth && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onToggleFullWidth}
                                        >
                                            {isFullWidth ? (
                                                <Minimize2 className="size-4" />
                                            ) : (
                                                <Fullscreen className="size-4" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isFullWidth
                                            ? t('trace.exitFullScreen')
                                            : t('trace.fullScreen')}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>
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
                                    {formatDurationWithUnit(traceDuration)}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground mr-2">
                                    {t('table.column.startTime')}:
                                </span>
                                <span className="text-xs">
                                    {formatDateTime(rootSpan.startTimeUnixNano)}
                                </span>
                            </div>
                        </div>
                    )}
                    {traceData?.spans?.length && (
                        <div className="mt-4">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExportOtlp}
                                        className="w-full justify-center h-8"
                                    >
                                        <Download className="size-3.5 mr-1.5" />
                                        {t('trace.exportAsOtlp')}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {t('trace.exportAsOtlpTooltip')}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>
                {isLoading ? (
                    <div className="p-4">{t('trace.detail.loading')}</div>
                ) : isWaterfallView ? (
                    <div className="p-4 pt-0 pr-6">
                        {waterfallReactStepGroups.map((group, gi) =>
                            group.reactStepId ? (
                                <div
                                    key={group.reactStepId}
                                    className="mb-3 rounded-lg border border-border/80 bg-muted/5 overflow-hidden last:mb-0"
                                >
                                    <button
                                        type="button"
                                        className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-xs border-b border-border/60 bg-muted/10 hover:bg-muted/20 transition-colors text-left cursor-pointer"
                                        onClick={() => {
                                            setCollapsedReactSteps((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(group.reactStepId!)) {
                                                    next.delete(group.reactStepId!);
                                                } else {
                                                    next.add(group.reactStepId!);
                                                }
                                                return next;
                                            });
                                        }}
                                    >
                                        <span className="shrink-0">
                                            {collapsedReactSteps.has(
                                                group.reactStepId,
                                            ) ? (
                                                <ChevronRightIcon className="size-3.5" />
                                            ) : (
                                                <ChevronDownIcon className="size-3.5" />
                                            )}
                                        </span>
                                        {group.reactSpan ? (
                                            (() => {
                                                const meta = getReactStepMeta(
                                                    group.reactSpan,
                                                );
                                                return (
                                                    <>
                                                        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                                            <RefreshCw className="size-3 shrink-0" />
                                                            {t('trace.reactRound')}{' '}
                                                            <span className="font-semibold text-foreground">
                                                                {meta.round ??
                                                                    t(
                                                                        'trace.unknown',
                                                                    )}
                                                            </span>
                                                        </span>
                                                        <span
                                                            className="text-border"
                                                            aria-hidden
                                                        >
                                                            ·
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                            {t(
                                                                'trace.reactFinishReason',
                                                            )}
                                                            :{' '}
                                                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                                                                {meta.finishReason
                                                                    ? formatFinishReason(
                                                                          meta.finishReason,
                                                                      )
                                                                    : t(
                                                                          'trace.unknown',
                                                                      )}
                                                            </span>
                                                        </span>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-muted-foreground">
                                                {t('trace.reactStep')}
                                            </span>
                                        )}
                                    </button>
                                    {!collapsedReactSteps.has(
                                        group.reactStepId,
                                    ) && (
                                        <div className="p-2">
                                            {group.spans.map((span) =>
                                                renderWaterfallRow(span),
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    key={`ungrouped-${gi}`}
                                    className="mb-3 last:mb-0"
                                >
                                    {group.spans.map((span) =>
                                        renderWaterfallRow(span),
                                    )}
                                </div>
                            ),
                        )}
                    </div>
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
                            >
                                <EyeIcon className="size-4 mr-2" />
                                {t('common.id')}
                            </Button>
                        </div>

                        {/* ID Panel */}
                        {idPanelOpen && (
                            <div className="mb-4 px-4 py-2.5 bg-muted rounded-md">
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center gap-2 py-0.5">
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
                                    <div className="flex justify-between items-center gap-2 py-0.5">
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
                                    {formatDateTime(
                                        displaySpan.startTimeUnixNano,
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                    {t('table.column.duration')}
                                </div>
                                <div className="text-sm font-medium">
                                    {formatDurationWithUnit(
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

                        {/* Metadata / Attributes Tabs */}
                        <Tabs
                            activeKey={(() => {
                                const op = displaySpan
                                    ? getGenAiOp(displaySpan)
                                    : undefined;
                                const hideChatHistory =
                                    !displaySpan ||
                                    !op ||
                                    op === 'react' ||
                                    op === 'format';
                                const hasMetadata =
                                    displaySpan &&
                                    (getNestedValue(
                                        displaySpan.attributes ?? {},
                                        'agentscope.function.input',
                                    ) !== undefined ||
                                        getNestedValue(
                                            displaySpan.attributes ?? {},
                                            'agentscope.function.output',
                                        ) !== undefined);
                                if (
                                    activeTab === 'chatHistory' &&
                                    hideChatHistory
                                ) {
                                    return hasMetadata
                                        ? 'metadata'
                                        : 'attributes';
                                }
                                if (
                                    activeTab === 'metadata' &&
                                    !hasMetadata
                                ) {
                                    return hideChatHistory
                                        ? 'attributes'
                                        : 'chatHistory';
                                }
                                return activeTab;
                            })()}
                            onChange={setActiveTab}
                            className="[&_.ant-tabs-tab]:text-base [&_.ant-tabs-tab]:font-medium"
                            items={
                                (() => {
                                    const op = displaySpan
                                        ? getGenAiOp(displaySpan)
                                        : undefined;
                                    const showChatHistoryTab =
                                        !!op &&
                                        op !== 'react' &&
                                        op !== 'format';
                                    const agentscopeInput = getNestedValue(
                                        displaySpan.attributes ?? {},
                                        'agentscope.function.input',
                                    );
                                    const agentscopeOutput = getNestedValue(
                                        displaySpan.attributes ?? {},
                                        'agentscope.function.output',
                                    );
                                    const showMetadataTab =
                                        agentscopeInput !== undefined ||
                                        agentscopeOutput !== undefined;
                                    const chatHistoryTab = showChatHistoryTab
                                        ? {
                                              key: 'chatHistory',
                                              label: t('trace.tabChatHistory'),
                                              children: (() => {
                                                  const opInner = getGenAiOp(
                                                      displaySpan,
                                                  );
                                                  const showChainView =
                                                      opInner === 'chain';
                                                  const showValueView =
                                                      showChainView ||
                                                      opInner === 'execute_tool';
                                                  const showRetrievalView =
                                                      opInner === 'retrieval';
                                                  const retrievalDocuments =
                                                      showRetrievalView
                                                          ? parseRetrievalDocuments(
                                                                extractOutput(
                                                                    displaySpan,
                                                                ),
                                                            )
                                                          : [];
                                        const useChatView = isChatOp(
                                            displaySpan,
                                        );
                                        const inputMessages = useChatView
                                            ? parseMessages(
                                                  getNestedValue(
                                                      displaySpan.attributes ??
                                                          {},
                                                      'gen_ai.input.messages',
                                                  ),
                                              )
                                            : [];
                                        const outputMessages = useChatView
                                            ? parseMessages(
                                                  getNestedValue(
                                                      displaySpan.attributes ??
                                                          {},
                                                      'gen_ai.output.messages',
                                                  ),
                                              )
                                            : [];
                                        const showChatView =
                                            useChatView &&
                                            (inputMessages.length > 0 ||
                                                outputMessages.length > 0);

                                        return (
                                            <div className="space-y-4 pt-4">
                                                <Collapsible defaultOpen className="group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                                            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                                                            <span className="text-sm font-medium">
                                                                {t('common.input')}
                                                            </span>
                                                            {showChatView &&
                                                                !showValueView &&
                                                                !showRetrievalView && (
                                                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                                                                    {inputMessages.length}{' '}
                                                                    {inputMessages.length === 1
                                                                        ? t('common.message')
                                                                        : t('common.messages')}
                                                                </span>
                                                            )}
                                                        </CollapsibleTrigger>
                                                        <div className="flex items-center gap-0.5">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setJsonModalContent({
                                                                                title: t('common.input'),
                                                                                value:
                                                                                    extractInput(
                                                                                        displaySpan,
                                                                                    ),
                                                                            });
                                                                        }}
                                                                        className="h-6 w-6"
                                                                    >
                                                                        <Maximize2 className="size-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {t(
                                                                        'trace.viewInModal',
                                                                    )}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(
                                                                        formatForCopy(
                                                                            extractInput(
                                                                                displaySpan,
                                                                            ),
                                                                        ),
                                                                    );
                                                                }}
                                                                className="h-6 w-6"
                                                            >
                                                                <CopyIcon className="size-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <CollapsibleContent>
                                                        {showRetrievalView ? (
                                                            <div className="bg-muted p-3 rounded-md">
                                                                <pre className="m-0 text-sm whitespace-pre-wrap break-words font-sans">
                                                                    {(() => {
                                                                        const v =
                                                                            extractInput(
                                                                                displaySpan,
                                                                            );
                                                                        return v != null
                                                                            ? String(v)
                                                                            : '—';
                                                                    })()}
                                                                </pre>
                                                            </div>
                                                        ) : showValueView ? (
                                                            <ValueDisplay
                                                                value={extractInput(
                                                                    displaySpan,
                                                                )}
                                                                className="bg-muted p-3 rounded-md"
                                                            />
                                                        ) : showChatView ? (
                                                            <ChatMessagesList
                                                                messages={
                                                                    inputMessages
                                                                }
                                                                onViewMessageJson={(
                                                                    msg: ChatMessage,
                                                                ) =>
                                                                    setJsonModalContent(
                                                                        {
                                                                            title: `${t('common.input')} - ${msg.role}`,
                                                                            value: msg,
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                        ) : (
                                                            <ValueDisplay
                                                                value={extractInput(
                                                                    displaySpan,
                                                                )}
                                                                className="bg-muted p-3 rounded-md"
                                                            />
                                                        )}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                                <Separator />
                                                <Collapsible defaultOpen className="group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                                            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                                                            <span className="text-sm font-medium">
                                                                {t('common.output')}
                                                            </span>
                                                            {showChatView &&
                                                                !showValueView &&
                                                                !showRetrievalView && (
                                                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                                                                    {outputMessages.length}{' '}
                                                                    {outputMessages.length === 1
                                                                        ? t('common.message')
                                                                        : t('common.messages')}
                                                                </span>
                                                            )}
                                                            {showRetrievalView &&
                                                                retrievalDocuments.length > 0 && (
                                                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                                                                    {retrievalDocuments.length}{' '}
                                                                    {retrievalDocuments.length === 1
                                                                        ? t('common.document')
                                                                        : t('common.documents')}
                                                                </span>
                                                            )}
                                                        </CollapsibleTrigger>
                                                        <div className="flex items-center gap-0.5">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setJsonModalContent({
                                                                                title: t('common.output'),
                                                                                value:
                                                                                    extractOutput(
                                                                                        displaySpan,
                                                                                    ),
                                                                            });
                                                                        }}
                                                                        className="h-6 w-6"
                                                                    >
                                                                        <Maximize2 className="size-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {t(
                                                                        'trace.viewInModal',
                                                                    )}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(
                                                                        formatForCopy(
                                                                            extractOutput(
                                                                                displaySpan,
                                                                            ),
                                                                        ),
                                                                    );
                                                                }}
                                                                className="h-6 w-6"
                                                            >
                                                                <CopyIcon className="size-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <CollapsibleContent>
                                                        {showRetrievalView ? (
                                                            <RetrievalDocumentsList
                                                                documents={
                                                                    retrievalDocuments
                                                                }
                                                            />
                                                        ) : showValueView ? (
                                                            <ValueDisplay
                                                                value={extractOutput(
                                                                    displaySpan,
                                                                )}
                                                                className="bg-muted p-3 rounded-md"
                                                            />
                                                        ) : showChatView ? (
                                                            <ChatMessagesList
                                                                messages={
                                                                    outputMessages
                                                                }
                                                                onViewMessageJson={(
                                                                    msg: ChatMessage,
                                                                ) =>
                                                                    setJsonModalContent(
                                                                        {
                                                                            title: `${t('common.output')} - ${msg.role}`,
                                                                            value: msg,
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                        ) : (
                                                            <ValueDisplay
                                                                value={extractOutput(
                                                                    displaySpan,
                                                                )}
                                                                className="bg-muted p-3 rounded-md"
                                                            />
                                                        )}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            </div>
                                                        );
                                              })(),
                                          }
                                        : null;
                                    const metadataTab = showMetadataTab
                                        ? {
                                              key: 'metadata',
                                              label: t('common.metadata'),
                                              children: (
                                                  <div className="space-y-4 pt-4">
                                                      {agentscopeInput !==
                                                      undefined && (
                                                          <div>
                                                              <div className="flex items-center justify-between mb-2">
                                                                  <span className="text-sm font-medium">
                                                                      {t(
                                                                          'common.input',
                                                                      )}
                                                                  </span>
                                                                  <div className="flex items-center gap-0.5">
                                                                      <Tooltip>
                                                                          <TooltipTrigger asChild>
                                                                              <Button
                                                                                  variant="ghost"
                                                                                  size="icon-sm"
                                                                                  onClick={() =>
                                                                                      setJsonModalContent(
                                                                                          {
                                                                                              title: `${t('common.metadata')} - ${t('common.input')}`,
                                                                                              value: agentscopeInput,
                                                                                          },
                                                                                      )
                                                                                  }
                                                                                  className="h-6 w-6"
                                                                              >
                                                                                  <Maximize2 className="size-3" />
                                                                              </Button>
                                                                          </TooltipTrigger>
                                                                          <TooltipContent>
                                                                              {t(
                                                                                  'trace.viewInModal',
                                                                              )}
                                                                          </TooltipContent>
                                                                      </Tooltip>
                                                                      <Button
                                                                          variant="ghost"
                                                                          size="icon-sm"
                                                                          onClick={() =>
                                                                              handleCopy(
                                                                                  formatForCopy(
                                                                                      agentscopeInput,
                                                                                  ),
                                                                              )
                                                                          }
                                                                          className="h-6 w-6"
                                                                      >
                                                                          <CopyIcon className="size-3" />
                                                                      </Button>
                                                                  </div>
                                                              </div>
                                                              <ValueDisplay
                                                                  value={
                                                                      agentscopeInput
                                                                  }
                                                                  className="bg-muted p-3 rounded-md"
                                                              />
                                                          </div>
                                                      )}
                                                      {agentscopeInput !==
                                                          undefined &&
                                                          agentscopeOutput !==
                                                              undefined && (
                                                              <Separator />
                                                          )}
                                                      {agentscopeOutput !==
                                                      undefined && (
                                                          <div>
                                                              <div className="flex items-center justify-between mb-2">
                                                                  <span className="text-sm font-medium">
                                                                      {t(
                                                                          'common.output',
                                                                      )}
                                                                  </span>
                                                                  <div className="flex items-center gap-0.5">
                                                                      <Tooltip>
                                                                          <TooltipTrigger asChild>
                                                                              <Button
                                                                                  variant="ghost"
                                                                                  size="icon-sm"
                                                                                  onClick={() =>
                                                                                      setJsonModalContent(
                                                                                          {
                                                                                              title: `${t('common.metadata')} - ${t('common.output')}`,
                                                                                              value: agentscopeOutput,
                                                                                          },
                                                                                      )
                                                                                  }
                                                                                  className="h-6 w-6"
                                                                              >
                                                                                  <Maximize2 className="size-3" />
                                                                              </Button>
                                                                          </TooltipTrigger>
                                                                          <TooltipContent>
                                                                              {t(
                                                                                  'trace.viewInModal',
                                                                              )}
                                                                          </TooltipContent>
                                                                      </Tooltip>
                                                                      <Button
                                                                          variant="ghost"
                                                                          size="icon-sm"
                                                                          onClick={() =>
                                                                              handleCopy(
                                                                                  formatForCopy(
                                                                                      agentscopeOutput,
                                                                                  ),
                                                                              )
                                                                          }
                                                                          className="h-6 w-6"
                                                                      >
                                                                          <CopyIcon className="size-3" />
                                                                      </Button>
                                                                  </div>
                                                              </div>
                                                              <ValueDisplay
                                                                  value={
                                                                      agentscopeOutput
                                                                  }
                                                                  className="bg-muted p-3 rounded-md"
                                                              />
                                                          </div>
                                                      )}
                                                  </div>
                                              ),
                                          }
                                        : null;
                                    const attributesTab = {
                                        key: 'attributes',
                                        label: t('trace.tabAttributes'),
                                        children: (
                                            <div className="pt-4">
                                                <AttributesKeyValueList
                                                    attributes={
                                                        displaySpan.attributes as Record<
                                                            string,
                                                            unknown
                                                        >
                                                    }
                                                    onCopy={handleCopy}
                                                />
                                            </div>
                                        ),
                                    };
                                    const resourcesTab = {
                                        key: 'resources',
                                        label: t('trace.tabResources'),
                                        children: (
                                            <div className="pt-4">
                                                <AttributesKeyValueList
                                                    attributes={
                                                        (displaySpan.resource
                                                            ?.attributes ?? {}) as Record<
                                                            string,
                                                            unknown
                                                        >
                                                    }
                                                    onCopy={handleCopy}
                                                />
                                            </div>
                                        ),
                                    };
                                    return [
                                        ...(chatHistoryTab
                                            ? [chatHistoryTab]
                                            : []),
                                        ...(metadataTab
                                            ? [metadataTab]
                                            : []),
                                        attributesTab,
                                        resourcesTab,
                                    ];
                                })()
                            }
                        />

                        {/* JSON 弹窗：查看 Input/Output/Message 原始数据 */}
                        <Dialog
                            open={!!jsonModalContent}
                            onOpenChange={(open) =>
                                !open && setJsonModalContent(null)
                            }
                        >
                            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="font-mono text-sm break-all">
                                        {jsonModalContent?.title}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 overflow-auto min-h-0 rounded-md border border-border bg-muted/30 p-4">
                                    {jsonModalContent && (
                                        <ValueDisplay
                                            value={jsonModalContent.value}
                                        />
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
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
