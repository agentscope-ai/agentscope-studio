import {
    Label,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
} from 'recharts';
import { useTranslation } from 'react-i18next';

import { CardContent } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

export const description = 'A radial chart with a custom shape';

const chartData = [
    { browser: 'Used', visitors: 13, fill: 'var(--color-safari)' },
];

const chartConfig = {
    visitors: {
        label: 'Used',
    },
} satisfies ChartConfig;

interface DatabaseChartProps {
    size: string;
}
export const DatabaseChart = ({ size }: DatabaseChartProps) => {
    const { t } = useTranslation();
    return (
        <CardContent className="flex-1 pb-0 px-0">
            <div className="text-xs font-medium mb-1 text-center w-[70%]">
                {t('settings.database-usage')}
            </div>
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[90px]"
            >
                <RadialBarChart
                    data={chartData}
                    startAngle={0}
                    endAngle={360}
                    innerRadius={38}
                    outerRadius={66}
                >
                    <PolarGrid
                        gridType="circle"
                        radialLines={false}
                        stroke="none"
                        polarRadius={[55, 45]}
                    />
                    <RadialBar dataKey="visitors" background cornerRadius={6} />
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
                                                className="fill-foreground text font-bold"
                                            >
                                                {size}
                                            </tspan>
                                            <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 14}
                                                className="text-xs fill-muted-foreground"
                                            >
                                                {t('settings.used')}
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
    );
};
