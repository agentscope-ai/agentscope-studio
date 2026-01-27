import D3SankeyChart, { SankeyNodeData, SankeyLinkData } from './sankey-implementations/D3SankeyChart';
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

interface LayerLabel {
    label: string;
    layer: number;
}

const buildSankeyData = (
    task: EvalTask,
    selectedMetric: string | null,
    metricMeta?: MetricMeta,
) => {
    const nodeMap = new Map<string, SankeyNodeData>();
    const links: SankeyLinkData[] = [];
    const layerLabels: LayerLabel[] = [];

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

    // Add repeat nodes
    repeats.forEach(([id]) => {
        const nodeId = `repeat:${id}`;
        const color = repeatColors.get(id) || REPEAT_COLORS[0];
        nodeMap.set(nodeId, {
            id: nodeId,
            label: `Repeat ${id}`,
            color,
            layer: 0,
        });
    });

    // Add step nodes
    toolsByStep.forEach((names, step) => {
        names.forEach((n) => {
            const nodeId = `step${step}:${n}`;
            const color = toolColors.get(n) || TOOL_COLORS[0];
            nodeMap.set(nodeId, {
                id: nodeId,
                label: n,
                color,
                layer: step + 1,
            });
        });
    });

    // Collect all unique metric results for the last layer based on selected metric
    const metricResults = new Set<string>();
    repeats.forEach(([, data]) => {
        if (data.result && selectedMetric && data.result[selectedMetric]) {
            const metricValue = data.result[selectedMetric].result;
            metricResults.add(String(metricValue));
        } else if (data.result && !selectedMetric) {
            const firstMetric = Object.values(data.result)[0];
            if (firstMetric) {
                metricResults.add(String(firstMetric.result));
            }
        } else {
            metricResults.add('N/A');
        }
    });

    // Assign colors to metric results based on metric type
    const metricColors = new Map<string, string>();
    const isNumerical = metricMeta?.metric_type === 'numerical';
    const sortedResults = Array.from(metricResults).sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        if (isNumerical) {
            return parseFloat(a) - parseFloat(b);
        }
        if (metricMeta?.categories) {
            const idxA = metricMeta.categories.indexOf(a);
            const idxB = metricMeta.categories.indexOf(b);
            return idxA - idxB;
        }
        return a.localeCompare(b);
    });

    sortedResults.forEach((result, i) => {
        if (result === 'N/A') {
            metricColors.set(result, '#999');
        } else if (isNumerical) {
            const numValue = parseFloat(result);
            if (!isNaN(numValue)) {
                if (numValue === 0 || numValue === 1) {
                    metricColors.set(
                        result,
                        numValue === 1 ? STATUS_COLORS.success : STATUS_COLORS.failed,
                    );
                } else {
                    const ratio = i / Math.max(sortedResults.length - 1, 1);
                    const r = Math.round(200 - ratio * 120);
                    const g = Math.round(80 + ratio * 100);
                    metricColors.set(result, `rgb(${r}, ${g}, 80)`);
                }
            } else {
                metricColors.set(result, TOOL_COLORS[i % TOOL_COLORS.length]);
            }
        } else {
            if (result === 'true' || result === '1' || result.toLowerCase() === 'success') {
                metricColors.set(result, STATUS_COLORS.success);
            } else if (result === 'false' || result === '0' || result.toLowerCase() === 'failed') {
                metricColors.set(result, STATUS_COLORS.failed);
            } else {
                metricColors.set(result, TOOL_COLORS[i % TOOL_COLORS.length]);
            }
        }
    });

    // Add metric nodes
    const metricLayer = maxSteps + 1;
    metricResults.forEach((result) => {
        const nodeId = `metric:${result}`;
        const color = metricColors.get(result) || '#8c8c8c';
        nodeMap.set(nodeId, {
            id: nodeId,
            label: result,
            color,
            layer: metricLayer,
        });
    });

    // Build layer labels
    layerLabels.push({ label: 'Repeats', layer: 0 });
    for (let i = 0; i < maxSteps; i++) {
        layerLabels.push({ label: `Step ${i}`, layer: i + 1 });
    }
    layerLabels.push({ label: selectedMetric || 'Metrics', layer: metricLayer });

    // Build links
    repeats.forEach(([repeatId, data]) => {
        const tools = extractToolUseBlocks(data.solution?.trajectory || []);
        const repeatColor = repeatColors.get(repeatId) || REPEAT_COLORS[0];

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

        if (tools.length === 0) {
            links.push({
                source: repeatNode,
                target: metricNode,
                value: 1,
                repeatId,
                color: repeatColor,
            });
        } else {
            // First link: repeat -> first tool
            links.push({
                source: repeatNode,
                target: `step0:${tools[0].name}`,
                value: 1,
                repeatId,
                color: repeatColor,
            });

            // Middle links: tool -> tool
            for (let i = 0; i < tools.length - 1; i++) {
                const sourceNode = `step${i}:${tools[i].name}`;
                const targetNode = `step${i + 1}:${tools[i + 1].name}`;
                const sourceColor = toolColors.get(tools[i].name) || TOOL_COLORS[0];
                links.push({
                    source: sourceNode,
                    target: targetNode,
                    value: 1,
                    repeatId,
                    color: sourceColor,
                });
            }

            // Last link: last tool -> metric
            const lastToolNode = `step${tools.length - 1}:${tools[tools.length - 1].name}`;
            const lastToolColor = toolColors.get(tools[tools.length - 1].name) || TOOL_COLORS[0];
            links.push({
                source: lastToolNode,
                target: metricNode,
                value: 1,
                repeatId,
                color: lastToolColor,
            });
        }
    });

    // Convert nodeMap to array and sort by layer, then by id for consistent ordering
    const nodes = Array.from(nodeMap.values()).sort((a, b) => {
        if ((a.layer ?? 0) !== (b.layer ?? 0)) {
            return (a.layer ?? 0) - (b.layer ?? 0);
        }
        // Within same layer, sort by repeat ID if applicable
        if (a.id.startsWith('repeat:') && b.id.startsWith('repeat:')) {
            const aId = parseInt(a.id.split(':')[1], 10);
            const bId = parseInt(b.id.split(':')[1], 10);
            return aId - bId;
        }
        return a.id.localeCompare(b.id);
    });

    return {
        nodes,
        links,
        maxSteps,
        layerLabels,
    };
};

