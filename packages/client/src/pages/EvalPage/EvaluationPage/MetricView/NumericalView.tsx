import { memo, useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Tooltip,
    XAxis,
    YAxis,
    LineChart,
    Line,
} from 'recharts';
import { arrayToCDF, MetricsDTO } from '../utils.ts';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
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
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart.tsx';

interface Props {
    metrics: Record<string, MetricsDTO>;
}

const NumericalMetricView = ({ metrics }: Props) => {
    const [selectedMetric, setSelectedMetric] = useState<string | undefined>(
        undefined,
    );

    useEffect(() => {
        if (Object.keys(metrics).length > 0) {
            setSelectedMetric(Object.keys(metrics)[0]);
        }
    }, [metrics]);

    const pdfData = selectedMetric
        ? arrayToCDF(Array.from(Object.values(metrics[selectedMetric].scores)))
        : [];

    const chartConfig = {
        value: {
            label: selectedMetric,
            color: 'var(--chart-5)',
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Metric</CardTitle>
                <CardDescription>
                    The distribution and repeat-wise scores for the selected
                    metric.
                </CardDescription>
                <CardAction className="flex flex-row gap-2">
                    <Select value={selectedMetric}>
                        <SelectTrigger size="sm">
                            <SelectValue placeholder="Select a metric" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(metrics).map((metricName) => (
                                <SelectItem
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
            <CardContent className="grid grid-cols-2">
                <Card className="border-none shadow-none">
                    <CardContent>
                        <ChartContainer config={chartConfig}>
                            <BarChart
                                accessibilityLayer
                                data={
                                    selectedMetric
                                        ? Object.entries(
                                              metrics[selectedMetric].scores,
                                          ).map(([repeatId, value]) => {
                                              return {
                                                  name: repeatId,
                                                  value: value,
                                              };
                                          })
                                        : []
                                }
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value.slice(0, 5)}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="var(--color-value)"
                                    radius={8}
                                    maxBarSize={80}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            The {selectedMetric} scores across different
                            repeats.
                        </div>
                        <div className="text-muted-foreground leading-none">
                            Showing{' '}
                            {selectedMetric
                                ? Object.keys(metrics[selectedMetric].scores)
                                      .length
                                : 0}{' '}
                            repeats.
                        </div>
                    </CardFooter>
                </Card>
                <Card className="border-none shadow-none">
                    <CardContent>
                        <ChartContainer config={chartConfig}>
                            <LineChart data={pdfData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="x"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    label={{
                                        value: selectedMetric,
                                        position: 'insideBottom',
                                        offset: -3,
                                    }}
                                />
                                <YAxis
                                    domain={[0, 1]}
                                    label={{
                                        value: 'CDF',
                                        angle: -90,
                                        position: 'insideLeft',
                                    }}
                                />
                                <Tooltip
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Line
                                    type="stepAfter"
                                    dataKey="cdf"
                                    stroke="#8884d8"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            The cumulative distribution function (CDF) of{' '}
                            {selectedMetric}.
                        </div>
                        <div className="text-muted-foreground leading-none">
                            Showing{' '}
                            {selectedMetric
                                ? Object.keys(metrics[selectedMetric].scores)
                                      .length
                                : 0}{' '}
                            repeats.
                        </div>
                    </CardFooter>
                </Card>
            </CardContent>
        </Card>
    );
};

export default memo(NumericalMetricView);
