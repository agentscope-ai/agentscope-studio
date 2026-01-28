import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useMemo, useRef } from 'react';
import { SankeyChartProps } from './types';
import {
    calculateHighlightNodeSet,
    formatNodeLabel,
} from './utils';

/**
 * ReactECharts Sankey Implementation
 * - Uses echarts-for-react wrapper for simpler React integration
 * - Supports repeat color highlighting based on selection and hover
 * - Supports click events for nodes and links
 * - layerSpacing controls vertical distance between different levels (not same-layer node gap)
 */
export const ReactEChartsSankey: React.FC<SankeyChartProps> = ({
    data,
    width = '100%',
    height = 600,
    selectedRepeats = [],
    repeatNodeNames,
    hoveredRepeat,
    onNodeClick,
    onLinkClick,
    onRepeatHover,
    layerSpacing = 80,
}) => {
    const chartRef = useRef<ReactECharts>(null);

    // Merge selectedRepeats and hoveredRepeat for highlighting
    const effectiveRepeats = useMemo(() => {
        if (hoveredRepeat) {
            return [...selectedRepeats, hoveredRepeat];
        }
        return selectedRepeats;
    }, [selectedRepeats, hoveredRepeat]);

    const highlightNodeSet = useMemo(
        () => calculateHighlightNodeSet(effectiveRepeats, repeatNodeNames),
        [effectiveRepeats, repeatNodeNames],
    );

    const option = useMemo<EChartsOption>(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return {};
        }

        // Calculate number of layers
        const maxLayer = Math.max(...data.nodes.map(n => n.layer ?? 0));
        const numLayers = maxLayer + 1;

        // Prepare nodes with styles and depth for layer alignment
        const nodes = data.nodes.map((node) => {
            const isHighlighted = highlightNodeSet && highlightNodeSet.has(node.name);
            const opacity = isHighlighted ? 1 : highlightNodeSet ? 0.3 : 1;

            return {
                name: node.name,
                depth: node.layer ?? 0,  // Force layer alignment by depth
                itemStyle: {
                    color: node.color,
                    opacity: opacity,
                    borderColor: '#fff',
                    borderWidth: 2,
                },
                label: {
                    show: true,
                    formatter: formatNodeLabel(node.name),
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    position: 'top' as const,
                },
            };
        });

        // Prepare links with colors and opacity
        const links = data.links.map((link) => {
            const isHighlighted = link.repeatId && effectiveRepeats.includes(link.repeatId);
            const opacity = !effectiveRepeats.length ? 0.4 : isHighlighted ? 0.6 : 0.15;

            return {
                source: link.source,
                target: link.target,
                value: link.value,
                repeatId: link.repeatId,
                lineStyle: {
                    color: link.color,
                    opacity: opacity,
                    curveness: 0.5,
                },
                emphasis: {
                    lineStyle: {
                        opacity: 0.8,
                    },
                },
            };
        });

        // Calculate layout dimensions based on layerSpacing
        const totalHeight = numLayers * layerSpacing;
        const topMargin = 40;
        const bottomMargin = Math.max(40, height - totalHeight - topMargin);

        return {
            animation: false,
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove',
                formatter: (params: any) => {
                    if (params.dataType === 'node') {
                        const node = data.nodes.find((n) => n.name === params.name);
                        if (!node) return '';
                        return `<b>${formatNodeLabel(node.name)}</b>`;
                    }
                    return '';
                },
            },
            series: [
                {
                    type: 'sankey',
                    orient: 'vertical',
                    layout: 'none',
                    emphasis: {
                        focus: 'adjacency',
                    },
                    data: nodes,
                    links: links,
                    nodeGap: 40, // Horizontal spacing between nodes in same layer
                    nodeWidth: 15, // Node width
                    layoutIterations: 0, // Disable iterations to strictly follow depth-based layer alignment
                    nodeAlign: 'left', // Align nodes to left for vertical layout
                    lineStyle: {
                        color: 'gradient',
                        curveness: 0.5,
                    },
                    label: {
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 500,
                        position: 'top' as const,
                    },
                    left: 150,
                    right: 150,
                    top: topMargin,
                    bottom: bottomMargin,
                },
            ],
        };
    }, [data, highlightNodeSet, effectiveRepeats, layerSpacing, height]);

    // Event handlers
    const onEvents = useMemo(() => {
        return {
            click: (params: any) => {
                if (params.dataType === 'node' && onNodeClick) {
                    const nodeName = params.name;
                    if (nodeName && nodeName.startsWith('repeat:')) {
                        onNodeClick(nodeName);
                    }
                } else if (params.dataType === 'edge' && onLinkClick) {
                    if (params.data?.repeatId) {
                        onLinkClick(params.data.repeatId);
                    }
                }
            },
            mouseover: (params: any) => {
                if (!onRepeatHover) return;

                if (params.dataType === 'node') {
                    const nodeName = params.name;
                    const link = data.links.find(
                        (l) => l.source === nodeName || l.target === nodeName,
                    );
                    if (link?.repeatId) {
                        onRepeatHover(link.repeatId);
                    }
                } else if (params.dataType === 'edge') {
                    if (params.data?.repeatId) {
                        onRepeatHover(params.data.repeatId);
                    }
                }
            },
            mouseout: (params: any) => {
                if (onRepeatHover && (params.dataType === 'node' || params.dataType === 'edge')) {
                    onRepeatHover(null);
                }
            },
        };
    }, [onNodeClick, onLinkClick, onRepeatHover, data.links]);

    return (
        <div
            style={{
                width: typeof width === 'string' ? width : `${width}px`,
                height: `${height}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <ReactECharts
                ref={chartRef}
                option={option}
                style={{
                    width: '100%',
                    height: '100%',
                }}
                opts={{
                    renderer: 'svg',
                }}
                onEvents={onEvents}
            />
        </div>
    );
};
