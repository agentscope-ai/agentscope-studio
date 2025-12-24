import { memo, ReactNode } from 'react';

interface BaseStatCardProps {
    title: string;
    icon: ReactNode;
}

interface StatusCardProps extends BaseStatCardProps {
    type: 'status';
    status: string;
    statusColor?: 'red' | 'green' | 'yellow' | 'blue';
    resolutionRate?: string;
}

interface TokenUsageCardProps extends BaseStatCardProps {
    type: 'tokenUsage';
    totalUsage: string;
    promptUsage: string;
    promptUsageParentheses?: string;
    completionUsage: string;
}

interface CostCardProps extends BaseStatCardProps {
    type: 'cost';
    totalCost: string;
}

type StatCardProps = StatusCardProps | TokenUsageCardProps | CostCardProps;

const StatCard = (props: StatCardProps) => {
    const { title, icon } = props;

    const statusDotColor = (
        color: 'red' | 'green' | 'yellow' | 'blue' = 'red',
    ) => {
        const colors = {
            red: 'bg-red-500',
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            blue: 'bg-blue-500',
        };
        return colors[color];
    };

    const renderContent = () => {
        switch (props.type) {
            case 'status':
                return (
                    <>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div
                                className={`w-2.5 h-2.5 rounded-full ${statusDotColor(
                                    props.statusColor,
                                )}`}
                            />
                            <span className="text-2xl font-bold">
                                {props.status}
                            </span>
                        </div>
                        {props.resolutionRate && (
                            <div className="text-[14px] text-muted-foreground">
                                Resolution Rate: {props.resolutionRate}
                            </div>
                        )}
                    </>
                );

            case 'tokenUsage':
                return (
                    <>
                        <div className="text-2xl font-bold mb-1.5">
                            {props.totalUsage}
                        </div>
                        <div className="flex justify-between  gap-1">
                            <div className="text-left gap-1.5">
                                <div className="text-sm w-20 text-muted-foreground">
                                    Prompt
                                </div>
                                <div className="text-xs font-medium mt-0.5">
                                    <span className="text-[14px]">
                                        {props.promptUsage}
                                    </span>
                                    {props.promptUsageParentheses && (
                                        <span className="text-[12px] text-muted-foreground">
                                            ({props.promptUsageParentheses})
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right gap-1.5">
                                <div className="text-sm w-20 text-muted-foreground">
                                    Completion
                                </div>
                                <div className="text-[14px] font-medium mt-0.5">
                                    {props.completionUsage}
                                </div>
                            </div>
                        </div>
                    </>
                );

            case 'cost':
                return (
                    <div className="text-2xl font-bold">{props.totalCost}</div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="rounded-xl border shadow p-3">
            <div className="px-4 py-2.5 flex flex-row items-center justify-between">
                <h3 className="tracking-tight text-[14px] font-medium truncate font-weight-bold">
                    {title}
                </h3>
                <div className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0">
                    {icon}
                </div>
            </div>

            <div className="px-4 pb-3.5">{renderContent()}</div>
        </div>
    );
};

export default memo(StatCard);
