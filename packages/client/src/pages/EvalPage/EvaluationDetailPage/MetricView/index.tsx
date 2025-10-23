import { memo } from 'react';
import { Flex, Tooltip } from 'antd';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ErrorBar,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from 'recharts';

const DiscreteMetric = () => {
    return (
        <Flex
            style={{
                height: '100%',
                width: '100%',
            }}
            vertical={true}
        >
            <ResponsiveContainer height="100%" width="50%">
                <BarChart
                    width={300}
                    accessibilityLayer
                    barCategoryGap="10%"
                    barGap={4}
                    data={[
                        {
                            amt: 1400,
                            name: 'repeat-1',
                            pv: 800,
                            pvError: [100, 200],
                            uv: 590,
                        },
                        {
                            amt: 1400,
                            name: 'repeat-2',
                            pv: 800,
                            pvError: [100, 200],
                            uv: 330,
                        },
                        {
                            amt: 300,
                            name: 'repeat-3',
                            pv: 800,
                            pvError: [50, 150],
                            uv: 100,
                        },
                        {
                            amt: 300,
                            name: 'repeat-4',
                            pv: 800,
                            pvError: [50, 150],
                            uv: 100,
                        },
                        {
                            amt: 300,
                            name: 'repeat-5',
                            pv: 800,
                            pvError: [50, 150],
                            uv: 100,
                        },
                    ]}
                    layout={'horizontal'}
                    margin={{
                        bottom: 5,
                        left: 0,
                        right: 0,
                        top: 20,
                    }}
                    syncMethod="index"
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <YAxis type="number" />
                    <XAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Bar
                        dataKey="uv"
                        fill="var(--color-primary)"
                        maxBarSize={50}
                    >
                        <ErrorBar
                            dataKey="pvError"
                            direction="y"
                            stroke="red"
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Flex>
    );
};

export default memo(DiscreteMetric);
