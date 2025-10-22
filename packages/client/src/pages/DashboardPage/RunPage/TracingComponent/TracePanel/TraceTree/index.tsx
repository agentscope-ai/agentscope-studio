import { useMemo, memo, useState, Key } from 'react';
import { Input, Modal, Tree } from 'antd';
import moment from 'moment';
import type { DataNode } from 'antd/es/tree';
import { useTranslation } from 'react-i18next';

import { SpanData, SpanKind } from '@shared/types/trace.ts';
import Latency from '@/pages/DashboardPage/RunPage/TracingComponent/TracePanel/latency.tsx';
import SpanPanel from '@/pages/DashboardPage/RunPage/TracingComponent/TracePanel/SpanPanel';

interface TraceSpanNode extends SpanData {
    children: TraceSpanNode[];
}

interface SpanNodeTitleProps {
    name: string;
    startTime: string;
    spanKind: string;
    latencyMs: number;
    attributes: Record<string, unknown>;
}

const SpanNodeTitle = ({
    name,
    startTime,
    spanKind,
    latencyMs,
    attributes,
}: SpanNodeTitleProps) => {
    const metadata: Record<string, unknown> = attributes.metadata as Record<
        string,
        unknown
    >;

    console.log('spanKind', spanKind, metadata.name);
    let kind: string;
    if (spanKind === SpanKind.AGENT && metadata.name) {
        kind = spanKind + ': ' + String(metadata.name);
    } else if (spanKind === SpanKind.TOOL && metadata.name) {
        kind = spanKind + ': ' + String(metadata.name);
    } else if (spanKind === SpanKind.LLM && metadata.model_name) {
        kind = spanKind + ': ' + String(metadata.model_name);
    } else {
        kind = spanKind;
    }

    return (
        <div className="flex flex-col w-full py-1 rounded-md">
            <div className="flex justify-between">
                <div className="font-[500] truncate break-all max-w-fit">
                    {name}
                </div>
                <Latency latency={latencyMs} />
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
                    {kind}
                </div>

                <div className="col-span-1 truncate break-all text-[13px]">
                    {moment(startTime).format('HH:mm:ss')}
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
            spanHierarchyMap.set(span.id, { ...span, children: [] });
        });

        const rootSpans: TraceSpanNode[] = [];
        spans.forEach((span) => {
            const currentNode = spanHierarchyMap.get(span.id)!;
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
            const spanKind = node.spanKind;
            if (node.spanKind === SpanKind.TOOL) {
                spanKind.concat(': ' + String(node.attributes));
            }
            return {
                key: node.id,
                title: (
                    <SpanNodeTitle
                        name={node.name}
                        spanKind={node.spanKind}
                        startTime={node.startTime}
                        latencyMs={node.latencyMs}
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
                        spans.find((span) => span.id === spanId) || null;
                    setCurrentSpan(span);
                    setOpen(true);
                }}
            />
        </div>
    );
};

export default memo(TraceTree);
