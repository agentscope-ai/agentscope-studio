import { Key, memo, MouseEvent, useCallback, useEffect, useState } from 'react';

import { useEvaluationList } from '@/context/EvaluationListContext.tsx';
import { Evaluation } from '@shared/types/evaluation.ts';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';
import { Modal, TableColumnsType } from 'antd';
import AsTable from '@/components/tables/AsTable';
import { EmptyPage } from '@/pages/DefaultPage';
import { useTranslation } from 'react-i18next';
import { Trash2Icon } from 'lucide-react';
import { NumberCell, TextCell } from '@/components/tables/utils.tsx';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import LocalFilePicker from '@/components/picker/LocalFilePicker';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { Input } from '@/components/ui/input.tsx';

const OverviewPage = () => {
    const {
        tableDataSource,
        tableLoading,
        total,
        tableRequestParams,
        setTableRequestParams,
        deleteEvaluations,
        importEvaluation,
    } = useEvaluationList();
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState<string>('');
    const navigate = useNavigate();
    const [open, setOpen] = useState<boolean>(false);
    const [importDir, setImportDir] = useState<string | null>(null);
    const [importing, setImporting] = useState<boolean>(false);
    const { messageApi } = useMessageApi();

    // Update selected evaluations when table data source changes
    useEffect(() => {
        setSelectedRowKeys((prev) => {
            // If the current benchmarks don't include the selected one
            const existingEvaluationIds = tableDataSource.map(
                (evaluation) => evaluation.id,
            );
            return prev.filter((evaluationId) =>
                existingEvaluationIds.includes(evaluationId.toString()),
            );
        });
    }, [tableDataSource]);

    const columns: TableColumnsType<Evaluation> = [
        {
            title: t('common.name'),
            key: 'evaluationName',
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'benchmarkName',
            render: (value, record) => (
                // TODO: tooltip with description
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'createdAt',
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'totalRepeats',
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'evaluationDir',
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
    ];

    const handlePaginationChange = (
        page: number,
        pageSize: number,
        sortField: string | undefined,
        sortOrder: 'asc' | 'desc' | undefined,
    ) => {
        setTableRequestParams((prevParams) => {
            const newParams = {
                ...prevParams,
                pagination: {
                    page,
                    pageSize,
                },
            };
            if (sortField && sortOrder) {
                return {
                    ...newParams,
                    sort: {
                        field: sortField,
                        order: sortOrder,
                    },
                };
            }
            return newParams;
        });
    };

    const handleImport = useCallback(async () => {
        if (importDir === null) {
            messageApi.error('Please select a directory first');
        } else {
            setImporting(true);
            importEvaluation(importDir)
                .then((success) => {
                    if (success) {
                        setOpen(false);
                    }
                })
                .catch((error) => messageApi.error(`Error: ${error.message}`))
                .finally(() => {
                    setImporting(false);
                });
        }
    }, [importDir]);

    const handleDelete = async (evaluationIds: string[]) => {
        deleteEvaluations(evaluationIds);
        setSelectedRowKeys([]);
    };

    return (
        <div className="flex flex-col w-full h-full py-8 px-12 gap-4">
            <Modal
                className="h-[calc(100vh-200px)]"
                classNames={{
                    content: 'max-h-[calc(100vh-200px)] overflow-hidden',
                    body: 'max-h-[calc(100vh-40px-200px-76px)] h-[calc(100vh-40px-200px-76px)]',
                }}
                title="Select a directory to import evaluation"
                open={open}
                onOk={handleImport}
                loading={importing}
                onCancel={() => setOpen(false)}
            >
                <LocalFilePicker type="directory" onSelect={setImportDir} />
            </Modal>

            <PageTitleSpan
                title={t('common.evaluation')}
                description={t('description.eval.title')}
            />

            <div className="flex flex-col flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                    <Input
                        className="w-full sm:max-w-[300px]"
                        value={searchText}
                        onChange={(event) => {
                            setSearchText(event.target.value);
                        }}
                        placeholder={t('placeholder.search-evaluation')}
                    />

                    <Button
                        disabled={selectedRowKeys.length === 0}
                        variant="outline"
                        onClick={() =>
                            handleDelete(selectedRowKeys as string[])
                        }
                    >
                        <Trash2Icon className="size-3.5" />
                        {t('action.delete')}
                    </Button>

                    <Button variant="default" onClick={() => setOpen(true)}>
                        {/*<PlusIcon className="size-3.5"/>*/}
                        {t('action.import-evaluation')}
                    </Button>
                </div>

                <div className="flex-1">
                    <AsTable<Evaluation>
                        locale={{
                            emptyText: (
                                <EmptyPage
                                    size={100}
                                    title="No evaluation histories"
                                />
                            ),
                        }}
                        loading={tableLoading}
                        dataSource={tableDataSource}
                        onChange={(pagination, _filters, sorter) => {
                            const page = pagination.current || 1;
                            const pageSize = pagination.pageSize || 50;

                            // Handle sorter - it can be an array or a single object
                            const actualSorter = Array.isArray(sorter)
                                ? sorter[0]
                                : sorter;
                            const sortField = actualSorter?.field as
                                | string
                                | undefined;
                            const sortOrder = actualSorter?.order
                                ? actualSorter.order === 'ascend'
                                    ? 'asc'
                                    : 'desc'
                                : undefined;

                            handlePaginationChange(
                                page,
                                pageSize,
                                sortField,
                                sortOrder,
                            );
                        }}
                        onRow={(evaluation: Evaluation) => {
                            return {
                                onClick: (event: MouseEvent) => {
                                    if (event.type === 'click') {
                                        navigate(`/eval/${evaluation.id}`);
                                    }
                                },
                                style: {
                                    cursor: 'pointer',
                                },
                            };
                        }}
                        columns={columns}
                        showSorterTooltip={{ target: 'full-header' }}
                        rowKey="id"
                        total={total}
                        tableRequestParams={tableRequestParams}
                        setTableRequestParams={setTableRequestParams}
                        selectedRowKeys={selectedRowKeys}
                        setSelectedRowKeys={setSelectedRowKeys}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(OverviewPage);
