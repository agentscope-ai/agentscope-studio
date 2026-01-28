// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - react-plotly.js types may not be available
import Plot from 'react-plotly.js';
import { useMemo } from 'react';
import { SankeyChartProps } from './types';
import {
    calculateHighlightNodeSet,
    formatNodeLabel,
} from './utils';

export const PlotlySankey: React.FC<SankeyChartProps> = ({
    data,
    width = '100%',
    height = 600,
    selectedRepeats = [],
    repeatNodeNames,
    hoveredRepeat,
    onNodeClick,
    onLinkClick,
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

    const plotData = useMemo(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return null;
        }

        const nodeLabels = data.nodes.map((node) => formatNodeLabel(node.name));

        // Node colors with opacity based on highlight
        const nodeColors = data.nodes.map((node) => {
            const isHighlighted = highlightNodeSet && highlightNodeSet.has(node.name);
            const opacity = isHighlighted ? 1 : highlightNodeSet ? 0.3 : 1;
            const color = node.color;

            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
            return color;
        });

        // Create node name to index map
        const nodeMap = new Map<string, number>();
        data.nodes.forEach((node, index) => {
            nodeMap.set(node.name, index);
        });

        // Map link sources and targets to node indices
        const linkSources = data.links.map((link) => {
            const index = nodeMap.get(link.source);
            return index !== undefined ? index : 0;
        });

        const linkTargets = data.links.map((link) => {
            const index = nodeMap.get(link.target);
            return index !== undefined ? index : 0;
        });

        const linkValues = data.links.map((link) => link.value);

        const linkColors = data.links.map((link) => {
            const baseColor = link.color || '#94a3b8';
            const isHighlighted = link.repeatId && effectiveRepeats.includes(link.repeatId);
            const opacity = !effectiveRepeats.length ? 0.4 : isHighlighted ? 0.6 : 0.15;

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
                arrangement: 'snap' as const, // Auto-optimize while respecting constraints
                node: {
                    pad: 40,
                    thickness: 15,
                    line: {
                        color: 'white',
                        width: 2,
                    },
                    label: nodeLabels,
                    color: nodeColors,
                },
                link: {
                    source: linkSources,
                    target: linkTargets,
                    value: linkValues,
                    color: linkColors,
                },
            },
        ];
    }, [data, highlightNodeSet, effectiveRepeats]);

    // Click handler - simplified approach using link index
    const handleClick = (eventData: any) => {
        if (!eventData?.points || eventData.points.length === 0) return;

        const point = eventData.points[0];

        // Check if it's a link click (has source and target)
        if (point.source !== undefined && point.target !== undefined && onLinkClick) {
            // Get the link index from the point
            const linkIndex = point.pointNumber;
            const link = data.links[linkIndex];
            if (link?.repeatId) {
                onLinkClick(link.repeatId);
            }
        }
        // Check if it's a node click
        else if (point.pointNumber !== undefined && onNodeClick) {
            const nodeIndex = point.pointNumber;
            const nodeName = data.nodes[nodeIndex]?.name;
            if (nodeName && nodeName.startsWith('repeat:')) {
                onNodeClick(nodeName);
            }
        }
    };

    // Hover handler - simplified approach using link index
    const handleHover = (eventData: any) => {
        if (!onRepeatHover || !eventData?.points || eventData.points.length === 0) return;

        const point = eventData.points[0];

        // Check if it's hovering over a link
        if (point.source !== undefined && point.target !== undefined) {
            const linkIndex = point.pointNumber;
            const link = data.links[linkIndex];
            if (link?.repeatId) {
                onRepeatHover(link.repeatId);
            }
        }
        // Check if it's hovering over a node
        else if (point.pointNumber !== undefined) {
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

    // Unhover handler
    const handleUnhover = () => {
        if (onRepeatHover) {
            onRepeatHover(null);
        }
    };

    if (!plotData) return null;

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
            <Plot
                data={plotData}
                layout={{
                    width: typeof width === 'number' ? width : undefined,
                    height: height,
                    autosize: typeof width === 'string',
                    font: {
                        size: 12,
                        family: 'system-ui, -apple-system, sans-serif',
                        color: '#ffffff',
                    },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    margin: { l: 10, r: 10, t: 10, b: 10 },
                    hovermode: 'closest',
                }}
                style={{
                    width: typeof width === 'string' ? width : '100%',
                    height: '100%',
                }}
                config={{
                    displayModeBar: false,
                    responsive: true,
                }}
                onClick={handleClick}
                onHover={handleHover}
                onUnhover={handleUnhover}
            />
        </div>
    );
};
