import { memo, MouseEvent } from 'react';
import { Select } from 'antd';
import { useNavigate } from 'react-router-dom';
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

const EvaluationDetailPage = () => {
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
                        {evaluationData.name}
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                        Evaluation on Benchmark {evaluationData.benchmark}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                        <div className="rounded-xl border shadow">
                            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                                <h3 className="tracking-tight text-sm font-medium">
                                    Benchmark
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
                                                Name
                                            </span>
                                            <span className="text-sm font-medium">
                                                {evaluationData.benchmark}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                %Task
                                            </span>
                                            <span className="text-sm font-medium">
                                                200
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Progress
                                            </span>
                                            <span className="text-sm font-medium">
                                                30%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Format
                                            </span>
                                            <span className="text-sm font-medium">
                                                react
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
                                % Repeat
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
                                {evaluationData.repeat}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        Finished
                                    </span>
                                    <span className="text-sm font-medium">
                                        5
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        Target
                                    </span>
                                    <span className="text-sm font-medium">
                                        5
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                Metric
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
                            <div className="text-2xl font-bold">3</div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        $/Instance
                                    </span>
                                    <span className="text-sm font-medium">
                                        7.64¢
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
                            <div className="text-2xl font-bold">7.0M</div>
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

                <div className="hidden sm:block">
                    <div className="rounded-xl border shadow">
                        <div className="flex flex-ro items-center justify-between space-y-1.5 p-6 pb-2 text-sm font-medium">
                            Result
                            <Select
                                variant="filled"
                                defaultValue="accuracy"
                                options={[
                                    {
                                        label: 'Accuracy',
                                        value: 'accuracy',
                                    },
                                    {
                                        label: 'Tool Usage',
                                        value: 'tool-usage',
                                    },
                                ]}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 p-6 pt-3 w-full h-[150px]">
                            <ResponsiveContainer height="100%" width="100%">
                                <BarChart
                                    data={[
                                        {
                                            name: 'repeat-1',
                                            accuracy: 0.72,
                                        },
                                        {
                                            name: 'repeat-2',
                                            accuracy: 0.85,
                                        },
                                        {
                                            name: 'repeat-3',
                                            accuracy: 0.6,
                                        },
                                        {
                                            name: 'repeat-4',
                                            accuracy: 0.8,
                                        },
                                        {
                                            name: 'repeat-5',
                                            accuracy: 0.9,
                                        },
                                    ]}
                                    margin={{
                                        top: 0,
                                        right: 0,
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <Bar
                                        dataKey="accuracy"
                                        fill="var(--muted-foreground)"
                                        maxBarSize={20}
                                        stackId="modelName"
                                    />
                                    <YAxis type="number" />
                                    <XAxis dataKey="name" type="category" />
                                </BarChart>
                            </ResponsiveContainer>

                            <ResponsiveContainer height="100%" width="100%">
                                <AreaChart
                                    data={[
                                        {
                                            name: 0,
                                            uv: 0,
                                        },
                                        {
                                            name: 50,
                                            uv: 0.7,
                                        },
                                        {
                                            name: 100,
                                            uv: 0,
                                        },
                                    ]}
                                    margin={{
                                        top: 10,
                                        right: 30,
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" type="number" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="uv"
                                        stroke="var(--primary-color)"
                                        fill="var(--primary-color)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="block">
                    <div className="rounded-xl border shadow">
                        <div className="flex flex-ro items-center justify-between space-y-1.5 p-6 pb-2 text-sm font-medium">
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

export default memo(EvaluationDetailPage);
