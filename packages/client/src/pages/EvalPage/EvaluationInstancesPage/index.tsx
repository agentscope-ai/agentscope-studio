import { memo, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import AsTable from '@/components/tables/AsTable';
import { useEvaluationRoom } from '@/context/EvaluationRoomContext.tsx';
import { EmptyPage } from '@/pages/DefaultPage';
import {
    NumberCell,
    StatusCell,
    TextCell,
} from '@/components/tables/utils.tsx';
import { EvaluationMetaData } from '@shared/types';

const EvaluationInstancesPage = () => {
    const { evaluationData } = useEvaluationRoom();
    const navigate = useNavigate();

    if (evaluationData === null) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 items-center h-full">
                <EmptyPage
                    size={200}
                    title="No data for the given evaluation ID"
                />
            </div>
        );
    }

    return (
        <div className="flex-1 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 h-full">
                <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-xl">
                        claude-3-5-sonnet-20241022
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                        20250113_claude_3_5_sonnet_20241022_temp_0_0_iter_20_fmt_tool_call_hist_messages_lite
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                        <div className="rounded-xl border shadow">
                            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                                <h3 className="tracking-tight text-sm font-medium">
                                    Setup
                                </h3>
                                <div className="text-muted-foreground h-4 w-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        className="lucide-icon lucide lucide-settings"
                                    >
                                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>

                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                            </div>

                            <div className="p-6 min-h-[5.5rem] pt-2">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between col-span-2">
                                            <span className="text-sm text-muted-foreground">
                                                Model
                                            </span>
                                            <span className="text-sm font-medium">
                                                claude-3-5-sonnet-20241022
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Temperature
                                            </span>
                                            <span className="text-sm font-medium">
                                                N/A
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Max Iterations
                                            </span>
                                            <span className="text-sm font-medium">
                                                20
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Format
                                            </span>
                                            <span className="text-sm font-medium">
                                                tool_call
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Max Cost
                                            </span>
                                            <span className="text-sm font-medium">
                                                $1.00
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                % Resolved
                            </h3>
                            <div className="text-muted-foreground h-4 w-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    className="lucide-icon lucide lucide-activity"
                                >
                                    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold flex items-center gap-2">
                            39.0%
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                    Resolved
                                    </span>
                                    <span className="text-sm font-medium">
                                        512
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        Total
                                    </span>
                                    <span className="text-sm font-medium">
                                        100
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                            Cost
                            </h3>
                            <div className="text-muted-foreground h-4 w-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    className="lucide-icon lucide lucide-dollar-sign"
                                >
                                    <line x1="12" x2="12" y1="2" y2="22"></line>

                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold">$42.60</div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        $/Instance
                                    </span>
                                    <span className="text-sm font-medium">
                                    $0.14
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        Resolved/$
                                    </span>
                                    <span className="text-sm font-medium">
                                        6.54
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                Token Usage
                            </h3>
                            <div className="text-muted-foreground h-4 w-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    className="lucide-icon lucide lucide-cpu"
                                >
                                    <rect
                                        width="16"
                                        height="16"
                                        x="4"
                                        y="4"
                                        rx="2"
                                    ></rect>
                                    <rect
                                        width="6"
                                        height="6"
                                        x="9"
                                        y="9"
                                        rx="1"
                                    ></rect>
                                    <path d="M15 2v2"></path>
                                    <path d="M15 20v2"></path>
                                    <path d="M2 15h2"></path>
                                    <path d="M2 9h2"></path>
                                    <path d="M20 15h2"></path>
                                    <path d="M20 9h2"></path>
                                    <path d="M9 2v2"></path>
                                    <path d="M9 20v2"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold">11.4M</div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        Prompt
                                    </span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-sm font-medium">
                                            5.9M
                                        </span>
                                        <span className="text-xs text-muted-foreground/75">
                                            (4.5M)
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        Completion
                                    </span>
                                    <span className="text-sm font-medium">
                                        1.1M
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Status Pie Chart */}
                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-col space-y-3">
                            <div className="flex flex-row items-center justify-between">
                                <h3 className="text-lg font-semibold leading-none tracking-tight">
                                    Status
                                </h3>
                                <div className="text-muted-foreground h-4 w-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"></path><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path></svg>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Final status of instances evaluated with the
                                Moatless EvalTools SWE-Bench Harness. Indicates
                                if the instance was resolved successfully, failed
                                to complete, encountered an error, or didn't
                                generate any patches.
                            </p>
                            <div className="h-[320px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                {
                                                    name: 'no_patch',
                                                    value: 4,
                                                    color: '#f97316',
                                                },
                                                {
                                                    name: 'resolved',
                                                    value: 100,
                                                    color: '#22c55e',
                                                },
                                                {
                                                    name: 'failed',
                                                    value: 195,
                                                    color: '#ef4444',
                                                },
                                                {
                                                    name: 'error',
                                                    value: 1,
                                                    color: '#a855f7',
                                                },
                                            ]}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={false}
                                            outerRadius={120}
                                            innerRadius={0}
                                            fill="#8884d8"
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {[
                                                { name: 'no_patch', color: '#f97316' },
                                                { name: 'resolved', color: '#22c55e' },
                                                { name: 'failed', color: '#ef4444' },
                                                { name: 'error', color: '#a855f7' },
                                            ].map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number, name: string) => [
                                                `${value} (${((value / 300) * 100).toFixed(1)}%)`,
                                                name,
                                            ]}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{
                                                paddingTop: '20px',
                                            }}
                                            formatter={(value) => value}
                                            iconSize={8}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Flags Bar Chart */}
                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-col space-y-3">
                            <div className="flex flex-row items-center justify-between">
                                <h3 className="text-lg font-semibold leading-none tracking-tight">
                                    Flags
                                </h3>
                                <div className="text-muted-foreground h-4 w-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"></line><line x1="18" x2="18" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="16"></line></svg>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Flags indicate potential issues in how the LLM
                                follows the agentic workflow. They help identify
                                common failure modes like hallucinations, "stuck
                                in a loop", or missing test verifications.
                            </p>
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            {
                                                name: 'duplicated_actions',
                                                value: 22,
                                            },
                                            {
                                                name: 'failed_actions',
                                                value: 42,
                                            },
                                            {
                                                name: 'failed_tests',
                                                value: 32,
                                            },
                                            {
                                                name: 'no_test_patch',
                                                value: 137,
                                            },
                                        ]}
                                        layout="vertical"
                                        margin={{
                                            top: 10,
                                            right: 30,
                                            left: 20,
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
                                            ticks={[0, 11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]}
                                            tick={{ fontSize: 11 }}
                                            stroke="var(--muted-foreground)"
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={150}
                                            tick={{ fontSize: 11 }}
                                            stroke="var(--muted-foreground)"
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [
                                                value,
                                                'Count',
                                            ]}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    let description = '';
                                                    if (data.name === 'no_test_patch') {
                                                        description =
                                                            'No test changes were made, suggesting lack of verification';
                                                    }
                                                    return (
                                                        <div className="rounded-lg border bg-popover p-3 shadow-md">
                                                            <p className="font-medium text-sm">
                                                                {data.name}
                                                            </p>
                                                            {description && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {description}
                                                                </p>
                                                            )}
                                                            <p className="text-sm font-semibold mt-1">
                                                                Count: {data.value}
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="#000000"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="block">
                    <div className="rounded-xl border shadow">
                        <div className="flex flex-ro items-center justify-between space-y-1.5 p-6 pb-2 font-medium text-lg font-semibold leading-none tracking-tight">
                            Instances
                        </div>
                        <div className="p-6">
                            <AsTable
                                columns={[
                                    {
                                        key: 'id',
                                        render: (value) => (
                                            <TextCell
                                                text={value}
                                                selected={false}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'question',
                                        render: (value) => (
                                            <TextCell
                                                text={value}
                                                selected={false}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'status',
                                        render: (value) => (
                                            <StatusCell
                                                status={value}
                                                selected={false}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'ground_truth',
                                    },
                                    {
                                        key: 'repeat',
                                        render: (value) => (
                                            <NumberCell
                                                number={value}
                                                selected={false}
                                            />
                                        ),
                                    },
                                ]}
                                onRow={(record: EvaluationMetaData) => {
                                    return {
                                        onClick: (event: MouseEvent) => {
                                            if (event.type === 'click') {
                                                navigate(
                                                    `/eval/${record.id}/instance/${record.id}`,
                                                );
                                            }
                                        },
                                        style: {
                                            cursor: 'pointer',
                                        },
                                    };
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(EvaluationInstancesPage);
