import { memo, useMemo } from 'react';
import * as echarts from 'echarts/core';
import { TooltipComponent } from 'echarts/components';
import { SankeyChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import EChartsWrapper from '@/components/charts/EChartsWrapper';

// Register required components
echarts.use([TooltipComponent, SankeyChart, CanvasRenderer]);

const ChartPage = () => {
    // Define chart option using useMemo to avoid unnecessary re-renders
    const option: EChartsOption = useMemo(
        () => ({
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove',
            },
            animation: false,
            series: [
                {
                    type: 'sankey',
                    bottom: '10%',
                    emphasis: {
                        focus: 'adjacency',
                    },
                    data: [
                        { name: 'a' },
                        { name: 'b' },
                        { name: 'a1' },
                        { name: 'b1' },
                        { name: 'c' },
                        { name: 'e' },
                    ],
                    links: [
                        { source: 'a', target: 'a1', value: 5 },
                        { source: 'e', target: 'b', value: 3 },
                        { source: 'a', target: 'b1', value: 3 },
                        { source: 'b1', target: 'a1', value: 1 },
                        { source: 'b1', target: 'c', value: 2 },
                        { source: 'b', target: 'c', value: 1 },
                    ],
                    orient: 'vertical',
                    label: {
                        position: 'top',
                    },
                    lineStyle: {
                        color: 'source',
                        curveness: 0.5,
                    },
                },
            ],
        }),
        [],
    );

    return (
        <div className="col-span-full rounded-xl border shadow">
            <div className="p-6 flex flex-col justify-between space-y-0 pb-1">
                <h3 className="tracking-tight text-sm font-medium">
                    Workflow Visualization
                </h3>
            </div>
            <div className="p-6 pt-2">
                <EChartsWrapper
                    option={option}
                    style={{ width: '100%', height: '400px' }}
                />
            </div>
        </div>
    );
};

export default memo(ChartPage);
