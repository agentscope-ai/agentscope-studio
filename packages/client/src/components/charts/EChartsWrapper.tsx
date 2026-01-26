import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { memo, useEffect, useRef } from 'react';

interface EChartsWrapperProps {
    option: EChartsOption;
    style?: React.CSSProperties;
    className?: string;
    theme?: 'light' | 'dark' | object;
    onChartReady?: (chart: echarts.ECharts) => void;
}

/**
 * ECharts wrapper component for React
 * Provides automatic cleanup and resize handling
 */
const EChartsWrapper = ({
    option,
    style = { width: '100%', height: '400px' },
    className,
    theme,
    onChartReady,
}: EChartsWrapperProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        // Initialize chart instance
        chartInstanceRef.current = echarts.init(chartRef.current, theme);

        // Notify parent component when chart is ready
        if (onChartReady) {
            onChartReady(chartInstanceRef.current);
        }

        // Handle window resize
        const handleResize = () => {
            chartInstanceRef.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstanceRef.current?.dispose();
        };
    }, [theme, onChartReady]);

    // Update chart when option changes
    useEffect(() => {
        if (chartInstanceRef.current && option) {
            chartInstanceRef.current.setOption(option, true);
        }
    }, [option]);

    return <div ref={chartRef} style={style} className={className} />;
};

export default memo(EChartsWrapper);
