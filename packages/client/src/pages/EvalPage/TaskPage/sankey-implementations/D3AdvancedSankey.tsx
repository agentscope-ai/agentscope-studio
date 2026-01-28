/**
 * D3-based Advanced Sankey Chart with precise control over node and link positions
 * Features:
 * - Custom link ordering per node (input/output sorted by repeatId)
 * - Node labels
 * - Hover highlighting
 * - Vertical orientation (top to bottom flow)
 * - Ribbon-style links that taper in the middle
 */
import { sankey, SankeyNode, SankeyLink } from 'd3-sankey';
import { memo, useCallback, useMemo, useState } from 'react';
import { SankeyChartProps } from './types';
import { formatNodeLabel } from './utils';

// Internal types for D3 Sankey
interface InternalNodeData {
    id: string;
    label: string;
    color: string;
    layer?: number;
}

interface InternalLinkData {
    source: string;
    target: string;
    value: number;
    repeatId: string;
    color: string;
}

interface D3InternalSankeyProps {
    nodes: InternalNodeData[];
    links: InternalLinkData[];
    width: number;
    height: number;
    nodeWidth?: number;
    nodePadding?: number;
    linkWidth?: number;
    selectedRepeats?: string[];
    onNodeClick?: (node: InternalNodeData) => void;
    onLinkClick?: (link: InternalLinkData) => void;
}

// Vertical node after coordinate transformation
interface VerticalNode extends InternalNodeData {
    vx0: number;  // left edge (horizontal)
    vx1: number;  // right edge (horizontal)
    vy0: number;  // top edge (vertical)
    vy1: number;  // bottom edge (vertical)
}

// Vertical link after coordinate transformation
interface VerticalLink {
    source: VerticalNode;
    target: VerticalNode;
    value: number;
    repeatId: string;
    color: string;
    // Widths at source and target (may differ based on node width)
    sourceWidth: number;
    targetWidth: number;
    // Horizontal positions where link connects
    sourceX: number;
    targetX: number;
}

type D3Node = SankeyNode<InternalNodeData, InternalLinkData>;
type D3Link = SankeyLink<InternalNodeData, InternalLinkData>;

