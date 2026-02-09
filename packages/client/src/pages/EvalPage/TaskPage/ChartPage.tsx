import {
    PlotlySankey,
    SankeyNode,
    SankeyLink,
} from '@/components/charts/PlotlySankey';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvaluationTaskContext } from '@/context/EvaluationTaskContext';
import { BlockType, ToolUseBlock } from '@shared/types';
import { EvalTask, EvalTrajectory } from '@shared/types/evaluation.ts';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, XIcon } from 'lucide-react';

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

const extractToolUseBlocks = (trajectory: EvalTrajectory): ToolUseBlock[] =>
    trajectory.filter((b): b is ToolUseBlock => b.type === BlockType.TOOL_USE);

interface LayerLabel {
    label: string;
    layer: number;
}

const buildRepeatNodeNames = (
    links: SankeyLink[],
): Map<string, Set<string>> => {
    const repeatNodeNames = new Map<string, Set<string>>();

    links.forEach((link) => {
        if (link.repeatId) {
            if (!repeatNodeNames.has(link.repeatId)) {
                repeatNodeNames.set(link.repeatId, new Set());
            }
            repeatNodeNames.get(link.repeatId)!.add(link.source);
            repeatNodeNames.get(link.repeatId)!.add(link.target);
        }
    });

    return repeatNodeNames;
};

const getMetricResult = (
    data: EvalTask['repeats'][string],
    selectedMetric: string,
): string => {
    if (data.result && selectedMetric && data.result[selectedMetric]) {
        return String(data.result[selectedMetric].result);
    }
    if (data.result && !selectedMetric) {
        const firstMetric = Object.values(data.result)[0];
        if (firstMetric) return String(firstMetric.result);
    }
    return 'N/A';
};

const buildSankeyData = (task: EvalTask, selectedMetric: string) => {
    const nodeMap = new Map<string, SankeyNode>();
    const links: SankeyLink[] = [];
    const repeats = Object.entries(task.repeats);
    let maxSteps = 0;

    const formatLabel = (name: string): string => {
        if (name.startsWith('repeat:')) {
            return `Repeat ${name.split(':')[1]}`;
        }
        if (name.startsWith('step')) {
            const parts = name.split(':');
            return parts.length > 1 ? parts[1] : name;
        }
        if (name.startsWith('metric:')) {
            return name.split(':')[1];
        }
        return name;
    };

    const getOrCreateNode = (name: string, color: string): string => {
        if (!nodeMap.has(name)) {
            nodeMap.set(name, {
                name,
                label: formatLabel(name),
                color,
            });
        }
        return name;
    };

    const repeatColors = new Map<string, string>();
    repeats.forEach(([id], i) =>
        repeatColors.set(id, REPEAT_COLORS[i % REPEAT_COLORS.length]),
    );

    const toolColors = new Map<string, string>();
    let toolColorIndex = 0;

    const metricColors = new Map<string, string>();
    let metricColorIndex = 0;

    repeats.forEach(([repeatId, data]) => {
        const tools = extractToolUseBlocks(data.solution?.trajectory || []);
        maxSteps = Math.max(maxSteps, tools.length);

        const repeatColor = repeatColors.get(repeatId) || REPEAT_COLORS[0];
        const repeatNode = getOrCreateNode(`repeat:${repeatId}`, repeatColor);

        let previousNode = repeatNode;
        tools.forEach((tool, stepIndex) => {
            if (!toolColors.has(tool.name)) {
                toolColors.set(
                    tool.name,
                    TOOL_COLORS[toolColorIndex++ % TOOL_COLORS.length],
                );
            }

            const stepNode = getOrCreateNode(
                `step${stepIndex}:${tool.name}`,
                toolColors.get(tool.name)!,
            );

            links.push({
                source: previousNode,
                target: stepNode,
                value: 1,
                repeatId,
                color: repeatColor,
            });

            previousNode = stepNode;
        });

        const metricResult = getMetricResult(data, selectedMetric);
        if (!metricColors.has(metricResult)) {
            metricColors.set(metricResult, getMetricColor(metricColorIndex++));
        }

        const metricNode = getOrCreateNode(
            `metric:${metricResult}`,
            metricColors.get(metricResult)!,
        );

        links.push({
            source: previousNode,
            target: metricNode,
            value: 1,
            repeatId,
            color: repeatColor,
        });
    });

    const layerLabels: LayerLabel[] = [{ label: 'Repeats', layer: 0 }];
    for (let i = 0; i < maxSteps; i++) {
        layerLabels.push({ label: `Step ${i}`, layer: i + 1 });
    }
    layerLabels.push({
        label: selectedMetric || 'Metrics',
        layer: maxSteps + 1,
    });

    return {
        nodes: Array.from(nodeMap.values()),
        links,
        maxSteps,
        layerLabels,
        repeatIds: repeats.map(([id]) => id),
    };
};

