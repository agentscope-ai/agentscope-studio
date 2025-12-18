import { Input, Modal, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import moment from 'moment';
import { Key, memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Latency from '@/pages/DashboardPage/RunPage/TracingComponent/TracePanel/latency.tsx';
import SpanPanel from '@/pages/DashboardPage/RunPage/TracingComponent/TracePanel/SpanPanel';
import { SpanData } from '@shared/types/trace.ts';

interface TraceSpanNode extends SpanData {
    children: TraceSpanNode[];
}

interface SpanNodeTitleProps {
    name: string;
    startTimeUnixNano: string;
    latencyNs: number;
    attributes: Record<string, unknown>;
}

const SpanNodeTitle = ({
    name,
    startTimeUnixNano,
    latencyNs,
    attributes,
}: SpanNodeTitleProps) => {
    const operationName = attributes.gen_ai?.operation?.name as string;
    const agent_name = (attributes.gen_ai?.agent?.name as string) || undefined;
    const model_name =
        (attributes.gen_ai?.request?.model as string) || undefined;
    const tool_name = (attributes.gen_ai?.tool?.name as string) || undefined;
    const format_target =
        (attributes.agentscope?.format?.target as string) || undefined;

    let displayKind: string;
    if (operationName === 'invoke_agent' && agent_name) {
        displayKind = operationName + ': ' + String(agent_name);
    } else if (operationName === 'execute_tool' && tool_name) {
        displayKind = operationName + ': ' + String(tool_name);
    } else if (
        (operationName === 'chat' ||
            operationName === 'chat_model' ||
            operationName === 'embeddings') &&
        model_name
    ) {
        displayKind = operationName + ': ' + String(model_name);
    } else if (operationName === 'format' && format_target) {
        displayKind = operationName + ': ' + String(format_target);
    } else if (operationName) {
        displayKind = operationName;
    } else {
        displayKind = 'Unknown';
    }
    return (
        <div className="flex flex-col w-full py-1 rounded-md">
            <div className="flex justify-between">
                <div className="font-[500] truncate break-all max-w-fit">
                    {name}
                </div>
                <Latency latencyNs={latencyNs} />
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
                    {displayKind}
                </div>

                <div className="col-span-1 truncate break-all text-[13px]">
                    {moment(parseInt(startTimeUnixNano) / 1000000).format(
                        'HH:mm:ss',
                    )}
                </div>
            </div>
        </div>
    );
};

interface Props {
    spans: SpanData[];
}

export const TraceTree = ({ spans }: Props) => {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState('');
    const [currentSpan, setCurrentSpan] = useState<SpanData | null>(null);
    const [open, setOpen] = useState(false);

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

        // Filter the tree based on search text
        const filterNodes = (nodes: TraceSpanNode[]): TraceSpanNode[] => {
            return nodes
                .map((node) => {
                    const filteredChildren = filterNodes(node.children);
                    const nodeMatches = node.name
                        .toLowerCase()
                        .includes(searchText.toLowerCase());
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
    }, [spans, searchText]);

    const convertToAntdTreeNodes = (nodes: TraceSpanNode[]): DataNode[] => {
        return nodes.map((node) => {
            return {
                key: node.spanId,
                title: (
                    <SpanNodeTitle
                        name={
                            (node.attributes.agentscope?.function
                                ?.name as unknown as string) ||
                            (node.name as string)
                        }
                        startTimeUnixNano={node.startTimeUnixNano}
                        latencyNs={node.latencyNs}
                        attributes={node.attributes}
                    />
                ),
                children: node.children
                    ? convertToAntdTreeNodes(node.children)
                    : undefined,
            };
        });
    };

    return (
        <div className="flex flex-col flex-1 w-full h-full overflow-x-hidden gap-y-4">
            <Modal
                open={open}
                title="Span"
                onCancel={() => setOpen(false)}
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
                onChange={(e) => {
                    setSearchText(e.target.value);
                }}
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
                defaultExpandAll={true}
                autoExpandParent={true}
                treeData={convertToAntdTreeNodes(traceHierarchy)}
                selectedKeys={[]}
                onSelect={(selectedKeys: Key[]) => {
                    const spanId = selectedKeys[0] as string;
                    const span =
                        spans.find((span) => span.spanId === spanId) || null;
                    setCurrentSpan(span);
                    setOpen(true);
                }}
            />
        </div>
    );
};

export default memo(TraceTree);
