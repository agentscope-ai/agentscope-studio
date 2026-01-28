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
    formatNodeLabel,
} from './utils';

echarts.use([TooltipComponent, EChartsSankeyChart, CanvasRenderer]);

export const EChartsSankey: React.FC<SankeyChartProps> = ({
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

    const option = useMemo<EChartsOption>(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return {};
        }

        // Prepare nodes with styles
        const nodes = data.nodes.map((node) => {
            const isHighlighted = highlightNodeSet && highlightNodeSet.has(node.name);
            const opacity = isHighlighted ? 1 : highlightNodeSet ? 0.3 : 1;

            return {
                name: node.name,
                itemStyle: {
                    color: node.color,
                    opacity: opacity,
                    borderColor: '#fff',
                    borderWidth: 2,
                },
                label: {
                    show: true,
                    position: 'center',  // Display label above node
                    // formatter: formatNodeLabel(node.name),
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 500,
                    distance: 0,  // Distance from node
                    overflow: 'truncate'
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
                    color: link.color || '#94a3b8',
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
                    nodeGap: 40, // Fixed horizontal spacing between nodes in same layer
                    nodeWidth: 15,
                    layoutIterations: 32, // Limited iterations: preserves first layer order while allowing some optimization
                    nodeAlign: 'left', // Align nodes to left for vertical layout
                    lineStyle: {
                        color: 'gradient',
                        curveness: 0.5,
                    },
                    label: {
                        show: true,
                        position: 'left',  // Display labels above nodes
                        color: '#ffffff',
                        fontSize: 8,
                        fontWeight: 500,
                        distance: 5,  // Distance from node
                    },
                    left: 150,
                    right: 150,
                    top: 40, // Fixed top margin
                    bottom: Math.max(40, height - (data.nodes.length * layerSpacing)), // Dynamic bottom based on layerSpacing
                },
            ],
        };
    }, [data, highlightNodeSet, effectiveRepeats, layerSpacing, height]);

    // 初始化图表（只执行一次）
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = echarts.init(chartRef.current);
        echartInstanceRef.current = chart;

        const handleResize = () => {
            chart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
            echartInstanceRef.current = null;
        };
    }, []);

    // 更新图表配置
    useEffect(() => {
        if (echartInstanceRef.current) {
            echartInstanceRef.current.setOption(option);
        }
    }, [option]);

    // 设置事件监听器
    useEffect(() => {
        const chart = echartInstanceRef.current;
        if (!chart) return;

        // 清除所有旧的事件监听器
        chart.off('click');
        chart.off('mouseover');
        chart.off('mouseout');

        // 点击事件
        const handleClick = (params: any) => {
            if (params.dataType === 'node' && onNodeClick) {
                const nodeName = params.name;
                if (nodeName && nodeName.startsWith('repeat:')) {
                    onNodeClick(nodeName);
                }
            } else if (params.dataType === 'edge' && onLinkClick) {
                // 点击连线 - params.data 包含 repeatId
                if (params.data?.repeatId) {
                    onLinkClick(params.data.repeatId);
                }
            }
        };

        // 鼠标悬停事件
        const handleMouseOver = (params: any) => {
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
                // 悬停连线 - params.data 包含 repeatId
                if (params.data?.repeatId) {
                    onRepeatHover(params.data.repeatId);
                }
            }
        };

        // 鼠标离开事件
        const handleMouseOut = (params: any) => {
            if (onRepeatHover && (params.dataType === 'node' || params.dataType === 'edge')) {
                onRepeatHover(null);
            }
        };

        chart.on('click', handleClick);
        chart.on('mouseover', handleMouseOver);
        chart.on('mouseout', handleMouseOut);

        return () => {
            chart.off('click', handleClick);
            chart.off('mouseover', handleMouseOver);
            chart.off('mouseout', handleMouseOut);
        };
    }, [onNodeClick, onLinkClick, onRepeatHover, data.links]);

    return (
        <div
            ref={chartRef}
            style={{
                width: typeof width === 'string' ? width : `${width}px`,
                height: `${height}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        />
    );
};