const getMetricColor = (index: number): string => {
    return TOOL_COLORS[index % TOOL_COLORS.length];
};

const ChartPage: React.FC = () => {
    const { task } = useEvaluationTaskContext();
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

    const availableMetrics = useMemo(() => {
        return task.meta.metrics || [];
    }, [task.meta.metrics]);

    const [selectedMetric, setSelectedMetric] = useState<string>('');

    const [selectedRepeats, setSelectedRepeats] = useState<Set<string>>(
        new Set(),
    );

    const [hoveredRepeat, setHoveredRepeat] = useState<string | null>(null);

    const [scale, setScale] = useState<number>(1);

    useEffect(() => {
        if (availableMetrics.length > 0 && !selectedMetric) {
            setSelectedMetric(availableMetrics[0].name);
        }
    }, [availableMetrics, selectedMetric]);

    const { nodes, links, maxSteps, layerLabels, repeatIds } = useMemo(
        () => buildSankeyData(task, selectedMetric),
        [task, selectedMetric],
    );

    const repeatNodeNames = useMemo(() => buildRepeatNodeNames(links), [links]);

    const effectiveRepeats = useMemo(() => {
        const repeats = Array.from(selectedRepeats);
        if (hoveredRepeat && !repeats.includes(hoveredRepeat)) {
            repeats.push(hoveredRepeat);
        }
        return repeats;
    }, [selectedRepeats, hoveredRepeat]);

    const highlightedNodes = useMemo(() => {
        if (effectiveRepeats.length === 0) return null;

        const nodeSet = new Set<string>();
        effectiveRepeats.forEach((repeatId) => {
            const nodes = repeatNodeNames.get(repeatId);
            if (nodes) {
                nodes.forEach((nodeName) => nodeSet.add(nodeName));
            }
        });
        return nodeSet;
    }, [effectiveRepeats, repeatNodeNames]);

    const enhancedNodes = useMemo(() => {
        return nodes.map((node) => ({
            ...node,
            opacity: highlightedNodes
                ? highlightedNodes.has(node.name)
                    ? 1
                    : 0.3
                : 1,
        }));
    }, [nodes, highlightedNodes]);

    const enhancedLinks = useMemo(() => {
        return links.map((link) => {
            const isHighlighted =
                link.repeatId && effectiveRepeats.includes(link.repeatId);
            const opacity =
                effectiveRepeats.length === 0
                    ? 0.4
                    : isHighlighted
                        ? 0.6
                        : 0.15;

            return {
                ...link,
                opacity,
            };
        });
    }, [links, effectiveRepeats]);

    const sankeyData = useMemo(
        () => ({ nodes: enhancedNodes, links: enhancedLinks }),
        [enhancedNodes, enhancedLinks],
    );

    const baseHeight = 400;
    const chartHeight = Math.max(baseHeight, (maxSteps + 3) * 80 * scale);

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

    const handleRepeatToggle = useCallback((repeatId: string) => {
        setSelectedRepeats((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(repeatId)) {
                newSet.delete(repeatId);
            } else {
                newSet.add(repeatId);
            }
            return newSet;
        });
    }, []);

    const handleClick = useCallback(
        (type: 'node' | 'link', index: number) => {
            let repeatId: string | undefined;

            if (type === 'link') {
                const link = links[index];
                repeatId = link?.repeatId;
            } else if (type === 'node') {
            }

            if (repeatId) {
                handleRepeatToggle(repeatId);
            }
        },
        [links, handleRepeatToggle],
    );

    // Handle hover
    const handleHover = useCallback(
        (type: 'node' | 'link', index: number) => {
            let repeatId: string | undefined;

            if (type === 'link') {
                const link = links[index];
                repeatId = link?.repeatId;
            } else if (type === 'node') {
            }

            setHoveredRepeat(repeatId || null);
        },
        [links, repeatNodeNames],
    );

    // Handle unhover
    const handleUnhover = useCallback(() => {
        setHoveredRepeat(null);
    }, []);

    if (nodes.length === 0) {
        return (
            <div className="col-span-full rounded-xl border shadow">
                <div className="p-6 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                        {t('common.trajectory')}
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
            {/* Sticky control panel */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
                {/* Header row - Title and Controls */}
                <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4 border-b">
                    <h3 className="text-base font-semibold">
                        {t('common.trajectory')} Workflow
                    </h3>
                    <div className="flex items-center gap-4">
                        {/* Scale Control */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">
                                Scale:
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={scale}
                                onChange={(e) =>
                                    setScale(Number(e.target.value))
                                }
                                className="w-24"
                                title="Chart scale"
                            />
                            <span className="text-xs text-muted-foreground font-medium w-9 text-right">
                                {scale.toFixed(1)}x
                            </span>
                        </div>
                        {/* Metric Selector */}
                        {availableMetrics.length > 1 && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">
                                    Metric:
                                </label>
                                <Select
                                    value={selectedMetric}
                                    onValueChange={setSelectedMetric}
                                >
                                    <SelectTrigger size="sm" className="w-40">
                                        <SelectValue
                                            placeholder={t(
                                                'placeholder.select-metric',
                                            )}
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
                            </div>
                        )}

                        <label className="text-xs text-muted-foreground whitespace-nowrap">
                            Repeats:
                        </label>
                        {/* Dropdown trigger */}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                >
                                    <span>
                                        {selectedRepeats.size > 0
                                            ? `${selectedRepeats.size} selected`
                                            : 'Select repeats'}
                                    </span>
                                    <ChevronDownIcon className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="max-h-[300px] overflow-y-auto"
                                onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                                {repeatIds.map((repeatId, index) => {
                                    const isChecked =
                                        selectedRepeats.has(repeatId);
                                    const color =
                                        REPEAT_COLORS[
                                        index % REPEAT_COLORS.length
                                        ];
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={repeatId}
                                            checked={isChecked}
                                            onCheckedChange={() =>
                                                handleRepeatToggle(repeatId)
                                            }
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            <span
                                                className="font-medium"
                                                style={{ color: color }}
                                            >
                                                Repeat {repeatId}
                                            </span>
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
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
                                    top:
                                        40 +
                                        item.layer *
                                        ((chartHeight - 80) /
                                            (maxSteps + 1)),
                                    left: 0,
                                    transform: 'translateY(-50%)',
                                }}
                            >
                                {item.label !== 'Repeats' ? item.label : ''}
                            </div>
                        ))}
                    </div>
                    {/* Chart rendering using PlotlySankey */}
                    <div className="flex-1">
                        <PlotlySankey
                            data={sankeyData}
                            width={dimensions.width - 64}
                            height={chartHeight}
                            onClick={handleClick}
                            onHover={handleHover}
                            onUnhover={handleUnhover}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ChartPage);
