import AsTable from '@/components/tables/AsTable';
import { TagsCell, TextCell } from '@/components/tables/utils.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group.tsx';
import { useEvaluationContext } from '@/context/EvaluationContext.tsx';
import {
    EvaluationTasksContextProvider,
    useEvaluationTasksContext,
} from '@/context/EvaluationTasksContext.tsx';
import { EmptyPage } from '@/pages/DefaultPage/index.tsx';
import { ModelCard, ToolCard } from '@/pages/EvalPage/EvaluationPage/DataCard';
import { formatDateTime, formatNumber } from '@/utils/common';
import { ArrayFilterOperator } from '@shared/types';
import { EvalTaskMeta } from '@shared/types/evaluation.ts';
import { TableColumnsType } from 'antd';
import {
    ActivityIcon,
    CirclePlusIcon,
    CpuIcon,
    DollarSignIcon,
    SearchIcon,
    SettingsIcon,
} from 'lucide-react';
import { Key, memo, MouseEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MetricView from './MetricView';
import { convertToDTO } from './utils.ts';
const TasksTable = memo(({ evaluationId }: { evaluationId: string }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const {
        tableDataSource,
        tableLoading,
        tableRequestParams,
        setTableRequestParams,
        total,
        tags,
    } = useEvaluationTasksContext();
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

    const columns: TableColumnsType<EvalTaskMeta> = useMemo(
        () => [
            {
                key: 'id',
                render: (value: string) => (
                    <TextCell text={value || ''} selected={false} />
                ),
            },
            {
                key: 'input',
                render: (value: string) => (
                    <TextCell
                        text={value || ''}
                        selected={false}
                        className="max-w-[200px]"
                    />
                ),
            },
            {
                key: 'metrics',
                render: (value: string[]) => (
                    <TextCell
                        text={value.length.toString() || '0'}
                        selected={false}
                    />
                ),
            },
            {
                key: 'tags',
                render: (value: string[]) => (
                    <TagsCell tags={value} selected={false} />
                ),
            },
        ],
        [t],
    );

    const handleTagFilterChange = (tag: string) => {
        setTableRequestParams((prev) => {
            if (
                (
                    (tableRequestParams.filters?.tags?.value as string[]) || []
                ).includes(tag)
            ) {
                // Our target is to remove the tag from the filter

                if (
                    prev.filters &&
                    prev.filters['tags'] &&
                    prev.filters['tags'].operator === ArrayFilterOperator.IN
                ) {
                    // If the tag filter exists, remove the tag from the filter
                    const newTags = prev.filters['tags'].value.filter(
                        (thisTag) => thisTag !== tag,
                    );

                    if (newTags.length === 0) {
                        // Remove the entire tags filter
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { tags, ...restFilters } = prev.filters;
                        return {
                            ...prev,
                            pagination: {
                                ...prev.pagination,
                                page: 1,
                            },
                            filters: restFilters || undefined,
                        };
                    } else {
                        // Update the tags filter with the new tags
                        return {
                            ...prev,
                            pagination: {
                                ...prev.pagination,
                                page: 1,
                            },
                            filters: {
                                ...prev.filters,
                                tags: {
                                    operator: ArrayFilterOperator.IN,
                                    value: newTags,
                                },
                            },
                        };
                    }
                }

                // Update: No tag filter exists, nothing to remove
                const lastTags = tags
                    .map((tagRecord) => tagRecord.tag)
                    .filter((t) => t !== tag);
                return {
                    ...prev,
                    pagination: {
                        ...prev.pagination,
                        page: 1,
                    },
                    filters: {
                        ...prev.filters,
                        tags: {
                            operator: ArrayFilterOperator.IN,
                            value: lastTags,
                        },
                    },
                };
            }

            // Our target is to add the tag to the filter
            const prevTagsValues =
                (prev.filters?.tags?.value as string[]) || [];
            return {
                ...prev,
                pagination: {
                    ...prev.pagination,
                    page: 1,
                },
                filters: {
                    tags: {
                        operator: ArrayFilterOperator.IN,
                        value: [...prevTagsValues, tag],
                    },
                },
            };
        });
    };

    return (
        <div className="block pb-8">
            <div className="rounded-xl border shadow">
                <div className="flex flex-row items-center justify-between space-y-1.5 p-6 pb-2 text-sm font-medium">
                    {t('common.task')}
                </div>
                <div className="flex flex-col gap-3 p-6">
                    <AsTable<EvalTaskMeta>
                        columns={columns}
                        searchableColumns={['id', 'input']}
                        searchType="evaluation-task"
                        loading={tableLoading}
                        dataSource={tableDataSource}
                        rowKey="id"
                        onRow={(record: EvalTaskMeta) => {
                            return {
                                onClick: (event: MouseEvent) => {
                                    if (event.type === 'click') {
                                        navigate(
                                            `/eval/${evaluationId}/${record.id}`,
                                        );
                                    }
                                },
                                style: {
                                    cursor: 'pointer',
                                },
                            };
                        }}
                        tableRequestParams={tableRequestParams}
                        setTableRequestParams={setTableRequestParams}
                        total={total}
                        selectedRowKeys={selectedRowKeys}
                        setSelectedRowKeys={setSelectedRowKeys}
                        actions={
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-dashed"
                                    >
                                        <CirclePlusIcon className="size-4" />
                                        {t('table.column.tags')}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="p-0">
                                            <InputGroup className="h-8 border-none shadow-none focus:border-none! focus-within:!border-0 focus-within:!ring-0 focus-within:!shadow-none has-[*:focus-visible]:!border-0 has-[*:focus-visible]:!ring-0">
                                                <InputGroupInput
                                                    placeholder={t(
                                                        'table.column.tags',
                                                    )}
                                                />
                                                <InputGroupAddon>
                                                    <SearchIcon className="size-4" />
                                                </InputGroupAddon>
                                            </InputGroup>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {tags.map((tagRecord) => (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleTagFilterChange(
                                                        tagRecord.tag,
                                                    )
                                                }
                                            >
                                                <Checkbox
                                                    // checked={isChecked(tagRecord.tag, tableRequestParams)}
                                                    checked={(
                                                        (tableRequestParams
                                                            .filters?.tags
                                                            ?.value as string[]) ||
                                                        []
                                                    ).includes(tagRecord.tag)}
                                                    className="flex items-center justify-center rounded-[4px] size-[14px] [&_svg]:stroke-primary-foreground"
                                                />
                                                <TagsCell
                                                    tags={[tagRecord.tag]}
                                                />
                                                <DropdownMenuShortcut className="tracking-tight">
                                                    {tagRecord.cnt}
                                                </DropdownMenuShortcut>
                                            </DropdownMenuItem>
                                        ))}
                                        {tags.length === 0 ? (
                                            <EmptyPage title="" size={80} />
                                        ) : null}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        }
                    />
                </div>
            </div>
        </div>
    );
});

