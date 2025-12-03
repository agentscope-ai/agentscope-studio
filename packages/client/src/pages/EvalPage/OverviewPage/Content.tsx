import { Key, memo, MouseEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';

import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';
import AsTable from '@/components/tables/AsTable';
import DeleteIcon from '@/assets/svgs/delete.svg?react';
import CompareIcon from '@/assets/svgs/compare.svg?react';

import { EvaluationMetaData } from '@shared/types';
import { EmptyPage } from '@/pages/DefaultPage';
import { SecondaryButton } from '@/components/buttons/ASButton';
import { useEvaluationListRoom } from '@/context/EvaluationListRoomContext.tsx';
import {
    DurationCell,
    NumberCell,
    ProgressCell,
    StatusCell,
    TextCell,
} from '@/components/tables/utils.tsx';

const Context = () => {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState<string>('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const navigate = useNavigate();
    const { loading, evaluationListData } = useEvaluationListRoom();

    const columns: TableColumnsType<EvaluationMetaData> = [
        {
            key: 'id',
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'name',
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'status',
            render: (value, record) => (
                <StatusCell
                    status={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'progress',
            render: (value, record) => (
                <ProgressCell
                    progress={value}
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
            key: 'time',
            render: (value, record) => (
                <DurationCell
                    number={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
        {
            key: 'repeat',
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.id)}
                />
            ),
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    return (
        <div className="flex flex-col flex-1 space-y-6 p-8 pl-12 pr-12">
            <PageTitleSpan title={t('common.evaluation-history')} />

            <div className="flex flex-col flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                    <Input
                        className="w-full sm:max-w-[300px]"
                        value={searchText}
                        onChange={(event) => {
                            setSearchText(event.target.value);
                        }}
                        variant="filled"
                        placeholder={t('placeholder.search-evaluation')}
                    />

                    <SecondaryButton
                        tooltip={t('tooltip.button.compare-evaluation')}
                        icon={<CompareIcon width={12} height={12} />}
                        variant="dashed"
                        disabled={selectedRowKeys.length !== 2}
                        onClick={() => {}}
                    >
                        {t('action.compare')}
                    </SecondaryButton>

                    <SecondaryButton
                        tooltip={
                            selectedRowKeys.length === 0
                                ? t(
                                      'tooltip.button.delete-selected-projects-disable',
                                  )
                                : t('tooltip.button.delete-selected-projects', {
                                      number: selectedRowKeys.length,
                                  })
                        }
                        icon={<DeleteIcon width={13} height={13} />}
                        disabled={selectedRowKeys.length === 0}
                        variant="dashed"
                        onClick={() => {}}
                    >
                        {t('action.delete')}
                    </SecondaryButton>
                </div>

                <div className="flex-1">
                    <AsTable<EvaluationMetaData>
                        locale={{
                            emptyText: (
                                <EmptyPage
                                    size={100}
                                    title="No evaluation histories"
                                />
                            ),
                        }}
                        dataSource={evaluationListData}
                        loading={loading}
                        onRow={(record: EvaluationMetaData) => {
                            return {
                                onClick: (event: MouseEvent) => {
                                    if (event.type === 'click') {
                                        navigate(`/eval/${record.id}`);
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
                        rowSelection={rowSelection}
                        pagination={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(Context);
