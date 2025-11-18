import { memo, ReactNode } from 'react';

interface StatCardProps {
    title: string;
    icon: ReactNode;
    mainValue: string | ReactNode;
    leftLabel: string;
    leftValue: string | ReactNode;
    rightLabel: string;
    rightValue: string | ReactNode;
    mainValueClassName?: string;
}

const StatCard = ({
    title,
    icon,
    mainValue,
    leftLabel,
    leftValue,
    rightLabel,
    rightValue,
    mainValueClassName = '',
}: StatCardProps) => {
    return (
        <div className="rounded-xl border shadow">
            <div className="p-4 sm:p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                <h3 className="tracking-tight text-xs sm:text-sm font-medium truncate">
                    {title}
                </h3>
                <div className="text-muted-foreground h-4 w-4 flex-shrink-0">
                    {icon}
                </div>
            </div>

            <div className="p-4 sm:p-6 min-h-[5.5rem] pt-2">
                <div
                    className={`text-xl sm:text-2xl font-bold ${
                        mainValueClassName
                            ? mainValueClassName
                            : 'flex items-center gap-2'
                    }`}
                >
                    {mainValue}
                </div>
                <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">
                            {leftLabel}
                        </span>
                        {typeof leftValue === 'string' ? (
                            <span className="text-sm font-medium">
                                {leftValue}
                            </span>
                        ) : (
                            <div className="flex items-baseline gap-0.5">
                                {leftValue}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-muted-foreground text-xs">
                            {rightLabel}
                        </span>
                        {typeof rightValue === 'string' ? (
                            <span className="text-sm font-medium">
                                {rightValue}
                            </span>
                        ) : (
                            rightValue
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(StatCard);