const ChartPage: React.FC = () => {
    const { task } = useEvaluationTaskContext();
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

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

    const { nodes, links, maxSteps, layerLabels } = useMemo(
        () => buildSankeyData(task, selectedMetric, selectedMetricMeta),
        [task, selectedMetric, selectedMetricMeta],
    );

    const chartHeight = Math.max(400, (maxSteps + 3) * 80);

    // Observe container size
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    setDimensions({ width, height: chartHeight });
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [chartHeight]);

    // Handle node click
    const handleNodeClick = useCallback((node: SankeyNodeData) => {
        console.log('Node clicked:', node);
    }, []);

    // Handle link click
    const handleLinkClick = useCallback((link: SankeyLinkData) => {
        console.log('Link clicked:', link);
    }, []);

    if (nodes.length === 0) {
        return (
            <div className="col-span-full rounded-xl border shadow">
                <div className="p-6 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                        {t('common.trajectory')} Workflow
                    </h3>
                </div>
                <div className="p-6 pt-2 text-center text-muted-foreground">
                    {t('hint.empty-trace')}
                </div>
            </div>
        );
    }

    return (
        <div className="col-span-full rounded-xl border shadow">
            <div className="p-6 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                    {t('common.trajectory')} Workflow
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
                <div
                    ref={containerRef}
                    className="flex"
                    style={{ height: `${chartHeight}px` }}
                >
                    {/* Left side layer labels */}
                    <div className="relative w-16 flex-shrink-0">
                        {layerLabels.map((item, idx) => (
                            <div
                                key={idx}
                                className="absolute text-xs text-muted-foreground whitespace-nowrap"
                                style={{
                                    top: 40 + item.layer * ((chartHeight - 80) / (maxSteps + 1)),
                                    left: 0,
                                    transform: 'translateY(-50%)',
                                }}
                            >
                                {item.label !== 'Repeats' ? item.label : ''}
                            </div>
                        ))}
                    </div>
                    {/* D3 Sankey Chart */}
                    <div className="flex-1">
                        <D3SankeyChart
                            nodes={nodes}
                            links={links}
                            width={dimensions.width - 64}
                            height={chartHeight}
                            nodeWidth={20}
                            nodePadding={15}
                            linkWidth={10}
                            onNodeClick={handleNodeClick}
                            onLinkClick={handleLinkClick}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ChartPage);
