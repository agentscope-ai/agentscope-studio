import { memo } from 'react';
import { Timeline } from 'antd';
import type { TimelineItemProps } from 'antd';

interface ToolUseStep {
    type: 'tool_use';
    name: string;
    input: Record<string, unknown>;
    id: string;
}

interface TrajectoryProps {
    steps?: ToolUseStep[];
}

const Trajectory = ({ steps = [] }: TrajectoryProps) => {
    // Mock data based on user's example
    const mockSteps: ToolUseStep[] =
        steps.length > 0
            ? steps
            : [
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
                              '您已经成功在达美乐订购了一个超级至尊披萨，总金额为88.0元。同时，我也为您添加了一个提醒"今日花费"，内容是"今日花费 88.0 元"，提醒时间设定在2024年7月15日的上午9点30分。',
                      },
                  },
              ];

    const displaySteps = steps.length > 0 ? steps : mockSteps;

    // Create timeline items with start and end nodes
    const allTimelineItems: TimelineItemProps[] = [];

    // Start node
    allTimelineItems.push({
        dot: (
            <div className="flex items-center justify-center w-5 h-5 bg-background border-2 border-border rounded-full">
                <div className="relative min-w-[2rem] h-8 rounded-full border-2 flex items-center justify-center z-10 bg-white cursor-pointer transition-colors duration-150 border-blue-500 hover:border-blue-600 hover:bg-blue-50" />
            </div>
        ),
        label: (
            <div className="text-xs font-medium pr-1 pt-0.5 whitespace-nowrap text-gray-600 group-hover:text-gray-900 truncate">
                Start
            </div>
        ),
        children: (
            <div className="text-xs text-muted-foreground pt-0.5 pb-6">
                Start
            </div>
        ),
    });

    // Tool use steps
    displaySteps.forEach((step, index) => {
        const stepNumber = index + 1;

        allTimelineItems.push({
            dot: (
                <div className="flex items-center justify-center w-5 h-5 bg-background border-2 border-border rounded-full">
                    <div
                        className="relative min-w-[2rem] h-8 rounded-full border-2 flex items-center justify-center z-10 bg-white cursor-pointer transition-colors duration-150
                    border-green-500
                    hover:border-green-600 hover:bg-green-50"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgb(34 197 94 / var(--tw-text-opacity, 1))"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                    </div>
                </div>
            ),
            label: (
                <div className="text-xs font-medium pr-1 pt-0.5 whitespace-nowrap text-gray-600 group-hover:text-gray-900 truncate">
                    Step {stepNumber}
                </div>
            ),
            children: (
                <div className="px-2 pb-5 text-gray-500">
                    <div className="text-sm font-medium mb-1 flex">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            className="lucide-icon lucide lucide-bot w-3 h-3 shrink-0 mt-0.5"
                        >
                            <path d="M12 8V4H8"></path>
                            <rect
                                width="16"
                                height="12"
                                x="4"
                                y="8"
                                rx="2"
                            ></rect>
                            <path d="M2 14h2"></path>
                            <path d="M20 14h2"></path>
                            <path d="M15 13v2"></path>
                            <path d="M9 13v2"></path>
                        </svg>
                        <span className="text-xs ml-2">Assistant</span>
                    </div>
                    <div className="text-sm font-medium mb-1 flex">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            className="lucide-icon lucide lucide-terminal w-3 h-3 text-muted-foreground shrink-0 mt-0.5"
                        >
                            <polyline points="4 17 10 11 4 5"></polyline>
                            <line x1="12" x2="20" y1="19" y2="19"></line>
                        </svg>
                        <span className="text-xs ml-2 text-gray-800">
                            {step.name}
                        </span>
                    </div>
                    <div className="text-sm font-medium mb-1 flex">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            className="lucide-icon lucide lucide-folder w-3 h-3 text-muted-foreground shrink-0 mt-0.5"
                        >
                            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
                        </svg>
                        <span className="text-xs ml-2">
                            django/db/models/fields/__init__.py
                        </span>
                    </div>
                </div>
            ),
        });
    });

    // End node
    allTimelineItems.push({
        dot: (
            <div className="flex items-center justify-center w-5 h-5 bg-background border-2 border-border rounded-full">
                <div className="relative min-w-[2rem] h-8 rounded-full border-2 flex items-center justify-center z-10 bg-white cursor-pointer transition-colors duration-150 border-green-500 hover:border-green-600 hover:bg-green-50" />
            </div>
        ),
        label: (
            <div className="text-xs font-medium pr-1 pt-0.5 whitespace-nowrap text-gray-600 group-hover:text-gray-900 truncate">
                End
            </div>
        ),
        children: (
            <div className="text-xs text-muted-foreground pt-0.5">
                Successfully completed
            </div>
        ),
    });

    return (
        <div className="rounded-xl border shadow">
            <div className="p-5.5">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                    Trajectory
                </h3>
            </div>
            <div className="px-4 pb-4 mt-6">
                <Timeline
                    items={allTimelineItems}
                    mode="left"
                    style={{ marginLeft: '-55%' }}
                    className="-ml-[55%] [&_.ant-timeline-item]:pb-6 [&_.ant-timeline-item:last-child]:pb-0 [&_.ant-timeline-item-tail]:border-l-2 [&_.ant-timeline-item-tail]:border-border [&_.ant-timeline-item-label]:min-w-[80px] [&_.ant-timeline-item-label]:pr-4 [&_.ant-timeline-item-content]:pl-4 [&_.ant-timeline-item-content]:min-h-[24px]"
                />
            </div>
        </div>
    );
};

export default memo(Trajectory);
