import * as d3 from 'd3';
import { sankey } from 'd3-sankey';
import { useEffect, useMemo, useRef } from 'react';
import { SankeyChartProps } from './types';
import {
    calculateHighlightNodeSet,
    formatNodeLabel,
    getNodeColors,
} from './utils';

export const D3Sankey: React.FC<SankeyChartProps> = ({
    data,
    width = '100%',
    height,
    selectedRepeats = [],
    repeatNodeNames,
    hoveredRepeat,
    onNodeClick,
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
        const chartHeight = height || Math.max(600, data.nodes.length * 80 + 200);
        const margin = { top: 40, right: 150, bottom: 40, left: 150 };

        if (typeof width === 'string' && (!containerWidth || containerWidth <= 0)) {
            return;
        }

        const chartWidth = containerWidth;
        const chartHeightTotal = chartHeight;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const chartWidthInner = chartWidth - margin.left - margin.right;
        const chartHeightInner = chartHeightTotal - margin.top - margin.bottom;

        const g = svg
            .attr('width', chartWidth)
            .attr('height', chartHeightTotal)
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
                    value: link.value * 0.25,
                    repeatId: link.repeatId,
                    color: link.lineStyle?.color || '#94a3b8',
                };
            })
            .filter((link): link is NonNullable<typeof link> => link !== null);

        const sankeyGenerator = sankey()
            .nodeWidth(4)
            .nodePadding(80)
            .extent([
                [0, 0],
                [chartHeightInner, chartWidthInner],
            ]);

        const sankeyData = sankeyGenerator({
            nodes: sankeyNodes.map((d) => ({ ...d })),
            links: sankeyLinks.map((d) => ({ ...d })),
        });

        const nodeColors = getNodeColors(data.nodes, highlightNodeSet);

        g.append('g')
            .selectAll('rect')
            .data(sankeyData.nodes)
            .join('rect')
            .attr('x', (d: any) => d.y0)
            .attr('y', (d: any) => d.x0)
            .attr('height', (d: any) => d.x1 - d.x0)
            .attr('width', (d: any) => d.y1 - d.y0)
            .attr('fill', (_d: any, i: number) => {
                const nodeName = data.nodes[i]?.name;
                if (!nodeName) return '#3b82f6';
                const color = nodeColors[i] || '#3b82f6';
                const isHighlighted = highlightNodeSet && highlightNodeSet.has(nodeName);
                const opacity = isHighlighted ? 1 : highlightNodeSet ? 0.3 : 1;

                if (color.startsWith('rgba')) {
                    return color.replace(
                        /rgba\(([\d\s,]+),\s*[\d.]+\)/,
                        `rgba($1, ${opacity})`,
                    );
                } else if (color.startsWith('#')) {
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                }
                return color;
            })
            .attr('stroke', 'transparent')
            .attr('stroke-width', 0)
            .style('cursor', 'pointer')
            .on('click', function (_event: any, d: any) {
                const nodeIndex = (d as any).index;
                const nodeName = data.nodes[nodeIndex]?.name;
                if (onNodeClick && nodeName && nodeName.startsWith('repeat:')) {
                    const repeatId = nodeName.split(':')[1];
                    onNodeClick(repeatId);
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

        const sankeyLinkVertical = () => {
            return (d: any) => {
                const sourceX = d.source.y0 + (d.source.y1 - d.source.y0) / 2;
                const sourceY = d.source.x1;
                const targetX = d.target.y0 + (d.target.y1 - d.target.y0) / 2;
                const targetY = d.target.x0;

                const curvature = 0.5;
                const dy = targetY - sourceY;
                const controlY1 = sourceY + dy * curvature;
                const controlY2 = targetY - dy * curvature;

                return `M${sourceX},${sourceY}C${sourceX},${controlY1} ${targetX},${controlY2} ${targetX},${targetY}`;
            };
        };

        g.append('g')
            .attr('fill', 'none')
            .selectAll('path')
            .data(sankeyData.links)
            .join('path')
            .attr('d', sankeyLinkVertical() as any)
            .attr('stroke', (d: any) => {
                const linkIndex = sankeyLinks.findIndex(
                    (l) => l.source === d.source.index && l.target === d.target.index,
                );
                return linkIndex >= 0 ? sankeyLinks[linkIndex].color : '#94a3b8';
            })
            .attr('stroke-width', (d: any) => Math.max(0.5, d.width || 0.5))
            .attr('opacity', (d: any) => {
                const linkIndex = sankeyLinks.findIndex(
                    (l) => l.source === d.source.index && l.target === d.target.index,
                );
                if (linkIndex < 0) return 0.5;
                const linkData = sankeyLinks[linkIndex];
                if (!effectiveRepeats.length) return 0.5;
                return linkData.repeatId && effectiveRepeats.includes(linkData.repeatId)
                    ? 0.8
                    : 0.2;
            })
            .style('cursor', 'pointer')
            .on('mouseover', function (_event: any, d: any) {
                if (onRepeatHover) {
                    const linkIndex = sankeyLinks.findIndex(
                        (l) => l.source === d.source.index && l.target === d.target.index,
                    );
                    if (linkIndex >= 0) {
                        const linkData = sankeyLinks[linkIndex];
                        if (linkData.repeatId) {
                            onRepeatHover(linkData.repeatId);
                        }
                    }
                }
            })
            .on('mouseout', function () {
                if (onRepeatHover) {
                    onRepeatHover(null);
                }
            });

        g.append('g')
            .selectAll('text')
            .data(sankeyData.nodes)
            .join('text')
            .attr('x', (d: any) => (d.y1 + d.y0) / 2)
            .attr('y', (d: any) => d.x0 - 5)
            .attr('dy', '0')
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-family', 'system-ui, -apple-system, sans-serif')
            .attr('font-weight', 'normal')
            .attr('fill', '#ffffff')
            .text((_d: any, i: number) => {
                const nodeName = data.nodes[i]?.name;
                if (!nodeName) return '';
                const label = formatNodeLabel(nodeName);
                const MAX_LABEL_LENGTH = 15;
                return label.length > MAX_LABEL_LENGTH
                    ? label.substring(0, MAX_LABEL_LENGTH) + '...'
                    : label;
            })
            .style('pointer-events', 'none');
    }, [
        data,
        effectiveRepeats,
        highlightNodeSet,
        width,
        height,
        onNodeClick,
        onRepeatHover,
    ]);

    if (!data || !data.nodes || !data.links) return null;

    const autoHeight = height || Math.max(600, data.nodes.length * 80 + 200);

    return (
        <div
            ref={containerRef}
            style={{
                width: typeof width === 'string' ? width : `${width}px`,
                height: `${autoHeight}px`,
                position: 'relative',
            }}
        >
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};