// Internal component
const D3AdvancedSankeyInternal = memo(({
    nodes,
    links,
    width,
    height,
    nodeWidth = 16,
    nodePadding = 12,
    linkWidth = 16,
    selectedRepeats = [],
    onNodeClick,
    onLinkClick,
}: D3InternalSankeyProps) => {
    const [highlightedRepeat, setHighlightedRepeat] = useState<string | null>(null);

    // Combine selectedRepeats and highlightedRepeat for highlighting
    const activeRepeats = useMemo(() => {
        const repeats = new Set(selectedRepeats);
        if (highlightedRepeat) {
            repeats.add(highlightedRepeat);
        }
        return repeats;
    }, [selectedRepeats, highlightedRepeat]);

    // Build the sankey layout with vertical orientation
    const { verticalNodes, verticalLinks } = useMemo(() => {
        if (nodes.length === 0) return { verticalNodes: [], verticalLinks: [] };

        // ========== Barycenter ordering to minimize link crossings ==========
        // Group nodes by layer
        const nodesByLayer = new Map<number, InternalNodeData[]>();
        nodes.forEach(n => {
            const layer = n.layer ?? 0;
            if (!nodesByLayer.has(layer)) {
                nodesByLayer.set(layer, []);
            }
            nodesByLayer.get(layer)!.push(n);
        });

        // Build adjacency lists for barycenter calculation
        const predecessors = new Map<string, string[]>();  // nodeId -> source nodeIds
        const successors = new Map<string, string[]>();    // nodeId -> target nodeIds
        links.forEach(l => {
            if (!predecessors.has(l.target)) predecessors.set(l.target, []);
            predecessors.get(l.target)!.push(l.source);
            if (!successors.has(l.source)) successors.set(l.source, []);
            successors.get(l.source)!.push(l.target);
        });

        // Node positions (fractional for more precision)
        const nodePosition = new Map<string, number>();
        const layers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b);

        // Initialize: sort by repeat ID for first layer, by name for others
        layers.forEach(layer => {
            const layerNodes = nodesByLayer.get(layer)!;
            layerNodes.sort((a, b) => {
                if (a.id.startsWith('repeat:') && b.id.startsWith('repeat:')) {
                    return parseInt(a.id.split(':')[1], 10) - parseInt(b.id.split(':')[1], 10);
                }
                return a.id.localeCompare(b.id);
            });
            layerNodes.forEach((n, i) => nodePosition.set(n.id, i));
        });

        // Calculate weighted barycenter considering both predecessors and successors
        const calcBarycenter = (node: InternalNodeData, usePreds: boolean, useSuccs: boolean): number => {
            const preds = usePreds ? (predecessors.get(node.id) || []) : [];
            const succs = useSuccs ? (successors.get(node.id) || []) : [];

            if (preds.length === 0 && succs.length === 0) {
                return nodePosition.get(node.id) ?? 0;
            }

            let sum = 0;
            let count = 0;

            preds.forEach(p => {
                sum += nodePosition.get(p) ?? 0;
                count++;
            });
            succs.forEach(s => {
                sum += nodePosition.get(s) ?? 0;
                count++;
            });

            return count > 0 ? sum / count : (nodePosition.get(node.id) ?? 0);
        };

        // More iterations for better convergence
        const iterations = 12;
        for (let iter = 0; iter < iterations; iter++) {
            // Forward pass: order by predecessor positions
            for (let i = 1; i < layers.length; i++) {
                const layer = layers[i];
                const layerNodes = nodesByLayer.get(layer)!;

                const barycenters = layerNodes.map(node => ({
                    node,
                    barycenter: calcBarycenter(node, true, false)
                }));

                barycenters.sort((a, b) => a.barycenter - b.barycenter);
                barycenters.forEach((item, idx) => nodePosition.set(item.node.id, idx));
                nodesByLayer.set(layer, barycenters.map(b => b.node));
            }

            // Backward pass: order by successor positions
            for (let i = layers.length - 2; i >= 0; i--) {
                const layer = layers[i];
                const layerNodes = nodesByLayer.get(layer)!;

                // Keep first layer (repeats) fixed
                if (layer === 0) continue;

                const barycenters = layerNodes.map(node => ({
                    node,
                    barycenter: calcBarycenter(node, false, true)
                }));

                barycenters.sort((a, b) => a.barycenter - b.barycenter);
                barycenters.forEach((item, idx) => nodePosition.set(item.node.id, idx));
                nodesByLayer.set(layer, barycenters.map(b => b.node));
            }

            // Combined pass with connection count weighting
            for (let i = 1; i < layers.length - 1; i++) {
                const layer = layers[i];
                const layerNodes = nodesByLayer.get(layer)!;

                const barycenters = layerNodes.map(node => {
                    const preds = predecessors.get(node.id) || [];
                    const succs = successors.get(node.id) || [];

                    // Weight by number of connections - nodes with more connections to one side
                    // should be pulled more strongly to that side
                    let weightedSum = 0;
                    let totalWeight = 0;

                    preds.forEach(p => {
                        const pos = nodePosition.get(p) ?? 0;
                        weightedSum += pos;
                        totalWeight += 1;
                    });
                    succs.forEach(s => {
                        const pos = nodePosition.get(s) ?? 0;
                        weightedSum += pos;
                        totalWeight += 1;
                    });

                    const barycenter = totalWeight > 0 ? weightedSum / totalWeight : (nodePosition.get(node.id) ?? 0);
                    return { node, barycenter };
                });

                barycenters.sort((a, b) => a.barycenter - b.barycenter);
                barycenters.forEach((item, idx) => nodePosition.set(item.node.id, idx));
                nodesByLayer.set(layer, barycenters.map(b => b.node));
            }

            // Additional: Try to reduce crossings by swapping adjacent nodes
            for (let i = 1; i < layers.length; i++) {
                const layer = layers[i];
                const layerNodes = nodesByLayer.get(layer)!;

                // Simple adjacent swap if it reduces crossing metric
                let improved = true;
                while (improved) {
                    improved = false;
                    for (let j = 0; j < layerNodes.length - 1; j++) {
                        const nodeA = layerNodes[j];
                        const nodeB = layerNodes[j + 1];

                        // Calculate "crossing score" before swap
                        const predsA = predecessors.get(nodeA.id) || [];
                        const predsB = predecessors.get(nodeB.id) || [];

                        let crossingsBefore = 0;
                        predsA.forEach(pa => {
                            const posA = nodePosition.get(pa) ?? 0;
                            predsB.forEach(pb => {
                                const posB = nodePosition.get(pb) ?? 0;
                                // A is at position j, B is at position j+1
                                // If pa > pb, there's a crossing
                                if (posA > posB) crossingsBefore++;
                            });
                        });

                        // After swap: A at j+1, B at j
                        // If pa < pb, there would be a crossing
                        let crossingsAfter = 0;
                        predsA.forEach(pa => {
                            const posA = nodePosition.get(pa) ?? 0;
                            predsB.forEach(pb => {
                                const posB = nodePosition.get(pb) ?? 0;
                                if (posA < posB) crossingsAfter++;
                            });
                        });

                        if (crossingsAfter < crossingsBefore) {
                            // Swap
                            layerNodes[j] = nodeB;
                            layerNodes[j + 1] = nodeA;
                            nodePosition.set(nodeA.id, j + 1);
                            nodePosition.set(nodeB.id, j);
                            improved = true;
                        }
                    }
                }
                nodesByLayer.set(layer, layerNodes);
            }
        }

        // Flatten the reordered nodes
        const orderedNodes: InternalNodeData[] = [];
        layers.forEach(layer => {
            orderedNodes.push(...(nodesByLayer.get(layer) || []));
        });

        // Create node index map based on new order
        const nodeIndexById = new Map<string, number>();
        orderedNodes.forEach((n, i) => nodeIndexById.set(n.id, i));

        // Create sankey generator
        const sankeyGenerator = sankey<InternalNodeData, InternalLinkData>()
            .nodeId((d: D3Node) => {
                const nodeData = d as unknown as InternalNodeData;
                return nodeIndexById.get(nodeData.id) ?? 0;
            })
            .nodeWidth(nodeWidth)
            .nodePadding(nodePadding)
            .nodeSort((a: D3Node, b: D3Node) => {
                // Use the pre-calculated positions
                const aNode = a as unknown as InternalNodeData;
                const bNode = b as unknown as InternalNodeData;
                const posA = nodePosition.get(aNode.id) ?? 0;
                const posB = nodePosition.get(bNode.id) ?? 0;
                return posA - posB;
            })
            .linkSort((a: D3Link, b: D3Link) => {
                const aLink = a as unknown as InternalLinkData;
                const bLink = b as unknown as InternalLinkData;
                const repeatA = parseInt(aLink.repeatId || '0', 10);
                const repeatB = parseInt(bLink.repeatId || '0', 10);
                return repeatA - repeatB;
            })
            .extent([[40, 40], [height - 40, width - 80]]);

        // Prepare data for sankey with reordered nodes
        const sankeyData = {
            nodes: orderedNodes.map(n => ({ ...n })),
            links: links
                .filter(l => nodeIndexById.has(l.source) && nodeIndexById.has(l.target))
                .map(l => ({
                    ...l,
                    source: nodeIndexById.get(l.source)!,
                    target: nodeIndexById.get(l.target)!,
                })),
        };

        // Apply the sankey layout
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = sankeyGenerator(sankeyData as any);

        // Create node map by id for quick lookup
        const nodeById = new Map<string, VerticalNode>();

        // Transform nodes: swap x and y for vertical orientation
        const vNodes: VerticalNode[] = result.nodes.map((node: D3Node) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const n = node as any;
            const vNode: VerticalNode = {
                id: n.id,
                label: n.label,
                color: n.color,
                layer: n.layer,
                vx0: n.y0,
                vx1: n.y1,
                vy0: n.x0,
                vy1: n.x1,
            };
            nodeById.set(vNode.id, vNode);
            return vNode;
        });

        // First pass: create vertical links with basic info
        const vLinks: VerticalLink[] = result.links.map((link: D3Link) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const l = link as any;
            const sourceId = typeof l.source === 'object' ? l.source.id : nodes[l.source]?.id;
            const targetId = typeof l.target === 'object' ? l.target.id : nodes[l.target]?.id;

            return {
                source: nodeById.get(sourceId)!,
                target: nodeById.get(targetId)!,
                value: l.value,
                repeatId: l.repeatId,
                color: l.color,
                sourceWidth: linkWidth,
                targetWidth: linkWidth,
                sourceX: 0,
                targetX: 0,
            };
        });

        // Group links by node (both as source and target)
        const linksByNode = new Map<string, { incoming: VerticalLink[], outgoing: VerticalLink[] }>();

        vLinks.forEach(link => {
            // Add to source's outgoing
            if (!linksByNode.has(link.source.id)) {
                linksByNode.set(link.source.id, { incoming: [], outgoing: [] });
            }
            linksByNode.get(link.source.id)!.outgoing.push(link);

            // Add to target's incoming
            if (!linksByNode.has(link.target.id)) {
                linksByNode.set(link.target.id, { incoming: [], outgoing: [] });
            }
            linksByNode.get(link.target.id)!.incoming.push(link);
        });

        // For each node, assign consistent positions to repeats
        // A repeat that passes through (has both in and out) should maintain position
        linksByNode.forEach((nodeLinks, nodeId) => {
            const node = nodeById.get(nodeId);
            if (!node) return;

            const nodeW = node.vx1 - node.vx0;
            const { incoming, outgoing } = nodeLinks;

            // Collect all unique repeats at this node
            const repeatSet = new Set<string>();
            incoming.forEach(l => repeatSet.add(l.repeatId));
            outgoing.forEach(l => repeatSet.add(l.repeatId));

            // Group by: pass-through (both in and out), in-only, out-only
            const passThrough: string[] = [];
            const inOnly: string[] = [];
            const outOnly: string[] = [];

            repeatSet.forEach(repeatId => {
                const hasIn = incoming.some(l => l.repeatId === repeatId);
                const hasOut = outgoing.some(l => l.repeatId === repeatId);
                if (hasIn && hasOut) {
                    passThrough.push(repeatId);
                } else if (hasIn) {
                    inOnly.push(repeatId);
                } else {
                    outOnly.push(repeatId);
                }
            });

            // Sort pass-through repeats by their incoming source position
            passThrough.sort((a, b) => {
                const linkA = incoming.find(l => l.repeatId === a);
                const linkB = incoming.find(l => l.repeatId === b);
                const posA = linkA ? (linkA.source.vx0 + linkA.source.vx1) / 2 : 0;
                const posB = linkB ? (linkB.source.vx0 + linkB.source.vx1) / 2 : 0;
                return posA - posB;
            });

            // Sort in-only by source position
            inOnly.sort((a, b) => {
                const linkA = incoming.find(l => l.repeatId === a);
                const linkB = incoming.find(l => l.repeatId === b);
                const posA = linkA ? (linkA.source.vx0 + linkA.source.vx1) / 2 : 0;
                const posB = linkB ? (linkB.source.vx0 + linkB.source.vx1) / 2 : 0;
                return posA - posB;
            });

            // Sort out-only by target position
            outOnly.sort((a, b) => {
                const linkA = outgoing.find(l => l.repeatId === a);
                const linkB = outgoing.find(l => l.repeatId === b);
                const posA = linkA ? (linkA.target.vx0 + linkA.target.vx1) / 2 : 0;
                const posB = linkB ? (linkB.target.vx0 + linkB.target.vx1) / 2 : 0;
                return posA - posB;
            });

            // Combine: in-only on left, pass-through in middle, out-only on right
            // Actually, sort all by average connected position for better results
            const allRepeats = [...passThrough, ...inOnly, ...outOnly];
            allRepeats.sort((a, b) => {
                // Calculate average position of connected nodes for each repeat
                let sumA = 0, countA = 0, sumB = 0, countB = 0;

                const inA = incoming.find(l => l.repeatId === a);
                const outA = outgoing.find(l => l.repeatId === a);
                const inB = incoming.find(l => l.repeatId === b);
                const outB = outgoing.find(l => l.repeatId === b);

                if (inA) { sumA += (inA.source.vx0 + inA.source.vx1) / 2; countA++; }
                if (outA) { sumA += (outA.target.vx0 + outA.target.vx1) / 2; countA++; }
                if (inB) { sumB += (inB.source.vx0 + inB.source.vx1) / 2; countB++; }
                if (outB) { sumB += (outB.target.vx0 + outB.target.vx1) / 2; countB++; }

                const avgA = countA > 0 ? sumA / countA : 0;
                const avgB = countB > 0 ? sumB / countB : 0;
                return avgA - avgB;
            });

            // Assign positions
            const totalRepeats = allRepeats.length;
            const gap = Math.min(2, nodeW / (totalRepeats * 4));
            const availableWidth = nodeW - gap * Math.max(0, totalRepeats - 1);
            const perRepeatWidth = totalRepeats > 0 ? availableWidth / totalRepeats : nodeW;

            // Map repeatId -> position
            const repeatPosition = new Map<string, { x: number, width: number }>();
            let currentX = node.vx0 + perRepeatWidth / 2;

            allRepeats.forEach(repeatId => {
                repeatPosition.set(repeatId, { x: currentX, width: perRepeatWidth });
                currentX += perRepeatWidth + gap;
            });

            // Apply positions to links
            incoming.forEach(link => {
                const pos = repeatPosition.get(link.repeatId);
                if (pos) {
                    link.targetX = pos.x;
                    link.targetWidth = pos.width;
                }
            });

            outgoing.forEach(link => {
                const pos = repeatPosition.get(link.repeatId);
                if (pos) {
                    link.sourceX = pos.x;
                    link.sourceWidth = pos.width;
                }
            });
        });

        return {
            verticalNodes: vNodes,
            verticalLinks: vLinks,
        };
    }, [nodes, links, width, height, nodeWidth, nodePadding, linkWidth]);

    // Generate ribbon-style link path - smooth S-curve that can have different widths at source/target
    const generateRibbonPath = useCallback((link: VerticalLink): string => {
        const x0 = link.sourceX;
        const y0 = link.source.vy1;
        const x1 = link.targetX;
        const y1 = link.target.vy0;

        // Half-widths at source and target
        const w0 = link.sourceWidth / 2;
        const w1 = link.targetWidth / 2;

        const verticalDistance = Math.max(y1 - y0, 1);

        // Control points for smooth S-curve (cubic bezier)
        const curvature = 0.5;
        const cy1 = y0 + verticalDistance * curvature;
        const cy2 = y1 - verticalDistance * curvature;

        // Create a ribbon that smoothly transitions from source width to target width
        // Left edge: from (x0 - w0) to (x1 - w1)
        // Right edge: from (x1 + w1) back to (x0 + w0)

        return `
            M ${x0 - w0} ${y0}
            C ${x0 - w0} ${cy1}, ${x1 - w1} ${cy2}, ${x1 - w1} ${y1}
            L ${x1 + w1} ${y1}
            C ${x1 + w1} ${cy2}, ${x0 + w0} ${cy1}, ${x0 + w0} ${y0}
            Z
        `;
    }, []);

    // Handle mouse events
    const handleLinkMouseEnter = useCallback((link: VerticalLink) => {
        setHighlightedRepeat(link.repeatId);
    }, []);

    const handleNodeMouseEnter = (node: VerticalNode) => {
        const nodeLinks = verticalLinks.filter(l =>
            l.source.id === node.id || l.target.id === node.id
        );
        if (nodeLinks.length > 0) {
            setHighlightedRepeat(nodeLinks[0].repeatId);
        }
    };

    const handleMouseLeave = useCallback(() => {
        setHighlightedRepeat(null);
    }, []);

    const isLinkHighlighted = useCallback((link: VerticalLink): boolean => {
        if (activeRepeats.size === 0) return true;
        return activeRepeats.has(link.repeatId);
    }, [activeRepeats]);

    const isNodeHighlighted = (node: VerticalNode): boolean => {
        if (activeRepeats.size === 0) return true;
        const nodeLinks = verticalLinks.filter(l =>
            l.source.id === node.id || l.target.id === node.id
        );
        return nodeLinks.some(l => activeRepeats.has(l.repeatId));
    };

    if (verticalNodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No data to display
            </div>
        );
    }

    return (
        <svg width={width} height={height} className="overflow-visible">
            {/* Links as filled ribbons */}
            <g className="links">
                {verticalLinks.map((link, i) => {
                    const highlighted = isLinkHighlighted(link);
                    return (
                        <path
                            key={`link-${i}`}
                            d={generateRibbonPath(link)}
                            fill={link.color}
                            fillOpacity={highlighted ? 0.5 : 0.08}
                            stroke="none"
                            style={{
                                transition: 'fill-opacity 0.2s',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={() => handleLinkMouseEnter(link)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => onLinkClick?.({
                                source: link.source.id,
                                target: link.target.id,
                                value: link.value,
                                repeatId: link.repeatId,
                                color: link.color,
                            })}
                        >
                            <title>Repeat {link.repeatId}</title>
                        </path>
                    );
                })}
            </g>

            {/* Nodes */}
            <g className="nodes">
                {verticalNodes.map((node) => {
                    const highlighted = isNodeHighlighted(node);
                    const x = node.vx0;
                    const y = node.vy0;
                    const nodeW = node.vx1 - node.vx0;
                    const nodeH = node.vy1 - node.vy0;

                    return (
                        <g
                            key={`node-${node.id}`}
                            transform={`translate(${x}, ${y})`}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => handleNodeMouseEnter(node)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => onNodeClick?.(node)}
                        >
                            {/* Node rectangle */}
                            <rect
                                width={nodeW}
                                height={nodeH}
                                fill={node.color}
                                opacity={highlighted ? 1 : 0.2}
                                rx={2}
                                ry={2}
                                style={{ transition: 'opacity 0.2s' }}
                            />
                            {/* Node label */}
                            <text
                                x={nodeW / 2}
                                y={-5}
                                textAnchor="middle"
                                fontSize={10}
                                fill="currentColor"
                                opacity={highlighted ? 1 : 0.3}
                                style={{ transition: 'opacity 0.2s' }}
                            >
                                {node.label}
                            </text>
                            <title>{node.label}</title>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
});

D3AdvancedSankeyInternal.displayName = 'D3AdvancedSankeyInternal';

// Wrapper component that adapts SankeyChartProps to internal format
export const D3AdvancedSankey: React.FC<SankeyChartProps> = ({
    data,
    width = 800,
    height = 600,
    selectedRepeats = [],
    onNodeClick,
    onLinkClick,
    layerSpacing = 80,
}) => {
    // Convert to internal format
    const internalNodes: InternalNodeData[] = useMemo(() => {
        return data.nodes.map((node) => ({
            id: node.name,
            label: formatNodeLabel(node.name),
            color: node.color,
            layer: node.layer || 0,
        }));
    }, [data.nodes]);

    const internalLinks: InternalLinkData[] = useMemo(() => {
        return data.links.map((link) => ({
            source: link.source,
            target: link.target,
            value: link.value,
            repeatId: link.repeatId || '',
            color: link.color,
        }));
    }, [data.links]);

    // Handle callbacks
    const handleNodeClick = useCallback((node: InternalNodeData) => {
        if (onNodeClick) {
            onNodeClick(node.id);
        }
    }, [onNodeClick]);

    const handleLinkClick = useCallback((link: InternalLinkData) => {
        if (onLinkClick && link.repeatId) {
            onLinkClick(link.repeatId);
        }
    }, [onLinkClick]);

    const chartWidth = typeof width === 'number' ? width : 800;
    const chartHeight = typeof height === 'number' ? height : 600;

    // Calculate nodePadding based on layerSpacing
    const nodePadding = Math.max(12, layerSpacing / 6);

    return (
        <D3AdvancedSankeyInternal
            nodes={internalNodes}
            links={internalLinks}
            width={chartWidth}
            height={chartHeight}
            nodeWidth={20}
            nodePadding={nodePadding}
            linkWidth={10}
            selectedRepeats={selectedRepeats}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
        />
    );
};

D3AdvancedSankey.displayName = 'D3AdvancedSankey';
