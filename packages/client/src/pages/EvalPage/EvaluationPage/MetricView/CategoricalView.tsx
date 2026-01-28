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
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    TooltipProps,
    XAxis,
    YAxis,
} from 'recharts';

// Color palette for categories
const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#00C49F',
];

interface CategoryMetricData {
    type: 'category';
    scores: {
        [repeatId: string]: {
            [category: string]: number;
        };
    };
}

interface Props {
    metrics: Record<string, CategoryMetricData>;
}

const CategoricalMetricView = ({ metrics }: Props) => {
    const { t } = useTranslation();
    const [selectedMetric, setSelectedMetric] = useState<string | undefined>(
        undefined,
    );

    const metricNames = useMemo(() => Object.keys(metrics), [metrics]);

    useEffect(() => {
        if (metricNames.length > 0 && !selectedMetric) {
            setSelectedMetric(metricNames[0]);
        }
    }, [metricNames, selectedMetric]);

    // Get all unique categories across all repeats
    const categories = useMemo(() => {
        if (!selectedMetric || !metrics[selectedMetric]) return [];
        const categorySet = new Set<string>();
        Object.values(metrics[selectedMetric].scores).forEach((repeatData) => {
            Object.keys(repeatData).forEach((cat) => categorySet.add(cat));
        });
        return Array.from(categorySet);
    }, [selectedMetric, metrics]);

    // Prepare data for stacked bar chart (per repeat)
    const stackedBarData = useMemo(() => {
        if (!selectedMetric || !metrics[selectedMetric]) return [];
        return Object.entries(metrics[selectedMetric].scores).map(
            ([repeatId, categoryData]) => ({
                name: repeatId,
                ...categoryData,
            }),
        );
    }, [selectedMetric, metrics]);

    // Prepare data for pie chart (aggregated across all repeats)
    const pieData = useMemo(() => {
        if (!selectedMetric || !metrics[selectedMetric]) return [];
        const aggregated: Record<string, number> = {};
        Object.values(metrics[selectedMetric].scores).forEach((repeatData) => {
            Object.entries(repeatData).forEach(([category, value]) => {
                aggregated[category] = (aggregated[category] || 0) + value;
            });
        });
        return Object.entries(aggregated).map(([name, value], index) => ({
            name,
            value,
            fill: COLORS[index % COLORS.length],
        }));
    }, [selectedMetric, metrics]);

    // Generate chart config for categories
    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        categories.forEach((cat, index) => {
            config[cat] = {
                label: cat,
                color: COLORS[index % COLORS.length],
            };
        });
        return config;
    }, [categories]);

    // Custom tooltip for pie chart to show name, value, and percentage
    const PieChartTooltip = ({
        active,
        payload,
    }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const total = pieData.reduce((sum, item) => sum + item.value, 0);
            const percent =
                total > 0 ? ((data.value as number) / total) * 100 : 0;

            return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid gap-1.5">
                        <div className="flex items-center gap-2">
                            <div
                                className="h-2.5 w-2.5 rounded-[2px]"
                                style={{ backgroundColor: data.payload.fill }}
                            />
                            <span className="text-muted-foreground">
                                {data.name}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-foreground font-mono font-medium tabular-nums">
                                {data.value?.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                                {percent.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (metricNames.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('common.categorical-metric')}</CardTitle>
                <CardDescription>
                    {t('description.eval.categorical-metric-description')}
                </CardDescription>
                <CardAction className="flex flex-row gap-2">
                    <Select
                        value={selectedMetric}
                        onValueChange={setSelectedMetric}
                    >
                        <SelectTrigger size="sm">
                            <SelectValue
                                placeholder={t('placeholder.select-metric')}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {metricNames.map((metricName) => (
                                <SelectItem
                                    key={metricName}
                                    className="truncate"
                                    value={metricName}
                                >
                                    {metricName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stacked Bar Chart - per repeat */}
                <Card className="border-none shadow-none">
                    <CardContent>
                        <ChartContainer config={chartConfig}>
                            <BarChart
                                accessibilityLayer
                                data={stackedBarData}
                                // margin={{ top: 10, right: 10, bottom: 50, left: 10 }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value.slice(0, 8)}
                                />
                                <YAxis />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                {categories.map((category, index) => (
                                    <Bar
                                        key={category}
                                        dataKey={category}
                                        stackId="a"
                                        fill={COLORS[index % COLORS.length]}
                                        radius={
                                            index === categories.length - 1
                                                ? [4, 4, 0, 0]
                                                : [0, 0, 0, 0]
                                        }
                                    />
                                ))}
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-center gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            {t('description.eval.categorical-bar-footer', {
                                metricName: selectedMetric,
                            })}
                        </div>
                        <div className="text-muted-foreground leading-none">
                            {t('description.eval.showing-repeats', {
                                count: stackedBarData.length,
                            })}
                        </div>
                    </CardFooter>
                </Card>

                {/* Pie Chart - aggregated */}
                <Card className="border-none shadow-none">
                    <CardContent>
                        <ChartContainer config={chartConfig}>
                            <PieChart
                            // margin={{ top: 10, right: 10, bottom: 50, left: 10 }}
                            >
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="85%"
                                    dataKey="value"
                                >
                                    {pieData.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <ChartTooltip content={<PieChartTooltip />} />
                                <ChartLegend content={<ChartLegendContent />} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-center gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            {t('description.eval.categorical-pie-footer', {
                                metricName: selectedMetric,
                            })}
                        </div>
                        <div className="text-muted-foreground leading-none">
                            {t('description.eval.showing-repeats', {
                                count: selectedMetric
                                    ? Object.keys(
                                          metrics[selectedMetric].scores,
                                      ).length
                                    : 0,
                            })}
                        </div>
                    </CardFooter>
                </Card>
            </CardContent>
        </Card>
    );
};

export default memo(CategoricalMetricView);
