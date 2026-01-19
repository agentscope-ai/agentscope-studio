import { Input, Modal, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import dayjs from 'dayjs';
import { Key, memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDurationWithUnit } from '@/utils/common';

import SpanPanel from '@/pages/DashboardPage/RunPage/TracingComponent/TracePanel/SpanPanel';
import { SpanData } from '@shared/types/trace.ts';

interface TraceSpanNode extends SpanData {
    children: TraceSpanNode[];
}

// Helper function to get display kind - extracted to avoid recalculation
const getDisplayKind = (attributes: Record<string, unknown>): string => {
    const genAi = attributes.gen_ai as Record<string, unknown> | undefined;
    const agentscope = attributes.agentscope as
        | Record<string, unknown>
        | undefined;

    const operationName = (genAi?.operation as Record<string, unknown>)
        ?.name as string;
    const agent_name = (genAi?.agent as Record<string, unknown>)?.name as
        | string
        | undefined;
    const model_name = (genAi?.request as Record<string, unknown>)?.model as
        | string
        | undefined;
    const tool_name = (genAi?.tool as Record<string, unknown>)?.name as
        | string
        | undefined;
    const format_target = (agentscope?.format as Record<string, unknown>)
        ?.target as string | undefined;

    if (operationName === 'invoke_agent' && agent_name) {
        return operationName + ': ' + String(agent_name);
    } else if (operationName === 'execute_tool' && tool_name) {
        return operationName + ': ' + String(tool_name);
    } else if (
        (operationName === 'chat' ||
            operationName === 'chat_model' ||
            operationName === 'embeddings') &&
        model_name
    ) {
        return operationName + ': ' + String(model_name);
    } else if (operationName === 'format' && format_target) {
        return operationName + ': ' + String(format_target);
    } else if (operationName) {
        return operationName;
    }
    return 'Unknown';
};

// Store for span data lookup by key
interface SpanTitleData {
    name: string;
    startTimeUnixNano: string;
    latencyNs: number;
    displayKind: string;
}

interface Props {
    spans: SpanData[];
}

export const TraceTree = ({ spans }: Props) => {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState('');
    const [currentSpan, setCurrentSpan] = useState<SpanData | null>(null);
    const [open, setOpen] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

    // Pre-compute title data for all spans - lightweight objects, no React elements
    const spanTitleDataMap = useMemo(() => {
        const map = new Map<string, SpanTitleData>();
        spans.forEach((span) => {
            const agentscope = span.attributes.agentscope as
                | Record<string, unknown>
                | undefined;
            const funcName = (agentscope?.function as Record<string, unknown>)
                ?.name as string | undefined;
            map.set(span.spanId, {
                name: funcName || span.name,
                startTimeUnixNano: span.startTimeUnixNano,
                latencyNs: span.latencyNs,
                displayKind: getDisplayKind(span.attributes),
            });
        });
        return map;
    }, [spans]);

    const traceHierarchy = useMemo(() => {
        if (spans.length === 0) return [];

        // Construct a map of span ID to span node
        const spanHierarchyMap = new Map<string, TraceSpanNode>();
        spans.forEach((span) => {
            spanHierarchyMap.set(span.spanId, { ...span, children: [] });
        });

        const rootSpans: TraceSpanNode[] = [];
        spans.forEach((span) => {
            const currentNode = spanHierarchyMap.get(span.spanId)!;
            if (span.parentSpanId) {
                const parentNode = spanHierarchyMap.get(span.parentSpanId);
                if (parentNode) {
                    parentNode.children.push(currentNode);
                } else {
                    rootSpans.push(currentNode);
                }
            } else {
                rootSpans.push(currentNode);
            }
        });

        // If no search text, return the full hierarchy
        if (!searchText) {
            return rootSpans;
        }

        const searchLower = searchText.toLowerCase();

        // Filter the tree based on search text (searches all levels)
        const filterNodes = (nodes: TraceSpanNode[]): TraceSpanNode[] => {
            return nodes
                .map((node) => {
                    const filteredChildren = filterNodes(node.children);

                    // Get display name and displayKind for searching
                    const titleData = spanTitleDataMap.get(node.spanId);
                    const displayName = titleData?.name || node.name;
                    const displayKind = titleData?.displayKind || '';

                    // Search in: display name, original name, and displayKind
                    const nodeMatches =
                        displayName.toLowerCase().includes(searchLower) ||
                        node.name.toLowerCase().includes(searchLower) ||
                        displayKind.toLowerCase().includes(searchLower);

                    const hasMatchingChildren = filteredChildren.length > 0;

                    // Include the node if it matches or has matching children
                    if (nodeMatches || hasMatchingChildren) {
                        return { ...node, children: filteredChildren };
                    }
                    return null;
                })
                .filter(Boolean) as TraceSpanNode[];
        };

        return filterNodes(rootSpans);
    }, [spans, searchText, spanTitleDataMap]);

    // Convert to tree data with only keys and structure - NO React elements
    const treeData = useMemo(() => {
        const convertToAntdTreeNodes = (nodes: TraceSpanNode[]): DataNode[] => {
            return nodes.map((node) => ({
                key: node.spanId,
                title: node.spanId, // Just use key as placeholder, titleRender will handle display
                children:
                    node.children.length > 0
                        ? convertToAntdTreeNodes(node.children)
                        : undefined,
            }));
        };
        return convertToAntdTreeNodes(traceHierarchy);
    }, [traceHierarchy]);

    // titleRender - renders only when node is visible (lazy rendering)
    const titleRender = useCallback(
        (nodeData: DataNode) => {
            const spanId = nodeData.key as string;
            const data = spanTitleDataMap.get(spanId);
            if (!data) return null;

            return (
                <div className="flex flex-col w-full py-1 rounded-md">
                    <div className="flex justify-between">
                        <div className="font-[500] truncate break-all max-w-fit">
                            {data.name}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                            {formatDurationWithUnit(data.latencyNs / 1e9)}
                        </span>
                    </div>
                    <div className="flex flex-row items-center justify-between text-muted-foreground">
                        <div
                            className={`
                            flex flex-row gap-x-1 items-center
                            border border-currentColor
                            text-[10px] font-bold
                            pl-1 pr-1 rounded-md px-1 leading-4
                            w-fit h-fit
                        `}
                        >
                            {data.displayKind}
                        </div>
                        <div className="col-span-1 truncate break-all text-[13px]">
                            {dayjs(
                                parseInt(data.startTimeUnixNano) / 1000000,
                            ).format('HH:mm:ss')}
                        </div>
                    </div>
                </div>
            );
        },
        [spanTitleDataMap],
    );

    const handleSelect = useCallback(
        (selectedKeys: Key[]) => {
            const spanId = selectedKeys[0] as string;
            const span = spans.find((span) => span.spanId === spanId) || null;
            setCurrentSpan(span);
            setOpen(true);
        },
        [spans],
    );

    const handleModalClose = useCallback(() => setOpen(false), []);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchText(e.target.value);
        },
        [],
    );

    // Controlled expand/collapse
    const handleExpand = useCallback((keys: Key[]) => {
        setExpandedKeys(keys);
    }, []);

    return (
        <div className="flex flex-col flex-1 w-full h-full overflow-x-hidden gap-y-4">
            <Modal
                open={open}
                title="Span"
                onCancel={handleModalClose}
                width="calc(100% - 100px)"
                height="calc(100vh - 100px)"
                footer={null}
                centered={true}
            >
                <SpanPanel span={currentSpan} />
            </Modal>
            <Input.Search
                variant="filled"
                placeholder={t('placeholder.search-span')}
                value={searchText}
                onChange={handleSearchChange}
            />
            <Tree
                className={`
                    px-0 w-full
                    [&_.ant-tree-node-content-wrapper]:flex-1
                    [&_.ant-tree-node-content-wrapper]:w-0
                    [&_.ant-tree-node-content-wrapper]:border!
                    [&_.ant-tree-node-content-wrapper]:border-border
                    [&_.ant-tree-node-content-wrapper:active]:bg-primary/10!
                `}
                blockNode
                showLine
                expandedKeys={expandedKeys}
                onExpand={handleExpand}
                treeData={treeData}
                titleRender={titleRender}
                selectedKeys={[]}
                onSelect={handleSelect}
            />
        </div>
    );
};

export default memo(TraceTree);
