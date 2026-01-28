import * as d3 from 'd3';
import { sankey } from 'd3-sankey';
import { useEffect, useMemo, useRef } from 'react';
import { SankeyChartProps } from './types';
import {
    calculateHighlightNodeSet,
    formatNodeLabel,
} from './utils';

export const D3Sankey: React.FC<SankeyChartProps> = ({
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
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const effectiveRepeats = useMemo(() => {
        if (hoveredRepeat) {
            return [...selectedRepeats, hoveredRepeat];
        }
        return selectedRepeats;
    }, [selectedRepeats, hoveredRepeat]);

    const highlightNodeSet = calculateHighlightNodeSet(
        effectiveRepeats,
        repeatNodeNames,
    );

    useEffect(() => {
        if (
            !svgRef.current ||
            !data ||
            !data.nodes ||
            !data.links ||
            data.nodes.length === 0
        ) {
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const containerWidth =
            typeof width === 'string' ? container.clientWidth : width;
        const margin = { top: 40, right: 150, bottom: 40, left: 150 };

        if (typeof width === 'string' && (!containerWidth || containerWidth <= 0)) {
            return;
        }

        const chartWidth = containerWidth;
        const chartHeight = height;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const chartWidthInner = chartWidth - margin.left - margin.right;
        const chartHeightInner = chartHeight - margin.top - margin.bottom;

        const g = svg
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const nodeIndexMap = new Map<string, number>();
        data.nodes.forEach((node, index) => {
            nodeIndexMap.set(node.name, index);
        });

        const sankeyNodes = data.nodes.map((node) => ({
            name: node.name,
            value: 1,
        }));

        const sankeyLinks = data.links
            .map((link) => {
                const sourceIndex = nodeIndexMap.get(link.source);
                const targetIndex = nodeIndexMap.get(link.target);
                if (sourceIndex === undefined || targetIndex === undefined) return null;
                return {
                    source: sourceIndex,
                    target: targetIndex,
                    value: link.value,
                    repeatId: link.repeatId,
                    color: link.color,
                };
            })
            .filter((link): link is NonNullable<typeof link> => link !== null);

        // Use D3 sankey with optimization settings to avoid crossings and maintain repeat continuity
        const sankeyGenerator = sankey()
            .nodeWidth(15)
            .nodePadding(50) // Increased padding to reduce link overlap
            .nodeSort(null) // Let D3 automatically optimize node positions
            .linkSort((a: any, b: any) => {
                // Primary sort: by repeatId to keep same-repeat links together
                const repeatA = parseInt(a.repeatId || '999999', 10);
                const repeatB = parseInt(b.repeatId || '999999', 10);
                if (repeatA !== repeatB) {
                    return repeatA - repeatB;
                }

                // Secondary sort: within same repeat, maintain source/target order
                // This ensures links don't cross at nodes
                if (a.source !== b.source) {
                    return a.source - b.source;
                }
                return a.target - b.target;
            })
            .iterations(32) // More iterations for better layout optimization
            .extent([
                [0, 0],
                [chartHeightInner, chartWidthInner],
            ]);

        const sankeyData = sankeyGenerator({
            nodes: sankeyNodes.map((d) => ({ ...d })),
            links: sankeyLinks.map((d) => ({ ...d })),
        });

        // Preserve custom link properties (color, repeatId) after sankey processing
        sankeyData.links.forEach((link: any, i: number) => {
            if (sankeyLinks[i]) {
                link.customColor = sankeyLinks[i].color;
                link.customRepeatId = sankeyLinks[i].repeatId;
            }
        });

        // Draw nodes
        g.append('g')
            .selectAll('rect')
            .data(sankeyData.nodes)
            .join('rect')
            .attr('x', (d: any) => d.y0)
            .attr('y', (d: any) => d.x0)
            .attr('height', (d: any) => d.x1 - d.x0)
            .attr('width', (d: any) => d.y1 - d.y0)
            .attr('fill', (_d: any, i: number) => {
                const node = data.nodes[i];
                if (!node) return '#3b82f6';
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
            })
            .style('cursor', 'pointer')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('click', function (_event: any, d: any) {
                const nodeIndex = (d as any).index;
                const nodeName = data.nodes[nodeIndex]?.name;
                if (onNodeClick && nodeName && nodeName.startsWith('repeat:')) {
                    onNodeClick(nodeName);
                }
            })
            .on('mouseover', function (_event: any, d: any) {
                if (onRepeatHover) {
                    const nodeIndex = (d as any).index;
                    const nodeName = data.nodes[nodeIndex]?.name;
                    const link = data.links.find(
                        (l) => l.source === nodeName || l.target === nodeName,
                    );
                    if (link?.repeatId) {
                        onRepeatHover(link.repeatId);
                    }
                }
            })
            .on('mouseout', function () {
                if (onRepeatHover) {
                    onRepeatHover(null);
                }
            });

        // Custom vertical link path generator with swapped coordinates
        // Since we swap x/y for vertical layout, we need a custom path generator
        const customVerticalLink = (d: any) => {
            // In our swapped coordinate system:
            // - d.y0/y1 represents horizontal position (what we render as x)
            // - d.x0/x1 represents vertical position (what we render as y)
            // - d.source/target have x0/x1/y0/y1 in the same swapped system

            const sourceX = d.y0;           // Horizontal position at source node
            const sourceY = d.source.x1;    // Bottom of source node (vertical position)
            const targetX = d.y1;           // Horizontal position at target node
            const targetY = d.target.x0;    // Top of target node (vertical position)

            // Create vertical bezier curve
            const curvature = 0.5;
            const dy = targetY - sourceY;
            const controlY1 = sourceY + dy * curvature;
            const controlY2 = targetY - dy * curvature;

            return `M${sourceX},${sourceY}C${sourceX},${controlY1} ${targetX},${controlY2} ${targetX},${targetY}`;
        };

        // Draw links with vertical layout using custom link generator
        g.append('g')
            .attr('fill', 'none')
            .selectAll('path')
            .data(sankeyData.links)
            .join('path')
            .attr('d', customVerticalLink)
            .attr('stroke', (d: any) => d.customColor || '#94a3b8')
            .attr('stroke-width', (d: any) => Math.max(1, d.width)) // Reduce link width to prevent overlap
            .attr('opacity', (d: any) => {
                if (!effectiveRepeats.length) return 0.4;
                return d.customRepeatId && effectiveRepeats.includes(d.customRepeatId) ? 0.6 : 0.15;
            })
            .style('cursor', 'pointer')
            .on('click', function (_event: any, d: any) {
                if (onLinkClick && d.customRepeatId) {
                    onLinkClick(d.customRepeatId);
                }
            })
            .on('mouseover', function (_event: any, d: any) {
                if (onRepeatHover && d.customRepeatId) {
                    onRepeatHover(d.customRepeatId);
                }
            })
            .on('mouseout', function () {
                if (onRepeatHover) {
                    onRepeatHover(null);
                }
            });

        // Draw labels
        g.append('g')
            .selectAll('text')
            .data(sankeyData.nodes)
            .join('text')
            .attr('x', (d: any) => (d.y1 + d.y0) / 2)
            .attr('y', (d: any) => d.x0 - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#ffffff')
            .text((_d: any, i: number) => {
                const nodeName = data.nodes[i]?.name;
                return nodeName ? formatNodeLabel(nodeName) : '';
            })
            .style('pointer-events', 'none');
    }, [
        data,
        effectiveRepeats,
        highlightNodeSet,
        width,
        height,
        onNodeClick,
        onLinkClick,
        onRepeatHover,
    ]);

    if (!data || !data.nodes || !data.links) return null;

    return (
        <div
            ref={containerRef}
            style={{
                width: typeof width === 'string' ? width : `${width}px`,
                height: `${height}px`,
                position: 'relative',
            }}
        >
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};
