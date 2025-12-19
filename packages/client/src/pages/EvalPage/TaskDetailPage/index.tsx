import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ChatPage from './ChartPage';
import EvaluationInstancesDetailPage from '../EvaluationInstancesDetailPage';

import { EvaluationRoomContextProvider } from '@/context/EvaluationRoomContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const TaskDetailPage = () => {
    const { t } = useTranslation();
    const [selectedTab, setSelectedTab] = useState('Overview');

    const ToggleGroupItemOptions: { value: string; label: string }[] = [
        { value: 'Overview', label: 'Overview' },
        { value: 'Repeat-1', label: 'Repeat-1' },
        { value: 'Repeat-2', label: 'Repeat-2' },
        { value: 'Repeat-3', label: 'Repeat-3' },
    ];

    return (
        <div className="flex-1 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 h-full">
                <div className="text-muted-foreground mb-2">
                    Back to evaluation
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className="truncate font-bold text-xl">
                        Task xggwgeg_1
                    </div>
                    <div className="truncate text-sm text-muted-foreground mb-3">
                        Evaluation:
                        20250111_deepseek_chat_v3_temp_0_0_iter_20_fmt_react_hist_react
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <div className="rounded-xl border shadow">
                            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                                <h3 className="tracking-tight text-sm font-medium">
                                    {t('common.status')}
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
                            <div className="p-6 min-h-[5.5rem] pt-2 space-y-4">
                                <div>Unkown</div>
                                <div>progress: 12%</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-full rounded-xl border shadow">
                        <div className="p-6 flex flex-col justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                Input
                            </h3>
                        </div>
                        <div className="p-6 min-h-[5.5rem] pt-2 space-y-4"></div>
                    </div>

                    <div className="col-span-full rounded-xl border shadow">
                        <div className="p-6 flex flex-col justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                Ground Truth
                            </h3>
                        </div>
                        <div className="p-6 min-h-[5.5rem] pt-2 space-y-4"></div>
                    </div>

                    <ToggleGroup
                        type="single"
                        defaultValue="Overview"
                        className="col-span-full w-full justify-start"
                        variant="outline"
                        onValueChange={(value) => setSelectedTab(value)}
                    >
                        {ToggleGroupItemOptions?.map((option) => (
                            <ToggleGroupItem
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    {['Overview'].includes(selectedTab) && (
                        <div className="col-span-full">
                            <EvaluationRoomContextProvider>
                                <ChatPage />
                            </EvaluationRoomContextProvider>
                        </div>
                    )}
                    {['Repeat-1', 'Repeat-2', 'Repeat-3'].includes(
                        selectedTab,
                    ) && (
                        <div className="col-span-full">
                            <EvaluationRoomContextProvider>
                                <EvaluationInstancesDetailPage />
                            </EvaluationRoomContextProvider>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(TaskDetailPage);
