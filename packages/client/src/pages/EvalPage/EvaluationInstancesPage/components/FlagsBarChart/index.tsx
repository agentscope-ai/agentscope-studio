import { memo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface FlagData {
    name: string;
    value: number;
}

interface FlagsBarChartProps {
    data: FlagData[];
}

const FlagsBarChart = ({ data }: FlagsBarChartProps) => {
    // Flag 描述映射
    const flagDescriptions: Record<string, string> = {
        duplicated_actions:
            'Actions were duplicated in the workflow, indicating potential inefficiency',
        failed_actions:
            'Actions failed during execution in the agentic workflow',
        failed_tests:
            'Test cases failed, indicating the solution did not pass verification',
        no_test_patch:
            'No test changes were made, suggesting lack of verification',
    };

    // Flag 颜色（使用黑色，因为柱状图是黑色的）
    const flagColor = '#000000';

    return (
        <div className="rounded-xl border shadow">
            <div className="p-4 sm:p-6 flex flex-col space-y-2 sm:space-y-3">
                <div className="flex flex-row items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold leading-none tracking-tight">
                        Flags
                    </h3>
                    <div className="text-muted-foreground h-4 w-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line
                                x1="12"
                                x2="12"
                                y1="20"
                                y2="10"
                            ></line>
                            <line
                                x1="18"
                                x2="18"
                                y1="20"
                                y2="4"
                            ></line>
                            <line
                                x1="6"
                                x2="6"
                                y1="20"
                                y2="16"
                            ></line>
                        </svg>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
                    Flags indicate potential issues in how the LLM follows the
                    agentic workflow. They help identify common failure modes
                    like hallucinations, "stuck in a loop", or missing test
                    verifications.
                </p>
                <div className="h-[280px] sm:h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{
                                top: 10,
                                right: 20,
                                left: -10,
                                bottom: 10,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--border)"
                                horizontal={true}
                                vertical={false}
                            />
                            <XAxis
                                type="number"
                                domain={[0, 'dataMax']}
                                ticks={[
                                    0, 11, 22, 33, 44, 55, 66, 77, 88, 99, 110,
                                    121, 132,
                                ]}
                                tick={{ fontSize: 10 }}
                                stroke="var(--muted-foreground)"
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={120}
                                tick={{ fontSize: 10 }}
                                stroke="var(--muted-foreground)"
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const flagName = data.name || '';
                                        const value = data.value as number;

                                        const description =
                                            flagDescriptions[flagName] || '';

                                        return (
                                            <div className="rounded-lg bg-gray-900/90 text-white p-2 shadow-lg border border-gray-700">
                                                <div className="font-semibold text-sm mb-1">
                                                    {flagName}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm mb-1">
                                                    <div
                                                        className="w-3 h-3 rounded-sm"
                                                        style={{
                                                            backgroundColor:
                                                                flagColor,
                                                        }}
                                                    />
                                                    <span>
                                                        {flagName}: {value}
                                                    </span>
                                                </div>
                                                {description && (
                                                    <div className="text-xs text-gray-300 mt-1">
                                                        {description}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="#000000"
                                maxBarSize={38}
                                radius={[0, 3, 3, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default memo(FlagsBarChart);

