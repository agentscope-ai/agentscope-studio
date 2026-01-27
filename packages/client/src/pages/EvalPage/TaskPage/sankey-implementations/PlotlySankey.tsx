// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - react-plotly.js types may not be available
import Plot from 'react-plotly.js';
import { useMemo } from 'react';
import { SankeyChartProps } from './types';
import {
    calculateHighlightNodeSet,
    formatNodeLabel,
    getNodeColors,
} from './utils';

export const PlotlySankey: React.FC<SankeyChartProps> = ({
    data,
    width = '100%',
    height,
    selectedRepeats = [],
    repeatNodeNames,
    hoveredRepeat,
    onNodeClick,
    onRepeatHover,
}) => {
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

    const plotData = useMemo(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return null;
        }

        const nodeLabels = data.nodes.map((node) => formatNodeLabel(node.name));
        const nodeColors = getNodeColors(data.nodes, highlightNodeSet);

        const linkSources = data.links.map((link) => {
            const index = nodeMap.get(link.source);
            return index !== undefined ? index : 0;
        });

        const linkTargets = data.links.map((link) => {
            const index = nodeMap.get(link.target);
            return index !== undefined ? index : 0;
        });

        const linkValues = data.links.map((link) => link.value * 0.25);

        const linkColors = data.links.map((link) => {
            const baseColor = link.lineStyle?.color || '#94a3b8';
            const isHighlighted =
                link.repeatId && effectiveRepeats.includes(link.repeatId);
            const opacity = !effectiveRepeats.length ? 0.5 : isHighlighted ? 0.8 : 0.2;

            if (baseColor.startsWith('#')) {
                const r = parseInt(baseColor.slice(1, 3), 16);
                const g = parseInt(baseColor.slice(3, 5), 16);
                const b = parseInt(baseColor.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            } else if (baseColor.startsWith('rgb(')) {
                return baseColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
            } else if (baseColor.startsWith('rgba(')) {
                return baseColor.replace(/[\d.]+\)$/, `${opacity})`);
            }

            return `rgba(148, 163, 184, ${opacity})`;
        });

        return [
            {
                type: 'sankey' as const,
                orientation: 'v' as const,
                node: {
                    pad: 80,
                    thickness: 4,
                    line: {
                        color: 'transparent',
                        width: 0,
                    },
                    label: nodeLabels,
                    color: nodeColors,
                },
                link: {
                    source: linkSources,
                    target: linkTargets,
                    value: linkValues,
                    color: linkColors,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    smooth: 0.5,
                },
            },
        ];
    }, [data, nodeMap, highlightNodeSet, effectiveRepeats]);

    const handlePlotClick = (event: any) => {
        if (!onNodeClick || !event?.points || event.points.length === 0) return;
        const point = event.points[0];
        if (point.pointNumber !== undefined) {
            const nodeIndex = point.pointNumber;
            const nodeName = data.nodes[nodeIndex]?.name;
            if (nodeName && nodeName.startsWith('repeat:')) {
                const repeatId = nodeName.split(':')[1];
                onNodeClick(repeatId);
            }
        }
    };

    const handlePlotHover = (event: any) => {
        if (!onRepeatHover || !event?.points || event.points.length === 0) return;
        const point = event.points[0];

        if (point.pointNumber !== undefined) {
            const nodeIndex = point.pointNumber;
            const nodeName = data.nodes[nodeIndex]?.name;
            const link = data.links.find(
                (l) => l.source === nodeName || l.target === nodeName,
            );
            if (link?.repeatId) {
                onRepeatHover(link.repeatId);
            }
        }
    };

    const handlePlotUnhover = () => {
        if (onRepeatHover) {
            onRepeatHover(null);
        }
    };

    if (!plotData) return null;

    const autoHeight = height || Math.max(600, data.nodes.length * 80 + 200);

    return (
        <div
            style={{
                width: typeof width === 'string' ? width : `${width}px`,
                height: `${autoHeight}px`,
            }}
        >
            <Plot
                data={plotData}
                layout={{
                    width: typeof width === 'number' ? width : undefined,
                    height: autoHeight,
                    autosize: typeof width === 'string',
                    font: {
                        size: 12,
                        family: 'system-ui, -apple-system, sans-serif',
                        color: '#ffffff',
                    },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    margin: { l: 150, r: 150, t: 40, b: 40 },
                }}
                style={{
                    width: typeof width === 'string' ? width : '100%',
                    height: '100%',
                }}
                config={{
                    displayModeBar: false,
                    responsive: true,
                }}
                onClick={handlePlotClick}
                onHover={handlePlotHover}
                onUnhover={handlePlotUnhover}
            />
        </div>
    );
};
