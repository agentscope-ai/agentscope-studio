import { memo } from 'react';

import { useEvaluationRoom } from '@/context/EvaluationRoomContext.tsx';
import { EmptyPage } from '@/pages/DefaultPage';
import StatCard from './components/StatCard';
import Trajectory from './components/Trajectory';

const EvaluationInstancesDetailPage = () => {
    const { evaluationData } = useEvaluationRoom();

    const trajectoryData: Array<any> = [
        {
            type: 'tool_use',
            name: 'login_food_platform',
            input: {
                username: 'Eve',
                password: 'password123',
            },
            id: 'call_0a4d76575b934c6dbdc620',
        },
        {
            type: 'tool_use',
            name: 'get_products',
            input: {
                merchant_name: '达美乐',
            },
            id: 'call_68f10e6846644d2086a4a5',
        },
        {
            type: 'tool_use',
            name: 'add_food_delivery_order',
            input: {
                username: 'Eve',
                merchant_name: '达美乐',
                items: [
                    {
                        product: '超级至尊披萨',
                        quantity: 1,
                    },
                ],
            },
            id: 'call_557bb09af3e54072a51714',
        },
        {
            type: 'tool_use',
            name: 'add_reminder',
            input: {
                title: '今日花费',
                description: '今日花费 88.0 元',
                time: '2024-07-15 09:30',
            },
            id: 'call_5200cdd4be924a66b6be41',
        },
        {
            id: 'fS5t2pyHre5PmTcCe5zkZs',
            type: 'tool_use',
            name: 'generate_response',
            input: {
                response:
                    '您已经成功在达美乐订购了一个超级至尊披萨，总金额为88.0元。同时，我也为您添加了一个提醒“今日花费”，内容是“今日花费 88.0 元”，提醒时间设定在2024年7月15日的上午9点30分。',
            },
        },
    ];

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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <StatCard
                        type="status"
                        title="Status"
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
                        status="Failed"
                        statusColor="red"
                        resolutionRate="1.3%"
                    />
                    <StatCard
                        type="tokenUsage"
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
                        totalUsage="52.5K"
                        promptUsage="47.7K"
                        promptUsageParentheses="125.5K"
                        completionUsage="4.9K"
                    />
                    <StatCard
                        type="cost"
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
                        totalCost="$0.22"
                    />
                </div>

                <Trajectory />
            </div>
        </div>
    );
};

export default memo(EvaluationInstancesDetailPage);
