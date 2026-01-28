import { useMemo } from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import type { SankeyChartProps, SankeyNode as SankeyNodeType, SankeyLink } from './types';
import {
    calculateHighlightNodeSet,
    formatNodeLabel,
} from './utils';

/**
 * Recharts Sankey Implementation
 * - Uses recharts Sankey component
 * - Supports repeat color highlighting based on selection and hover
 * - Supports click events for nodes and links
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
}) => {
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

    // Convert data to recharts format
    const chartData = useMemo(() => {
        if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
            return { nodes: [], links: [] };
        }

        // Convert nodes
        const nodes = data.nodes.map((node) => {
            const isHighlighted = highlightNodeSet && highlightNodeSet.has(node.name);
            const opacity = isHighlighted ? 1 : highlightNodeSet ? 0.3 : 1;

            return {
                name: formatNodeLabel(node.name),
                originalName: node.name,
                fill: node.color,
                opacity: opacity,
            };
        });

        // Create node name map for links
        const nodeNameMap = new Map<string, string>();
        data.nodes.forEach((node) => {
            nodeNameMap.set(node.name, formatNodeLabel(node.name));
        });

        // Convert links
        const links = data.links.map((link) => {
            const isHighlighted = link.repeatId && effectiveRepeats.includes(link.repeatId);
            const opacity = !effectiveRepeats.length ? 0.4 : isHighlighted ? 0.6 : 0.15;

            return {
                source: nodeNameMap.get(link.source) || link.source,
                target: nodeNameMap.get(link.target) || link.target,
                value: link.value,
                repeatId: link.repeatId,
                fill: link.color || '#94a3b8',
                opacity: opacity,
            };
        });

        return { nodes, links };
    }, [data, highlightNodeSet, effectiveRepeats]);

    const handleNodeClick = (node: any) => {
        if (onNodeClick && node.originalName && node.originalName.startsWith('repeat:')) {
            onNodeClick(node.originalName);
        }
    };

    const handleNodeMouseEnter = (node: any) => {
        if (!onRepeatHover) return;

        const link = data.links.find(
            (l) => l.source === node.originalName || l.target === node.originalName,
        );
        if (link?.repeatId) {
            onRepeatHover(link.repeatId);
        }
    };

    const handleNodeMouseLeave = () => {
        if (onRepeatHover) {
            onRepeatHover(null);
        }
    };

    const handleLinkClick = (link: any) => {
        if (onLinkClick && link.repeatId) {
            onLinkClick(link.repeatId);
        }
    };

    const handleLinkMouseEnter = (link: any) => {
        if (onRepeatHover && link.repeatId) {
            onRepeatHover(link.repeatId);
        }
    };

    const handleLinkMouseLeave = () => {
        if (onRepeatHover) {
            onRepeatHover(null);
        }
    };

    // Custom node renderer
    const CustomNode = (props: any) => {
        const { x, y, width, height, index, payload } = props;
        const node = chartData.nodes[index];

        return (
            <Layer key={`node-${index}`}>
                <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={node.fill}
                    fillOpacity={node.opacity}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => handleNodeMouseEnter(node)}
                    onMouseLeave={handleNodeMouseLeave}
                />
                <text
                    x={x + width / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={12}
                    fontWeight={500}
                >
                    {node.name}
                </text>
            </Layer>
        );
    };

    // Custom link renderer
    const CustomLink = (props: any) => {
        const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;
        const link = chartData.links[index];

        return (
            <path
                d={`
                    M${sourceX},${sourceY}
                    C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
                `}
                fill="none"
                stroke={link.fill}
                strokeOpacity={link.opacity}
                strokeWidth={linkWidth}
                style={{ cursor: 'pointer' }}
                onClick={() => handleLinkClick(link)}
                onMouseEnter={() => handleLinkMouseEnter(link)}
                onMouseLeave={handleLinkMouseLeave}
            />
        );
    };

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
            <ResponsiveContainer width="100%" height="100%">
                <Sankey
                    data={chartData}
                    node={<CustomNode />}
                    link={<CustomLink />}
                    nodePadding={40}
                    nodeWidth={15}
                    margin={{ top: 40, right: 150, bottom: 40, left: 150 }}
                >
                    <Tooltip
                        content={({ payload }: any) => {
                            if (!payload || payload.length === 0) return null;
                            const item = payload[0];
                            if (item.payload.name) {
                                return (
                                    <div style={{
                                        background: 'rgba(0, 0, 0, 0.8)',
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        color: 'white',
                                    }}>
                                        <b>{item.payload.name}</b>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </Sankey>
            </ResponsiveContainer>
        </div>
    );
};
