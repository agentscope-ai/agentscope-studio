import { memo } from 'react';

import { useEvaluationRoom } from '@/context/EvaluationRoomContext.tsx';
import { EmptyPage } from '@/pages/DefaultPage';
import SetupCard from './components/StatCards/SetupCard';
import StatCard from './components/StatCards/StatCard';
import StatusPieChart from './components/StatusPieChart';
import FlagsBarChart from './components/FlagsBarChart';
import InstancesTable from './components/InstancesTable';

const EvaluationInstancesPage = () => {
    const { evaluationData } = useEvaluationRoom();

    if (evaluationData === null) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 items-center h-full">
                <EmptyPage
                    size={200}
                    title="No data for the given evaluation ID"
                />
            </div>
        );
    }

    return (
        <div className="flex-1 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 h-full">
                <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-lg sm:text-xl truncate">
                        claude-3-5-sonnet-20241022
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-3 break-words">
                        20250113_claude_3_5_sonnet_20241022_temp_0_0_iter_20_fmt_tool_call_hist_messages_lite
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    <SetupCard
                        model="claude-3-5-sonnet-20241022"
                        temperature="N/A"
                        maxIterations={20}
                        format="tool_call"
                        maxCost="$1.00"
                    />
                    <StatCard
                        title="% Resolved"
                        icon={
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
                                className="lucide-icon lucide lucide-activity"
                            >
                                <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
                            </svg>
                        }
                        mainValue="39.0%"
                        leftLabel="Resolved"
                        leftValue="512"
                        rightLabel="Total"
                        rightValue="100"
                    />
                    <StatCard
                        title="Cost"
                        icon={
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
                                className="lucide-icon lucide lucide-dollar-sign"
                            >
                                <line x1="12" x2="12" y1="2" y2="22"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        }
                        mainValue="$42.60"
                        mainValueClassName=""
                        leftLabel="$/Instance"
                        leftValue="$0.14"
                        rightLabel="Resolved/$"
                        rightValue="6.54"
                    />
                    <StatCard
                        title="Token Usage"
                        icon={
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
                        }
                        mainValue="11.4M"
                        mainValueClassName=""
                        leftLabel="Prompt"
                        leftValue={
                            <>
                                <span className="text-sm font-medium">
                                    5.9M
                                </span>
                                <span className="text-xs text-muted-foreground/75">
                                    (4.5M)
                                </span>
                            </>
                        }
                        rightLabel="Completion"
                        rightValue="1.1M"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <StatusPieChart
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
                    />
                    <FlagsBarChart
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
                    />
                </div>

                <InstancesTable data={[]} />
            </div>
        </div>
    );
};

export default memo(EvaluationInstancesPage);
