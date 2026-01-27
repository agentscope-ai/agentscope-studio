export interface SankeyNode {
    name: string;
    itemStyle?: { color: string; opacity?: number };
}

export interface SankeyLink {
    source: string;
    target: string;
    value: number;
    repeatId?: string;
    lineStyle?: { color: string; opacity: number };
}

export interface SankeyChartProps {
    data: { nodes: SankeyNode[]; links: SankeyLink[] };
    width?: number | string;
    height?: number;
    selectedRepeats?: string[];
    repeatNodeNames?: Map<string, Set<string>>;
    hoveredRepeat?: string | null;
    onNodeClick?: (nodeName: string) => void;
    onRepeatHover?: (repeatId: string | null) => void;
}

export type ChartLibrary = 'echarts' | 'plotly' | 'd3' | 'google' | 'd3sankey';
