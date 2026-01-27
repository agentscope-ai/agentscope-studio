import { SankeyNode, SankeyLink } from './types';

// Material Design Color Palette - 用于美观的配色
export const MATERIAL_COLORS = [
    '#4a90c2', // Blue
    '#5cb85c', // Green
    '#e6a23c', // Orange
    '#dc6b6b', // Red
    '#36b3cc', // Cyan
    '#3d9970', // Teal
    '#e67e45', // Deep Orange
    '#8b5cb8', // Purple
    '#cc5588', // Pink
    '#20a0b0', // Turquoise
];

/**
 * 格式化节点标签，去除前缀
 */
export function formatNodeLabel(name: string): string {
    if (name.startsWith('repeat:')) {
        return `Repeat ${name.split(':')[1]}`;
    }
    if (name.startsWith('step')) {
        // step0:tool_name -> tool_name
        const parts = name.split(':');
        return parts.length > 1 ? parts[1] : name;
    }
    if (name.startsWith('metric:')) {
        return name.split(':')[1];
    }
    return name;
}

/**
 * 根据选中的 repeats 计算需要高亮的节点集合
 */
export function calculateHighlightNodeSet(
    selectedRepeats: string[],
    repeatNodeNames?: Map<string, Set<string>>,
): Set<string> | null {
    if (!selectedRepeats || selectedRepeats.length === 0) {
        return null;
    }

    if (!repeatNodeNames) {
        return null;
    }

    const highlightSet = new Set<string>();
    selectedRepeats.forEach((repeatId) => {
        const nodes = repeatNodeNames.get(repeatId);
        if (nodes) {
            nodes.forEach((nodeName) => highlightSet.add(nodeName));
        }
    });

    return highlightSet;
}

/**
 * 获取节点颜色数组
 */
export function getNodeColors(
    nodes: SankeyNode[],
    highlightNodeSet: Set<string> | null,
): string[] {
    return nodes.map((node) => {
        const baseColor = node.itemStyle?.color || '#3b82f6';

        // 如果没有选中任何节点，所有节点完全不透明
        if (!highlightNodeSet) {
            return baseColor;
        }

        // 如果有选中，高亮的节点完全不透明，其他节点半透明
        const isHighlighted = highlightNodeSet.has(node.name);
        const opacity = isHighlighted ? 1 : 0.3;

        // 转换为 rgba 格式
        if (baseColor.startsWith('#')) {
            const r = parseInt(baseColor.slice(1, 3), 16);
            const g = parseInt(baseColor.slice(3, 5), 16);
            const b = parseInt(baseColor.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }

        return baseColor;
    });
}

/**
 * 处理连线数据，应用高亮逻辑
 */
export function processLinks(
    links: SankeyLink[],
    selectedRepeats: string[],
    nodeMap: Map<string, number>,
) {
    const sources: number[] = [];
    const targets: number[] = [];
    const values: number[] = [];
    const colors: string[] = [];

    links.forEach((link) => {
        const sourceIdx = nodeMap.get(link.source);
        const targetIdx = nodeMap.get(link.target);

        if (sourceIdx === undefined || targetIdx === undefined) {
            return;
        }

        sources.push(sourceIdx);
        targets.push(targetIdx);

        // 使用较小的值让连线更细，更美观
        values.push(link.value * 0.25);

        // 确定连线颜色和透明度
        const baseColor = link.lineStyle?.color || '#94a3b8';
        const isHighlighted =
            link.repeatId && selectedRepeats.includes(link.repeatId);
        const opacity = !selectedRepeats.length ? 0.5 : isHighlighted ? 0.8 : 0.2;

        // 转换为 rgba 格式
        let color: string;
        if (baseColor.startsWith('#')) {
            const r = parseInt(baseColor.slice(1, 3), 16);
            const g = parseInt(baseColor.slice(3, 5), 16);
            const b = parseInt(baseColor.slice(5, 7), 16);
            color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else if (baseColor.startsWith('rgb(')) {
            color = baseColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
        } else if (baseColor.startsWith('rgba(')) {
            color = baseColor.replace(/[\d.]+\)$/, `${opacity})`);
        } else {
            color = `rgba(148, 163, 184, ${opacity})`;
        }

        colors.push(color);
    });

    return { sources, targets, values, colors };
}

/**
 * 计算每个节点的值（基于流入和流出的连线）
 * 用于动态设置节点高度
 */
export function calculateNodeValues(
    nodes: SankeyNode[],
    links: SankeyLink[],
): number[] {
    const nodeValues = new Array(nodes.length).fill(0);
    const nodeNameToIndex = new Map<string, number>();

    nodes.forEach((node, index) => {
        nodeNameToIndex.set(node.name, index);
    });

    // 计算每个节点的流入和流出总和
    links.forEach((link) => {
        const sourceIdx = nodeNameToIndex.get(link.source);
        const targetIdx = nodeNameToIndex.get(link.target);

        if (sourceIdx !== undefined) {
            nodeValues[sourceIdx] += link.value;
        }
        if (targetIdx !== undefined) {
            nodeValues[targetIdx] += link.value;
        }
    });

    // 确保至少有一个最小值
    return nodeValues.map((v) => Math.max(v, 1));
}

/**
 * 转换 hex 颜色为 rgba
 */
export function hexToRgba(hex: string, opacity: number): string {
    if (hex.startsWith('rgba')) {
        return hex.replace(/[\d.]+\)$/, `${opacity})`);
    }

    if (hex.startsWith('rgb')) {
        return hex.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * 转换 hex 颜色为 rgb
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

/**
 * 混合两个颜色（用于 Google Charts 透明度模拟）
 */
export function mixColors(
    color: { r: number; g: number; b: number },
    white: { r: number; g: number; b: number },
    opacity: number,
): string {
    const r = Math.round(color.r * opacity + white.r * (1 - opacity));
    const g = Math.round(color.g * opacity + white.g * (1 - opacity));
    const b = Math.round(color.b * opacity + white.b * (1 - opacity));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
