import { Chart } from 'react-google-charts';
import { useMemo } from 'react';
import { SankeyChartProps } from './types';
import {
    calculateHighlightNodeSet,
    formatNodeLabel,
    getNodeColors,
    processLinks,
} from './utils';

export const GoogleSankey: React.FC<SankeyChartProps> = ({
    data,
    width = '100%',
    height,
    selectedRepeats = [],
    repeatNodeNames,
    hoveredRepeat,
    onNodeClick,
    onRepeatHover,
}) => {
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

    const chartData = useMemo(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return [['From', 'To', 'Weight']];
        }

        const rows: Array<[string, string, number | string]> = [['From', 'To', 'Weight']];

        const { sources, targets, values } = processLinks(
            data.links,
            effectiveRepeats,
            nodeMap,
        );

        data.links.forEach((l) => {
            const sourceIdx = nodeMap.get(l.source);
            const targetIdx = nodeMap.get(l.target);

            if (sourceIdx !== undefined && targetIdx !== undefined) {
                const linkIndex = sources.findIndex(
                    (s, i) => s === sourceIdx && targets[i] === targetIdx,
                );
                if (linkIndex !== -1) {
                    const sourceLabel = formatNodeLabel(l.source);
                    const targetLabel = formatNodeLabel(l.target);
                    rows.push([sourceLabel, targetLabel, Number(values[linkIndex])]);
                }
            }
        });

        return rows;
    }, [data, effectiveRepeats, nodeMap]);

    const nodeColors = useMemo(() => {
        const colors = getNodeColors(data.nodes, highlightNodeSet);
        return colors.map((color, i) => {
            const node = data.nodes[i];
            let opacity = 1;
            if (highlightNodeSet && highlightNodeSet.has(node.name)) {
                opacity = 1;
            } else if (highlightNodeSet) {
                opacity = 0.3;
            }

            if (color.startsWith('rgba')) {
                const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                if (match) {
                    const r = parseInt(match[1], 10);
                    const g = parseInt(match[2], 10);
                    const b = parseInt(match[3], 10);
                    const baseOpacity = parseFloat(match[4]);
                    const finalOpacity = baseOpacity * opacity;

                    const lightR = Math.round(r * finalOpacity + 255 * (1 - finalOpacity));
                    const lightG = Math.round(g * finalOpacity + 255 * (1 - finalOpacity));
                    const lightB = Math.round(b * finalOpacity + 255 * (1 - finalOpacity));
                    return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
                }
            } else if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                const lightR = Math.round(r * opacity + 255 * (1 - opacity));
                const lightG = Math.round(g * opacity + 255 * (1 - opacity));
                const lightB = Math.round(b * opacity + 255 * (1 - opacity));
                return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
            }
            return color;
        });
    }, [data.nodes, highlightNodeSet]);

    const options = useMemo(() => {
        return {
            sankey: {
                node: {
                    colors: nodeColors,
                    label: {
                        fontName: 'system-ui, -apple-system, sans-serif',
                        fontSize: 12,
                        color: '#ffffff',
                        bold: false,
                    },
                    nodePadding: 80,
                    width: 4,
                },
                link: {
                    colorMode: 'none' as const,
                },
            },
            width: typeof width === 'number' ? width : undefined,
            height: height || Math.max(600, data.nodes.length * 80 + 200),
        };
    }, [nodeColors, width, height, data.nodes.length]);

    const handleChartReady = (chartWrapper: any) => {
        if (!chartWrapper) return;

        const chart = chartWrapper?.chart || chartWrapper?.getChart?.() || chartWrapper;
        if (!chart) return;

        if (typeof window !== 'undefined' && (window as any).google?.visualization) {
            if (onNodeClick) {
                (window as any).google.visualization.events.addListener(
                    chart,
                    'select',
                    () => {
                        const selection = chart.getSelection();
                        if (selection.length > 0) {
                            const selectedItem = selection[0];
                            if (selectedItem.row !== undefined) {
                                const row = selectedItem.row;
                                const link = data.links[row];
                                if (link && link.source.startsWith('repeat:')) {
                                    const repeatId = link.source.split(':')[1];
                                    onNodeClick(repeatId);
                                }
                            }
                        }
                    },
                );
            }

            if (onRepeatHover) {
                (window as any).google.visualization.events.addListener(
                    chart,
                    'onmouseover',
                    (e: any) => {
                        if (e.row !== undefined && e.row !== null) {
                            const link = data.links[e.row];
                            if (link?.repeatId) {
                                onRepeatHover(link.repeatId);
                            }
                        }
                    },
                );

                (window as any).google.visualization.events.addListener(
                    chart,
                    'onmouseout',
                    () => {
                        onRepeatHover(null);
                    },
                );
            }
        }
    };

    if (!chartData || chartData.length <= 1) {
        return null;
    }

    const autoHeight = height || Math.max(600, data.nodes.length * 80 + 200);

    return (
        <div
            style={{
                width: typeof width === 'string' ? width : `${width}px`,
                height: `${autoHeight}px`,
            }}
        >
            <Chart
                chartType="Sankey"
                width={typeof width === 'string' ? '100%' : `${width}px`}
                height={`${autoHeight}px`}
                data={chartData}
                options={options}
                chartEvents={[
                    {
                        eventName: 'ready',
                        callback: handleChartReady,
                    },
                ]}
            />
        </div>
    );
};
