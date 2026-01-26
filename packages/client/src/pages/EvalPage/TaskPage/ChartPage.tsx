import EChartsWrapper from '@/components/charts/EChartsWrapper';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
import { useEvaluationTaskContext } from '@/context/EvaluationTaskContext';
import { BlockType, ToolUseBlock } from '@shared/types';
import { EvalTask, EvalTrajectory } from '@shared/types/evaluation.ts';
import type { EChartsOption } from 'echarts';
import { SankeyChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import type { ECharts } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

echarts.use([TooltipComponent, SankeyChart, CanvasRenderer]);

interface SankeyNode {
    name: string;
    itemStyle?: { color: string };
}

interface SankeyLink {
    source: string;
    target: string;
    value: number;
    repeatId?: string;
    lineStyle?: { color: string; opacity: number };
}

// Clear colors for repeats - distinct and readable
const REPEAT_COLORS = [
    '#4a90c2',
    '#5cb85c',
    '#e6a23c',
    '#dc6b6b',
    '#36b3cc',
    '#3d9970',
    '#e67e45',
    '#8b5cb8',
    '#cc5588',
    '#20a0b0',
];

// Clear colors for tools - distinct and readable
const TOOL_COLORS = [
    '#7b4bc2',
    '#20a8a8',
    '#b84592',
    '#cc9933',
    '#4060c0',
    '#45a045',
    '#cc5830',
    '#3388cc',
    '#80b030',
    '#b85050',
];

// Clear status colors
const STATUS_COLORS = { success: '#52b352', failed: '#cc5252' };

const extractToolUseBlocks = (trajectory: EvalTrajectory): ToolUseBlock[] =>
    trajectory.filter((b): b is ToolUseBlock => b.type === BlockType.TOOL_USE);

interface MetricMeta {
    name: string;
    metric_type: 'numerical' | 'category';
    description: string;
    categories?: string[];
}

const buildSankeyData = (
    task: EvalTask,
    selectedMetric: string | null,
    metricMeta?: MetricMeta,
) => {
    const nodeSet = new Set<string>();
    const links: SankeyLink[] = [];
    const repeatLinkIndices = new Map<string, number[]>();

    const repeats = Object.entries(task.repeats);
    let maxSteps = 0;

    const repeatColors = new Map<string, string>();
    repeats.forEach(([id], i) =>
        repeatColors.set(id, REPEAT_COLORS[i % REPEAT_COLORS.length]),
    );

    const toolsByStep = new Map<number, Set<string>>();
    const allToolNames = new Set<string>();

    repeats.forEach(([, data]) => {
        const tools = extractToolUseBlocks(data.solution?.trajectory || []);
        maxSteps = Math.max(maxSteps, tools.length);
        tools.forEach((t, i) => {
            if (!toolsByStep.has(i)) toolsByStep.set(i, new Set());
            toolsByStep.get(i)!.add(t.name);
            allToolNames.add(t.name);
        });
    });

    const toolColors = new Map<string, string>();
    Array.from(allToolNames).forEach((n, i) =>
        toolColors.set(n, TOOL_COLORS[i % TOOL_COLORS.length]),
    );

    repeats.forEach(([id]) => nodeSet.add(`repeat:${id}`));
    toolsByStep.forEach((names, step) =>
        names.forEach((n) => nodeSet.add(`step${step}:${n}`)),
    );

    // Collect all unique metric results for the last layer based on selected metric
    const metricResults = new Set<string>();
    repeats.forEach(([, data]) => {
        if (data.result && selectedMetric && data.result[selectedMetric]) {
            // Get selected metric result value
            const metricValue = data.result[selectedMetric].result;
            metricResults.add(String(metricValue));
        } else if (data.result && !selectedMetric) {
            // Fallback to first metric if none selected
            const firstMetric = Object.values(data.result)[0];
            if (firstMetric) {
                metricResults.add(String(firstMetric.result));
            }
        } else {
            metricResults.add('N/A');
        }
    });
    metricResults.forEach((result) => nodeSet.add(`metric:${result}`));

    // Get link color from source node
    const getSourceNodeColor = (source: string): string => {
        if (source.startsWith('repeat:')) {
            return repeatColors.get(source.split(':')[1]) || REPEAT_COLORS[0];
        } else if (source.startsWith('step')) {
            return toolColors.get(source.split(':')[1]) || TOOL_COLORS[0];
        } else if (source.startsWith('metric:')) {
            return '#8c8c8c';
        }
        return '#8c8c8c';
    };

    // Map from link index to repeatId for link hover support
    const linkIndexToRepeat = new Map<number, string>();
    // Map from repeatId to node names in that repeat's path
    const repeatNodeNames = new Map<string, Set<string>>();
    // Map from node name to repeatIds that pass through it (for node hover)
    const nodeToRepeats = new Map<string, string[]>();

    repeats.forEach(([repeatId, data]) => {
        const tools = extractToolUseBlocks(data.solution?.trajectory || []);

        // Get metric result for this repeat based on selected metric
        let metricResult = 'N/A';
        if (data.result && selectedMetric && data.result[selectedMetric]) {
            metricResult = String(data.result[selectedMetric].result);
        } else if (data.result && !selectedMetric) {
            const firstMetric = Object.values(data.result)[0];
            if (firstMetric) {
                metricResult = String(firstMetric.result);
            }
        }
        const metricNode = `metric:${metricResult}`;

        const repeatNode = `repeat:${repeatId}`;
        const indices: number[] = [];
        const pathNodes = new Set<string>();

        pathNodes.add(repeatNode);

        const addLink = (source: string, target: string) => {
            const idx = links.length;
            indices.push(idx);
            linkIndexToRepeat.set(idx, repeatId);
            pathNodes.add(target);
            const color = getSourceNodeColor(source);
            links.push({
                source,
                target,
                value: 1,
                repeatId,
                lineStyle: { color, opacity: 0.5 },
            });
        };

        if (tools.length === 0) {
            addLink(repeatNode, metricNode);
        } else {
            addLink(repeatNode, `step0:${tools[0].name}`);
            for (let i = 0; i < tools.length - 1; i++) {
                addLink(
                    `step${i}:${tools[i].name}`,
                    `step${i + 1}:${tools[i + 1].name}`,
                );
            }
            addLink(
                `step${tools.length - 1}:${tools[tools.length - 1].name}`,
                metricNode,
            );
        }

        repeatLinkIndices.set(repeatId, indices);
        repeatNodeNames.set(repeatId, pathNodes);

        // Add to nodeToRepeats mapping
        pathNodes.forEach((nodeName) => {
            if (!nodeToRepeats.has(nodeName)) {
                nodeToRepeats.set(nodeName, []);
            }
            nodeToRepeats.get(nodeName)!.push(repeatId);
        });
    });

    // Assign colors to metric results based on metric type
    const metricColors = new Map<string, string>();
    const isNumerical = metricMeta?.metric_type === 'numerical';
    const sortedResults = Array.from(metricResults).sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        // For numerical, sort by value
        if (isNumerical) {
            return parseFloat(a) - parseFloat(b);
        }
        // For categorical, use category order if available
        if (metricMeta?.categories) {
            const idxA = metricMeta.categories.indexOf(a);
            const idxB = metricMeta.categories.indexOf(b);
            return idxA - idxB;
        }
        return a.localeCompare(b);
    });

    sortedResults.forEach((result, i) => {
        // Use gray for N/A
        if (result === 'N/A') {
            metricColors.set(result, '#999');
        } else if (isNumerical) {
            // For numerical metrics, use a gradient from red to green
            const numValue = parseFloat(result);
            if (!isNaN(numValue)) {
                // For binary 0/1 metrics
                if (numValue === 0 || numValue === 1) {
                    metricColors.set(
                        result,
                        numValue === 1
                            ? STATUS_COLORS.success
                            : STATUS_COLORS.failed,
                    );
                } else {
                    // Use position-based coloring for other numerical values
                    const ratio = i / Math.max(sortedResults.length - 1, 1);
                    const r = Math.round(200 - ratio * 120);
                    const g = Math.round(80 + ratio * 100);
                    metricColors.set(result, `rgb(${r}, ${g}, 80)`);
                }
            } else {
                metricColors.set(result, TOOL_COLORS[i % TOOL_COLORS.length]);
            }
        } else {
            // For categorical metrics
            if (
                result === 'true' ||
                result === '1' ||
                result.toLowerCase() === 'success'
            ) {
                metricColors.set(result, STATUS_COLORS.success);
            } else if (
                result === 'false' ||
                result === '0' ||
                result.toLowerCase() === 'failed'
            ) {
                metricColors.set(result, STATUS_COLORS.failed);
            } else {
                // Use distinct colors for different categories
                metricColors.set(result, TOOL_COLORS[i % TOOL_COLORS.length]);
            }
        }
    });

    const nodes: SankeyNode[] = Array.from(nodeSet).map((name) => {
        let color = '#8c8c8c';
        if (name.startsWith('repeat:')) {
            color = repeatColors.get(name.split(':')[1]) || REPEAT_COLORS[0];
        } else if (name.startsWith('step')) {
            color = toolColors.get(name.split(':')[1]) || TOOL_COLORS[0];
        } else if (name.startsWith('metric:')) {
            const metricValue = name.split(':')[1] || '';
            color = metricColors.get(metricValue) || '#8c8c8c';
        }
        return { name, itemStyle: { color } };
    });

    return {
        nodes,
        links,
        maxSteps,
        repeatColors,
        toolColors,
        repeatLinkIndices,
        linkIndexToRepeat,
        repeatNodeNames,
        nodeToRepeats,
    };
};

