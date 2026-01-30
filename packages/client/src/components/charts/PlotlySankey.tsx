// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - react-plotly.js types may not be available
import Plot from 'react-plotly.js';
import { useMemo } from 'react';

/**
 * Pure presentation component for rendering Plotly Sankey diagram
 * Renders pre-processed data with opacity and colors, triggers event callbacks
 */

export interface SankeyNode {
    name: string;
    label: string;
    color: string;
    opacity?: number;
}

export interface SankeyLink {
    source: string;
    target: string;
    value: number;
    color: string;
    opacity?: number;
    repeatId?: string;
}

export interface SankeyChartProps {
    data: { nodes: SankeyNode[]; links: SankeyLink[] };
    width?: number | string;
    height?: number;
    onClick?: (type: 'node' | 'link', index: number) => void;
    onHover?: (type: 'node' | 'link', index: number) => void;
    onUnhover?: () => void;
}

export const PlotlySankey: React.FC<SankeyChartProps> = ({
    data,
    width = '100%',
    height = 600,
    onClick,
    onHover,
    onUnhover,
}) => {
    const plotData = useMemo(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return null;
        }

        const nodeLabels = data.nodes.map((node) => node.label);

        const nodeColors = data.nodes.map((node) => {
            const opacity = node.opacity ?? 1;
            const color = node.color;

            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
            return color;
        });

        const nodeMap = new Map<string, number>();
        data.nodes.forEach((node, index) => {
            nodeMap.set(node.name, index);
        });

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
            const opacity = link.opacity ?? 0.4;
            const baseColor = link.color || '#94a3b8';

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
                arrangement: 'snap' as const,
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
    }, [data]);

    const handleClick = (eventData: any) => {
        console.log('click eventData', eventData);
        if (!onClick || !eventData?.points || eventData.points.length === 0) return;

        const point = eventData.points[0];
        if (point.source !== undefined && point.target !== undefined) {
            const linkIndex = point.pointNumber;
            onClick('link', linkIndex);
        }
        else if (point.pointNumber !== undefined) {
            const nodeIndex = point.pointNumber;
            onClick('node', nodeIndex);
        }
    };

    const handleHover = (eventData: any) => {
        if (!onHover || !eventData?.points || eventData.points.length === 0) return;

        const point = eventData.points[0];
        if (point.source !== undefined && point.target !== undefined) {
            const linkIndex = point.pointNumber;
            onHover('link', linkIndex);
        }
        else if (point.pointNumber !== undefined) {
            const nodeIndex = point.pointNumber;

            onHover('node', nodeIndex);
        }
    };

    const handleUnhover = () => {
        if (onUnhover) {
            onUnhover();
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
