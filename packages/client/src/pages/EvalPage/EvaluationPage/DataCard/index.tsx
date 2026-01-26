import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { formatNumber } from '@/utils/common';
import { ChartColumnBigIcon, ChartPieIcon, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Label,
    LabelList,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from 'recharts';
interface Props {
    models: Record<string, number>;
}

export const ModelCard = ({ models }: Props) => {
    const { t } = useTranslation();
    const chartConfig = {} satisfies ChartConfig;
    const chartData = models
        ? Object.entries(models).map(([key, value], index) => {
              return {
                  model: key,
                  invocations: value,
                  fill: `var(--chart-${index + 1})`,
              };
          })
        : [];

    const totalLlmInvocations = Object.values(models).reduce(
        (acc, curr) => acc + curr,
        0,
    );

    return (
        <Card className="">
            <CardHeader>
                <CardTitle>{t('common.llm')}</CardTitle>
                <CardDescription>{t('description.eval.llm')}</CardDescription>
                <CardAction>
                    <ChartPieIcon className="stroke-muted-foreground size-4" />
                </CardAction>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="invocations"
                            nameKey="model"
                            innerRadius={60}
                            strokeWidth={5}
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
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {formatNumber(
                                                        totalLlmInvocations,
                                                    )}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    {t(
                                                        'common.llm-invocations',
                                                    )}
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="text-sm">
                <div className="flex items-center gap-2 leading-none font-medium">
                    {t('description.eval.llm-footer', {
                        kind: Object.keys(models).length,
                        count: totalLlmInvocations,
                    })}
                    <TrendingUp className="size-4" />
                </div>
            </CardFooter>
        </Card>
    );
};

interface ToolCardProps {
    tools: Record<string, number>;
}

export const ToolCard = ({ tools }: ToolCardProps) => {
    const { t } = useTranslation();
    const chartConfig = {
        // count: {
        //     label: "count",
        //     color: "var(--chart-2)",
        // },
        // tool: {
        //     label: "Tool",
        //     color: "var(--chart-2)",
        // },
        // label: {
        //     color: "var(--background)",
        // },
    } satisfies ChartConfig;

    const chartData = Object.entries(tools)
        .map(([key, value]) => {
            return {
                tool: key,
                count: value,
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const totalToolInvocations = Object.values(tools).reduce(
        (acc, curr) => acc + curr,
        0,
    );

    return (
        <Card className="">
            <CardHeader>
                <CardTitle>{t('common.tool')}</CardTitle>
                <CardDescription>{t('description.eval.tool')}</CardDescription>
                <CardAction>
                    <ChartColumnBigIcon className="stroke-muted-foreground size-4" />
                </CardAction>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart
                        accessibilityLayer
                        data={chartData}
                        layout="vertical"
                        margin={{
                            right: 40,
                            left: 8,
                        }}
                    >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="tool"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                            hide
                        />
                        <XAxis dataKey="count" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="line" />}
                        />
                        <Bar
                            dataKey="count"
                            layout="vertical"
                            radius={4}
                            fill="var(--primary)"
                            maxBarSize={40}
                        >
                            <LabelList
                                dataKey="tool"
                                position="insideLeft"
                                offset={8}
                                className="fill-white"
                                fontSize={12}
                            />
                            <LabelList
                                dataKey="count"
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="text-sm">
                <div className="flex items-center gap-2 leading-none font-medium">
                    {t('description.eval.tool-footer', {
                        kind: Object.keys(tools).length,
                        count: totalToolInvocations,
                    })}
                    <TrendingUp className="size-4" />
                </div>
            </CardFooter>
        </Card>
    );
};