const ChartPage: React.FC = () => {
    const { task } = useEvaluationTaskContext();
    const { t } = useTranslation();
    const chartRef = useRef<ECharts | null>(null);
    const highlightedRef = useRef<string | null>(null);
    const [layerPositions, setLayerPositions] = useState<
        Array<{ label: string; top: number }>
    >([]);

    // Get available metrics from task meta
    const availableMetrics = useMemo(() => {
        return task.meta.metrics || [];
    }, [task.meta.metrics]);

    // Selected metric state
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

    // Initialize selected metric when available metrics change
    useEffect(() => {
        if (availableMetrics.length > 0 && !selectedMetric) {
            setSelectedMetric(availableMetrics[0].name);
        }
    }, [availableMetrics, selectedMetric]);

    // Get selected metric metadata
    const selectedMetricMeta = useMemo(() => {
        return availableMetrics.find((m) => m.name === selectedMetric);
    }, [availableMetrics, selectedMetric]);

    const {
        nodes,
        links,
        maxSteps,
        linkIndexToRepeat,
        repeatNodeNames,
        nodeToRepeats,
    } = useMemo(
        () => buildSankeyData(task, selectedMetric, selectedMetricMeta),
        [task, selectedMetric, selectedMetricMeta],
    );

    const updateHighlight = useCallback(
        (chart: ECharts, highlightRepeatId: string | null) => {
            const highlightNodeSet = highlightRepeatId
                ? repeatNodeNames.get(highlightRepeatId) || new Set<string>()
                : null;

            // Update links opacity - highlight all links between nodes in the path
            const updatedLinks = links.map((link) => {
                const isHighlighted = highlightNodeSet
                    ? highlightNodeSet.has(link.source) &&
                      highlightNodeSet.has(link.target)
                    : false;
                return {
                    ...link,
                    lineStyle: {
                        color: link.lineStyle?.color || '#999',
                        opacity: highlightNodeSet
                            ? isHighlighted
                                ? 0.5
                                : 0.1
                            : 0.5,
                    },
                };
            });

            // Update nodes opacity
            const updatedNodes = nodes.map((node) => ({
                ...node,
                itemStyle: {
                    ...node.itemStyle,
                    opacity: highlightNodeSet
                        ? highlightNodeSet.has(node.name)
                            ? 1
                            : 0.2
                        : 1,
                },
            }));

            chart.setOption(
                { series: [{ data: updatedNodes, links: updatedLinks }] },
                false,
            );
        },
        [links, nodes, repeatNodeNames],
    );

    const handleChartReady = useCallback(
        (chart: ECharts) => {
            chartRef.current = chart;

            // Get node positions from chart to align left labels
            setTimeout(() => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const model = (chart as any).getModel();
                    const series = model.getSeriesByIndex(0);
                    if (!series) return;

                    const data = series.getData();
                    const positions = new Map<
                        number,
                        { label: string; y: number }
                    >();

                    // Find one representative node per layer
                    for (let i = 0; i < data.count(); i++) {
                        const layout = data.getItemLayout(i);
                        const name = data.getName(i) as string;
                        if (!layout || !name) continue;

                        let layer = -1;
                        let label = '';
                        if (name.startsWith('repeat:')) {
                            layer = 0;
                            label = '';
                        } else if (name.startsWith('step')) {
                            const stepMatch = name.match(/^step(\d+):/);
                            if (stepMatch) {
                                layer = parseInt(stepMatch[1], 10) + 1;
                                label = `Step ${stepMatch[1]}`;
                            }
                        } else if (name.startsWith('metric:')) {
                            layer = maxSteps + 1;
                            label = selectedMetric || 'Metrics';
                        }

                        if (layer >= 0 && !positions.has(layer)) {
                            positions.set(layer, { label, y: layout.y });
                        }
                    }

                    // Ensure Metrics layer exists at the end
                    const metricsLayer = maxSteps + 1;
                    if (!positions.has(metricsLayer) && positions.size > 0) {
                        // Estimate position based on existing layers
                        const existingLayers = Array.from(positions.values());
                        const lastY =
                            existingLayers.length > 0
                                ? Math.max(...existingLayers.map((p) => p.y))
                                : 0;
                        const avgGap =
                            existingLayers.length > 1
                                ? (lastY - existingLayers[0].y) /
                                  (existingLayers.length - 1)
                                : 80;
                        positions.set(metricsLayer, {
                            label: selectedMetric || 'Metrics',
                            y: lastY + avgGap,
                        });
                    }

                    // Convert to array sorted by layer
                    const sorted = Array.from(positions.entries())
                        .sort((a, b) => a[0] - b[0])
                        .map(([, v]) => ({ label: v.label, top: v.y }));

                    setLayerPositions(sorted);
                } catch {
                    // Ignore errors
                }
            }, 100);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chart.on('mouseover', (params: any) => {
                let repeatId: string | undefined;

                // Handle repeat node hover - check if node name starts with 'repeat:'
                if (
                    params.dataType === 'node' &&
                    params.name?.startsWith('repeat:')
                ) {
                    repeatId = params.name.split(':')[1];
                }
                // Handle tool/metric node hover - find first repeat that passes through this node
                else if (params.dataType === 'node' && params.name) {
                    const repeats = nodeToRepeats.get(params.name);
                    if (repeats && repeats.length > 0) {
                        repeatId = repeats[0];
                    }
                }
                // Handle link hover - use dataIndex or find by source/target
                else if (params.dataType === 'edge') {
                    if (params.dataIndex !== undefined) {
                        repeatId = linkIndexToRepeat.get(params.dataIndex);
                    }
                    // Fallback: find link by source node
                    if (!repeatId && params.data?.source) {
                        const sourceRepeats = nodeToRepeats.get(
                            params.data.source,
                        );
                        if (sourceRepeats && sourceRepeats.length > 0) {
                            repeatId = sourceRepeats[0];
                        }
                    }
                    // Another fallback: use repeatId from link data
                    if (!repeatId && params.data?.repeatId) {
                        repeatId = params.data.repeatId;
                    }
                }

                if (!repeatId || repeatId === highlightedRef.current) return;

                highlightedRef.current = repeatId;
                updateHighlight(chart, repeatId);
            });

            chart.on('mouseout', () => {
                // Reset highlight on any mouseout
                if (highlightedRef.current !== null) {
                    highlightedRef.current = null;
                    updateHighlight(chart, null);
                }
            });
        },
        [
            updateHighlight,
            linkIndexToRepeat,
            nodeToRepeats,
            maxSteps,
            selectedMetric,
        ],
    );

    const chartHeight = Math.max(400, (maxSteps + 3) * 80);

    const option: EChartsOption = useMemo(
        () => ({
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (params: any) => {
                    // For links, show repeat info
                    if (params.dataType === 'edge' && params.data?.repeatId) {
                        return `Repeat ${params.data.repeatId}`;
                    }
                    // For nodes, show name
                    if (params.name) {
                        const parts = params.name.split(':');
                        return parts[1] || params.name;
                    }
                    return '';
                },
            },
            animation: false,
            series: [
                {
                    type: 'sankey',
                    top: 40,
                    bottom: 40,
                    left: '2%',
                    right: '5%',
                    data: nodes,
                    links: links,
                    orient: 'vertical',
                    nodeAlign: 'justify',
                    nodeWidth: 20,
                    nodeGap: 15,
                    label: {
                        position: 'top',
                        fontSize: 11,
                        formatter: (p: { name?: string }) =>
                            p.name?.includes(':')
                                ? p.name.split(':')[1] || p.name
                                : p.name || '',
                    },
                    lineStyle: { curveness: 0.6 },
                    emphasis: { focus: 'none' },
                },
            ],
        }),
        [nodes, links],
    );

    if (nodes.length === 0) {
        return (
            <div className="col-span-full rounded-xl border shadow">
                <div className="p-6 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                        {t('common.trajectory')} Workflow
                    </h3>
                </div>
                <div className="p-6 pt-2 text-center text-muted-foreground">
                    {t('hint.empty-data')}
                </div>
            </div>
        );
    }

    return (
        <div className="col-span-full rounded-xl border shadow">
            <div className="p-6 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                    {t('common.trajectory')}
                </h3>
                {availableMetrics.length > 1 && (
                    <Select
                        value={selectedMetric || undefined}
                        onValueChange={setSelectedMetric}
                    >
                        <SelectTrigger size="sm" className="w-48">
                            <SelectValue
                                placeholder={t('placeholder.select-metric')}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMetrics.map((metric) => (
                                <SelectItem
                                    key={metric.name}
                                    value={metric.name}
                                >
                                    {metric.name}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        ({metric.metric_type})
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div className="p-6 pt-2">
                <div className="flex" style={{ height: `${chartHeight}px` }}>
                    {/* Left side step labels - aligned with node centers */}
                    <div className="relative w-16 flex-shrink-0">
                        {layerPositions.map((pos, idx) => (
                            <div
                                key={idx}
                                className="absolute text-xs text-muted-foreground whitespace-nowrap"
                                style={{
                                    top: pos.top,
                                    left: 0,
                                    transform: 'translateY(-50%)', // Center vertically with node
                                }}
                            >
                                {pos.label}
                            </div>
                        ))}
                    </div>
                    {/* Chart */}
                    <div className="flex-1">
                        <EChartsWrapper
                            option={option}
                            style={{ width: '100%', height: '100%' }}
                            onChartReady={handleChartReady}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ChartPage);
