import {
    Label,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
} from 'recharts';
import { useTranslation } from 'react-i18next';

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

export const description = 'A radial chart with a custom shape';

const chartData = [
    { browser: 'safari', visitors: 13, fill: 'var(--color-safari)' },
];

const chartConfig = {
    visitors: {
        label: 'Used',
    },
    safari: {
        label: 'Safari',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig;

interface DatabaseChartProps {
    size: string;
}
export const DatabaseChart = ({ size }: DatabaseChartProps) => {
    const { t } = useTranslation();
    return (
        <>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[180px]"
                >
                    <RadialBarChart
                        data={chartData}
                        startAngle={0}
                        endAngle={360}
                        innerRadius={60}
                        outerRadius={100}
                    >
                        <PolarGrid
                            gridType="circle"
                            radialLines={false}
                            stroke="none"
                            className="first:fill-muted last:fill-background"
                            polarRadius={[75, 65]}
                        />
                        <RadialBar
                            dataKey="visitors"
                            background
                            cornerRadius={8}
                        />
                        <PolarRadiusAxis
                            tick={false}
                            tickLine={false}
                            axisLine={false}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (
                                        viewBox &&
                                        'cx' in viewBox &&
                                        'cy' in viewBox
                                    ) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-xl font-bold"
                                                >
                                                    {size}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="text-xl fill-muted-foreground"
                                                >
                                                    Used
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </PolarRadiusAxis>
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
            <CardHeader className="text-center -mt-2">
                <CardTitle>{t('database-usage')}</CardTitle>
            </CardHeader>
        </>
    );
};
