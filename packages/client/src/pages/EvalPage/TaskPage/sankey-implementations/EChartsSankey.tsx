import type { EChartsOption } from 'echarts';
import { SankeyChart as EChartsSankeyChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import type { ECharts } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';
import { SankeyChartProps } from './types';
import {
    calculateHighlightNodeSet,
    calculateNodeValues,
    formatNodeLabel,
    getNodeColors,
    processLinks,
} from './utils';

echarts.use([TooltipComponent, EChartsSankeyChart, CanvasRenderer]);

export const EChartsSankey: React.FC<SankeyChartProps> = ({
    data,
    width = '100%',
    height,
    selectedRepeats = [],
    repeatNodeNames,
    hoveredRepeat,
    onNodeClick,
    onRepeatHover,
}) => {
    const chartRef = useRef<HTMLDivElement | null>(null);
    const echartInstanceRef = useRef<ECharts | null>(null);

    // 合并 selectedRepeats 和 hoveredRepeat 用于高亮
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

    const nodeMap = useMemo(() => {
        const map = new Map<string, number>();
        data.nodes.forEach((node, index) => {
            map.set(node.name, index);
        });
        return map;
    }, [data.nodes]);

    const nodeLabels = useMemo(() => {
        const MAX_LABEL_LENGTH = 15;
        return data.nodes.map((n) => {
            const fullLabel = formatNodeLabel(n.name);
            return fullLabel.length > MAX_LABEL_LENGTH
                ? fullLabel.substring(0, MAX_LABEL_LENGTH) + '...'
                : fullLabel;
        });
    }, [data.nodes]);

    const nodeColors = useMemo(
        () => getNodeColors(data.nodes, highlightNodeSet),
        [data.nodes, highlightNodeSet],
    );

    const nodeValues = useMemo(
        () => calculateNodeValues(data.nodes, data.links),
        [data.nodes, data.links],
    );

    const { sources, targets, values, colors } = useMemo(
        () => processLinks(data.links, effectiveRepeats, nodeMap),
        [data.links, effectiveRepeats, nodeMap],
    );

    const option = useMemo<EChartsOption>(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return {};
        }

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
                    emphasis: {
                        disabled: true,
                    },
                    nodeWidth: 4,
                    nodeGap: 80,
                    draggable: false,
                    left: '5%',
                    right: '5%',
                    top: '2%',
                    bottom: '2%',
                    layoutIterations: 32,
                    data: data.nodes.map((n, i) => ({
                        name: n.name,
                        value: nodeValues[i],
                        itemStyle: {
                            color: nodeColors[i],
                            opacity:
                                highlightNodeSet && highlightNodeSet.has(n.name)
                                    ? 1
                                    : highlightNodeSet
                                        ? 0.3
                                        : 1,
                            borderWidth: 0,
                            borderColor: 'transparent',
                        },
                        label: {
                            show: true,
                            formatter: nodeLabels[i],
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 'normal',
                            position: 'right',
                        },
                    })),
                    links: data.links
                        .map((l, idx) => {
                            const sourceIdx = nodeMap.get(l.source);
                            const targetIdx = nodeMap.get(l.target);
                            if (sourceIdx === undefined || targetIdx === undefined)
                                return null;
                            return {
                                source: sourceIdx,
                                target: targetIdx,
                                value: values[idx],
                                lineStyle: {
                                    color: colors[idx],
                                    opacity: 0.5,
                                    curveness: 0.5,
                                },
                            };
                        })
                        .filter((l) => l !== null),
                    label: {
                        fontSize: 11,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        color: '#ffffff',
                    },
                },
            ],
        };
    }, [
        data,
        nodeLabels,
        nodeColors,
        nodeValues,
        sources,
        targets,
        values,
        colors,
        highlightNodeSet,
        nodeMap,
        effectiveRepeats,
    ]);

    useEffect(() => {
        if (!chartRef.current) return;

        const chart = echarts.init(chartRef.current);
        echartInstanceRef.current = chart;

        chart.setOption(option);

        // 点击事件
        chart.on('click', (params: any) => {
            if (params.dataType === 'node' && onNodeClick) {
                const nodeName = params.name;
                if (nodeName && nodeName.startsWith('repeat:')) {
                    const repeatId = nodeName.split(':')[1];
                    onNodeClick(repeatId);
                }
            }
        });

        // 鼠标悬停事件
        if (onRepeatHover) {
            chart.on('mouseover', (params: any) => {
                if (params.dataType === 'node') {
                    const nodeName = params.name;
                    const link = data.links.find(
                        (l) => l.source === nodeName || l.target === nodeName,
                    );
                    if (link?.repeatId) {
                        onRepeatHover(link.repeatId);
                    }
                } else if (params.dataType === 'edge') {
                    const sourceIdx = params.data.source;
                    const targetIdx = params.data.target;
                    const link = data.links.find((l) => {
                        const sourceIndex = nodeMap.get(l.source);
                        const targetIndex = nodeMap.get(l.target);
                        return sourceIndex === sourceIdx && targetIndex === targetIdx;
                    });
                    if (link?.repeatId) {
                        onRepeatHover(link.repeatId);
                    }
                }
            });

            chart.on('mouseout', (params: any) => {
                if (params.dataType === 'node' || params.dataType === 'edge') {
                    onRepeatHover(null);
                }
            });
        }

        const handleResize = () => {
            chart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
        };
    }, [option, onNodeClick, onRepeatHover, data.links, nodeMap]);

    const autoHeight = height || Math.max(600, data.nodes.length * 80 + 200);

    return (
        <div
            ref={chartRef}
            style={{
                width: typeof width === 'string' ? width : `${width}px`,
                height: `${autoHeight}px`,
            }}
        />
    );
};
