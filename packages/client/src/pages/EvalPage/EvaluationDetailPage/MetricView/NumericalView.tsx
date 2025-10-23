import { memo, useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Label,
} from 'recharts';
import { arrayToPDF, MetricsDTO } from '../utils.ts';
import { Select } from 'antd';

interface Props {
    metrics: MetricsDTO;
}

const NumericalView = ({ metrics }: Props) => {
    const metricNames =  Object.keys(metrics);

    const metricOptions = metricNames.map(
        (metricName) => ({label: metricName, value: metricName})
    );
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

    useEffect(
        () => {
            if (metricNames.length > 0) {
                setSelectedMetric(
                    prev => {
                        if (prev === null) {
                            return metricNames[0];
                        }
                        return prev;
                    }
                );
            }
        },
        [metricNames]
    )

    const pdfData = selectedMetric ? arrayToPDF(
        metrics[selectedMetric].scores.map(score => score.value)
    ) : [];

    return (
        <div className="rounded-xl border shadow">
            <div className="flex flex-ro items-center justify-between p-6 pb-0 text-sm font-medium">
                Analysis
                <Select
                    className='w-[180px]'
                    variant={'filled'}
                    options={metricOptions}
                    value={selectedMetric}
                    onChange={setSelectedMetric}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 w-full h-fit text-muted-foreground pt-2 pr-6 pl-6 truncate">
                <div className='flex justify-center'>Metric Values by Repeat ID</div>
                <div className='flex justify-center'>Probability Density Function</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 p-6 pb-3 pt-0 w-full h-[200px]">
                <ResponsiveContainer height={'100%'} width={'100%'} className={''}>
                    <BarChart
                        data={selectedMetric ? metrics[selectedMetric].scores : []}
                        margin={
                            {
                                top: 10,
                                right: 10,
                                left: 10,
                                bottom: 10,
                            }
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <Bar
                            dataKey="value"
                            fill="var(--muted-foreground)"
                            maxBarSize={20}
                            stackId={'modelName'}
                        />
                        <YAxis type="number" label={{ value: 'Value', angle: -90, position: 'center', dx: -20 }} />
                        <XAxis dataKey="name" type="category" >
                            <Label value={'Repeat ID'} position={'insideBottomRight'} offset={0}/>
                        </XAxis>
                        <Tooltip
                            contentStyle={{
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                            }}
                            labelStyle={{
                                fontWeight: 500,
                            }}
                            cursor={{fill: 'transparent'}}
                            labelFormatter={
                                label => {
                                    return `RepeatID: ${label}`;
                                }
                            }
                        />
                    </BarChart>
                </ResponsiveContainer>

                <ResponsiveContainer height={'100%'} width={'100%'}>
                    <AreaChart
                        data={pdfData}
                        margin={{
                            top: 10,
                            right: 10,
                            left: 10,
                            bottom: 10,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" type={'number'} >
                            <Label value={'Value'} position={'insideBottomRight'} offset={0}/>
                        </XAxis>
                        <YAxis label={{ value: 'Density', angle: -90, position: 'center', dx: -20 }} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                            }}
                            labelStyle={{
                                fontWeight: 500,
                            }}
                            cursor={{fill: 'transparent'}}
                            labelFormatter={
                                label => {
                                    return `Value: ${label}`;
                                }
                            }
                            formatter={
                                (value) => {
                                    return [value, `Density`];
                                }
                            }
                        />
                        <Area
                            type="monotone"
                            dataKey="y"
                            stroke="var(--primary-color)"
                            fill="var(--primary-color)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default memo(NumericalView);
