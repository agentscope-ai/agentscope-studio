import { Key, memo, MouseEvent, useCallback, useEffect, useState } from 'react';

import LocalFilePicker from '@/components/picker/LocalFilePicker';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';
import AsTable from '@/components/tables/AsTable';
import { NumberCell, TextCell } from '@/components/tables/utils.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useEvaluationList } from '@/context/EvaluationListContext.tsx';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { EmptyPage } from '@/pages/DefaultPage';
import { formatDateTime } from '@/utils/common';
import { Evaluation } from '@shared/types/evaluation.ts';
import { Modal, TableColumnsType } from 'antd';
import { Trash2Icon, UploadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
                    text={formatDateTime(value)}
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

    const handleImport = useCallback(async () => {
        if (importDir === null) {
            messageApi.error(t('error.select-directory'));
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
                title={t('modal.title-import-evaluation')}
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

            <div className="flex-1 min-h-0 w-full">
                <AsTable<Evaluation>
                    searchType="evaluation"
                    locale={{
                        emptyText: (
                            <EmptyPage
                                size={100}
                                title={t('hint.empty-data')}
                            />
                        ),
                    }}
                    loading={tableLoading}
                    dataSource={tableDataSource}
                    onRow={(evaluation: Evaluation) => ({
                        onClick: (event: MouseEvent) => {
                            if (event.type === 'click') {
                                navigate(`/eval/${evaluation.id}`);
                            }
                        },
                        className: 'cursor-pointer',
                    })}
                    columns={columns}
                    showSorterTooltip={{ target: 'full-header' }}
                    rowKey="id"
                    total={total}
                    tableRequestParams={tableRequestParams}
                    setTableRequestParams={setTableRequestParams}
                    selectedRowKeys={selectedRowKeys}
                    setSelectedRowKeys={setSelectedRowKeys}
                    searchableColumns={['evaluationName', 'benchmarkName']}
                    actions={
                        <>
                            <Button
                                disabled={selectedRowKeys.length === 0}
                                variant="outline"
                                onClick={() =>
                                    handleDelete(selectedRowKeys as string[])
                                }
                            >
                                <Trash2Icon className="size-4" />
                                {t('action.delete')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setOpen(true)}
                            >
                                <UploadIcon className="size-4" />
                                {t('action.import')}
                            </Button>
                        </>
                    }
                />
            </div>
        </div>
    );
};

export default memo(OverviewPage);
