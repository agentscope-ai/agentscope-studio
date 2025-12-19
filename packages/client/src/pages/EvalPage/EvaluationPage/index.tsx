import { memo, MouseEvent, useState } from 'react';
import AsTable from '@/components/tables/AsTable';
import { NumberCell, TextCell } from '@/components/tables/utils.tsx';
import { useNavigate } from 'react-router-dom';
import NumericalView from './MetricView/NumericalView.tsx';
import { convertToDTO, EvaluationDTO } from './utils.ts';
import { TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import { ModelCard, ToolCard } from '@/pages/EvalPage/EvaluationPage/DataCard';
import { useEvaluationContext } from '@/context/EvaluationContext.tsx';
import { EvalTaskMeta } from '@shared/types/evaluation.ts';


const EvaluationPage = () => {
    const { t } = useTranslation();

    const {
        evaluation,
        evalResult,
        tableDataSource,
        tableLoading,
        tableRequestParams,
        setTableRequestParams,
        total,
    } = useEvaluationContext();
    const evaluationDTO = convertToDTO(evalResult);
    const navigate = useNavigate();

    const columns: TableColumnsType<EvalTaskMeta> = [
        {
            key: 'id',
            title: 'Task ID',
            render: (value) => <TextCell text={value} selected={false} />,
        },
        {
            key: 'input',
            render: (value) => <TextCell text={value} selected={false} />,
        },
        {
            key: 'metrics',
            render: (value) => <NumberCell number={value} selected={false} />,
        },
        {
            key: 'tags',
        },
    ];

    return (
        <div className="flex-1 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 h-full">
                <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-xl">
                        {evaluation.evaluationName}
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                        Evaluation on Benchmark {evaluation.benchmarkName}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                        <div className="rounded-xl border shadow">
                            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                                <h3 className="tracking-tight text-sm font-medium">
                                    {t('common.evaluation')}
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

                            <div className="p-6 min-h-[5.5rem] pt-2">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between col-span-2">
                                            <span className="text-sm text-muted-foreground">
                                                {t('common.name')}
                                            </span>
                                            <span className="text-sm font-medium truncate">
                                                {evaluation.evaluationName}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between col-span-2">
                                            <span className="text-sm text-muted-foreground">
                                                {t('table.column.createdAt')}
                                            </span>
                                            <span className="text-sm font-medium truncate">
                                                {evaluation.createdAt}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                %{t('common.repeat')}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {evaluation.totalRepeats}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                {t('table.column.progress')}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {evaluationDTO
                                                    ? `${evaluationDTO.progress}%`
                                                    : null}
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
                                {t('common.task')}
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
                                    className="lucide-icon lucide lucide-activity"
                                >
                                    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold flex gap-2">
                                {evaluation.benchmarkTotalTasks}
                                <div className="text-sm font-medium flex items-end mb-1">
                                    × {evaluation.totalRepeats}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        Finished
                                    </span>
                                    <span className="text-sm font-medium">
                                        {evaluationDTO?.nCompletedTask}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        Incomplete
                                    </span>
                                    <span className="text-sm font-medium">
                                        {evaluationDTO?.nIncompleteTask}
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
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide-icon lucide lucide-dollar-sign"
                                >
                                    <line x1="12" x2="12" y1="2" y2="22"></line>

                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold">
                                {evaluationDTO?.nMetric}
                            </div>
                            <div className="flex flex-col mt-2">
                                <span className="text-muted-foreground text-xs">
                                    Numerical/Categorical
                                </span>
                                <span className="text-sm font-medium">
                                    {evaluationDTO?.nNumericalMetric}/
                                    {evaluationDTO?.nCategoricalMetric}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                {t('common.token-usage')}
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
                            <div className="text-2xl font-bold">
                                {evaluationDTO
                                    ? evaluationDTO.nPromptTokens +
                                      evaluationDTO.nCompletionTokens
                                    : 'N/A'}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        {t('common.prompt')}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {evaluationDTO?.nPromptTokens}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        {t('common.completion')}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {evaluationDTO?.nCompletionTokens}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ModelCard models={evaluationDTO?.llm ?? {}} />
                    <ToolCard tools={evaluationDTO?.tool ?? {}} />
                </div>

                <div className="hidden sm:block">
                    <NumericalView
                        metrics={evaluationDTO ? evaluationDTO.metrics : {}}
                    />
                </div>

                <div className="block">
                    <div className="rounded-xl border shadow">
                        <div className="flex flex-ro items-center justify-between space-y-1.5 p-6 pb-2 text-sm font-medium">
                            Tasks
                        </div>
                        <div className="p-6">
                            <AsTable<EvalTaskMeta>
                                columns={columns}
                                loading={tableLoading}
                                dataSource={tableDataSource}
                                onRow={(record: EvalTaskMeta) => {
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
                                pagination={{
                                    size: 'default',
                                    current: tableRequestParams.pagination.page,
                                    pageSize:
                                        tableRequestParams.pagination.pageSize,
                                    total: total,
                                    showSizeChanger: true,
                                    showTotal: (total: number) =>
                                        t('table.pagination.total', { total }),
                                    pageSizeOptions: ['10', '20', '50', '100'],
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(EvaluationPage);
