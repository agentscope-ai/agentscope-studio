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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { arrayToCDF } from '../utils.ts';

interface NumericalMetricData {
    type: 'numerical';
    scores: {
        [repeatId: string]: number;
    };
}

interface Props {
    metrics: Record<string, NumericalMetricData>;
}

const NumericalMetricView = ({ metrics }: Props) => {
    const { t } = useTranslation();
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
                <CardTitle>{t('common.numerical-metric')}</CardTitle>
                <CardDescription>
                    {t('description.eval.numerical-metric-description')}
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
                            {Object.keys(metrics).map((metricName) => (
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
                    <CardFooter className="flex-col items-center gap-2 text-sm text-center">
                        <div className="flex gap-2 leading-none font-medium justify-center">
                            {t('description.eval.numerical-metric-bar-footer', {
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
                    <CardFooter className="flex-col items-center gap-2 text-sm text-center">
                        <div className="flex gap-2 leading-none font-medium justify-center">
                            {t('description.eval.numerical-metric-cdf-footer', {
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

export default memo(NumericalMetricView);
