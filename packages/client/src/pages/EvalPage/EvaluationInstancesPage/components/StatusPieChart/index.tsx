import { memo } from 'react';
import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

interface StatusData {
    name: string;
    value: number;
    color: string;
}

interface StatusPieChartProps {
    data: StatusData[];
}

const StatusPieChart = ({ data }: StatusPieChartProps) => {
    // 状态描述映射
    const statusDescriptions: Record<string, string> = {
        failed: 'Instance was not resolved by the SWE-Bench harness',
        resolved: 'Instance was resolved successfully by the SWE-Bench harness',
        no_patch: 'Instance did not generate any patches',
        error: 'Instance encountered an error during evaluation',
    };

    // 状态颜色映射
    const statusColors: Record<string, string> = {
        failed: '#ef4444',
        resolved: '#22c55e',
        no_patch: '#f97316',
        error: '#a855f7',
    };

    return (
        <div className="rounded-xl border shadow">
            <div className="p-4 sm:p-6 flex flex-col space-y-2 sm:space-y-3">
                <div className="flex flex-row items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold leading-none tracking-tight">
                        Status
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
                            <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"></path>
                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                        </svg>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
                    Final status of instances evaluated with the Moatless
                    EvalTools SWE-Bench Harness. Indicates if the instance was
                    resolved successfully, failed to complete, encountered an
                    error, or didn't generate any patches.
                </p>
                <div className="h-[280px] sm:h-[320px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="45%"
                                labelLine={false}
                                label={false}
                                outerRadius="80%"
                                innerRadius={0}
                                fill="#8884d8"
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0];
                                        const statusName = data.name || '';
                                        const value = data.value as number;

                                        const description =
                                            statusDescriptions[statusName] ||
                                            '';
                                        const color =
                                            statusColors[statusName] ||
                                            '#8884d8';

                                        return (
                                            <div className="rounded-lg bg-gray-900/90 text-white p-2 shadow-lg border border-gray-700">
                                                <div className="font-semibold text-sm mb-1">
                                                    {statusName}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm mb-1">
                                                    <div
                                                        className="w-3 h-3 rounded-sm"
                                                        style={{
                                                            backgroundColor:
                                                                color,
                                                        }}
                                                    />
                                                    <span>
                                                        {statusName}: {value}
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
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="square"
                                wrapperStyle={{
                                    paddingTop: '20px',
                                }}
                                formatter={(value) => value}
                                iconSize={10}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default memo(StatusPieChart);
