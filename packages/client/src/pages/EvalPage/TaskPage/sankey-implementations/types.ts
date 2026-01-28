// 纯数据结构，不涉及具体格式
export interface SankeyNode {
    name: string;     // 节点唯一标识
    color: string;    // 节点颜色
    layer?: number;   // 节点所在层级（可选）
}

export interface SankeyLink {
    source: string;   // 源节点名称
    target: string;   // 目标节点名称
    value: number;    // 连线值
    repeatId?: string; // 所属 repeat ID
    color: string;    // 连线颜色
}

export interface SankeyChartProps {
    data: { nodes: SankeyNode[]; links: SankeyLink[] };
    width?: number | string;
    height?: number;
    selectedRepeats?: string[];
    repeatNodeNames?: Map<string, Set<string>>;
    hoveredRepeat?: string | null;
    onNodeClick?: (nodeName: string) => void;
    onLinkClick?: (linkRepeatId: string) => void;
    onRepeatHover?: (repeatId: string | null) => void;
    layerSpacing?: number;  // Vertical spacing between nodes (only for D3Advanced)
    linkWidth?: number;     // Link width (only for D3Advanced)
}

export type ChartLibrary = 'echarts' | 'reactecharts' | 'plotly' | 'd3' | 'd3sankey';
