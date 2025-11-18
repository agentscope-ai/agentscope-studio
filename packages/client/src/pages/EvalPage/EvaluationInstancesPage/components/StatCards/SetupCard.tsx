import { memo } from 'react';

interface SetupCardProps {
    model: string;
    temperature: string;
    maxIterations: number;
    format: string;
    maxCost: string;
}

const SetupCard = ({
    model,
    temperature,
    maxIterations,
    format,
    maxCost,
}: SetupCardProps) => {
    return (
        <div className="sm:col-span-2 lg:col-span-2">
            <div className="rounded-xl border shadow">
                <div className="p-4 sm:p-6 flex flex-row items-center justify-between space-y-0 pb-1">
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
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide-icon lucide lucide-settings"
                        >
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </div>
                </div>

                <div className="p-4 sm:p-6 min-h-[5.5rem] pt-2">
                    <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="flex items-center justify-between col-span-2">
                                <span className="text-sm text-muted-foreground">
                                    Model
                                </span>
                                <span className="text-sm font-medium">
                                    {model}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Temperature
                                </span>
                                <span className="text-sm font-medium">
                                    {temperature}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Max Iterations
                                </span>
                                <span className="text-sm font-medium">
                                    {maxIterations}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Format
                                </span>
                                <span className="text-sm font-medium">
                                    {format}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Max Cost
                                </span>
                                <span className="text-sm font-medium">
                                    {maxCost}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(SetupCard);