const EvaluationPage = () => {
    const { t } = useTranslation();

    const { evaluationId, evaluation, evalResult } = useEvaluationContext();
    const evaluationDTO = convertToDTO(evalResult);

    return (
        <div className="flex-1 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 h-full">
                <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-xl">
                        {evaluation.evaluationName}
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                        {t('description.eval.benchmark-subtitle', {
                            benchmarkName: evaluation.benchmarkName,
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                        <div className="rounded-xl border shadow">
                            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                                <h3 className="tracking-tight text-sm font-medium">
                                    {t('common.evaluation')}
                                </h3>
                                <SettingsIcon className="size-4 text-muted-foreground" />
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
                                                {formatDateTime(
                                                    evaluation.createdAt,
                                                )}
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
                            <ActivityIcon className="size-4 text-muted-foreground" />
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold flex gap-2">
                                {formatNumber(evaluation.benchmarkTotalTasks)}
                                <div className="text-sm font-medium flex items-end mb-1">
                                    × {formatNumber(evaluation.totalRepeats)}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        {t('table.column.completed')}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatNumber(
                                            evaluationDTO?.nCompletedTask,
                                        )}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        {t('table.column.incomplete')}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatNumber(
                                            evaluationDTO?.nIncompleteTask,
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-1">
                            <h3 className="tracking-tight text-sm font-medium">
                                {t('common.metric')}
                            </h3>
                            <DollarSignIcon className="size-4 text-muted-foreground" />
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold">
                                {formatNumber(evaluationDTO?.nMetric)}
                            </div>
                            <div className="flex flex-col mt-2">
                                <span className="text-muted-foreground text-xs">
                                    {t('common.numerical')}/
                                    {t('common.categorical')}
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
                            <CpuIcon className="size-4 text-muted-foreground" />
                        </div>

                        <div className="p-6 min-h-[5.5rem] pt-2">
                            <div className="text-2xl font-bold">
                                {formatNumber(
                                    evaluationDTO
                                        ? evaluationDTO.nPromptTokens +
                                              evaluationDTO.nCompletionTokens
                                        : 'N/A',
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">
                                        {t('common.prompt')}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatNumber(
                                            evaluationDTO?.nPromptTokens,
                                        )}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground text-xs">
                                        {t('common.completion')}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatNumber(
                                            evaluationDTO?.nCompletionTokens,
                                        )}
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
                    <MetricView
                        metrics={evaluationDTO ? evaluationDTO.metrics : {}}
                    />
                </div>

                <EvaluationTasksContextProvider evaluationId={evaluationId}>
                    <TasksTable evaluationId={evaluationId} />
                </EvaluationTasksContextProvider>
            </div>
        </div>
    );
};

export default memo(EvaluationPage);
