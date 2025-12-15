import { Key, memo, MouseEvent, useEffect, useState, useMemo } from 'react';
import { Input, TableColumnsType, Table, Pagination } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';

import DeleteIcon from '@/assets/svgs/delete.svg?react';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';

import type { ProjectData } from '@shared/types';
import { SecondaryButton } from '@/components/buttons/ASButton';
import {
    NumberCell,
    renderTitle,
    renderSortIcon,
    TextCell,
} from '@/components/tables/utils.tsx';
import { useProjectListRoom } from '@/context/ProjectListRoomContext.tsx';

const ProjectPage = () => {
    const {
        deleteProjects,
        searchText,
        setSearchText,
        tableDataSource,
        tableLoading,
        pagination,
        onTableChange,
    } = useProjectListRoom();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [localSearchText, setLocalSearchText] = useState<string>(searchText);

    // Sync searchText from context to local state
    useEffect(() => {
        setLocalSearchText(searchText);
    }, [searchText]);

    // Debounced function to update search text in context
    const debouncedSetSearchText = useMemo(
        () =>
            debounce((value: string) => {
                setSearchText(value);
            }, 300),
        [setSearchText],
    );

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    useEffect(() => {
        const existedProjects = tableDataSource.map((proj) => proj.project);
        setSelectedRowKeys((prevRowKeys) =>
            prevRowKeys.filter((project) =>
                existedProjects.includes(project as string),
            ),
        );
    }, [tableDataSource]);

    const columns: TableColumnsType<ProjectData> = [
        {
            title: renderTitle(t('common.project'), 14),
            key: 'project',
            dataIndex: 'project',
            width: '40%',
            sorter: true,
            sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            title: 'createdAt',
            key: 'createdAt',
            dataIndex: 'createdAt',
            width: '20%',
            sorter: true,
            sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            title: 'running',
            key: 'running',
            dataIndex: 'running',
            sorter: true,
            sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            title: 'finished',
            key: 'finished',
            dataIndex: 'finished',
            sorter: true,
            sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            title: 'pending',
            key: 'pending',
            dataIndex: 'pending',
            sorter: true,
            sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            title: 'total',
            key: 'total',
            dataIndex: 'total',
            sorter: true,
            sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
    ];

    return (
        <div className="flex flex-col w-full h-full py-8 px-12 gap-4 relative">
            <PageTitleSpan title={t('common.projects')} />
            <div className="flex gap-4 items-center">
                <div className="w-1/4">
                    <Input
                        value={localSearchText}
                        onChange={(event) => {
                            const value = event.target.value;
                            setLocalSearchText(value);
                            debouncedSetSearchText(value);
                        }}
                        onClear={() => {
                            setLocalSearchText('');
                            debouncedSetSearchText('');
                        }}
                        className="rounded-[calc(var(--radius)-2px)]"
                        variant="outlined"
                        placeholder={t('placeholder.search-project')}
                        allowClear
                    />
                </div>

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
                    onClick={() => {
                        deleteProjects(selectedRowKeys as string[]);
                    }}
                >
                    {t('action.delete')}
                </SecondaryButton>
            </div>

            <Table<ProjectData>
                className="flex-1 h-full overflow-hidden border border-border"
                size="small"
                columns={columns}
                dataSource={tableDataSource}
                loading={tableLoading}
                scroll={{
                    y: 'calc(100vh - 250px)',
                    x: 'max-content',
                }}
                pagination={false}
                onChange={onTableChange}
                onRow={(record: ProjectData) => {
                    return {
                        onClick: (event: MouseEvent) => {
                            if (event.type === 'click') {
                                navigate(`${record.project}`);
                            }
                        },
                        className: 'cursor-pointer',
                    };
                }}
                rowKey="project"
                rowSelection={rowSelection}
            />

            <Pagination
                className="flex justify-end"
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                showSizeChanger
                showTotal={(total) => t('table.pagination.total', { total })}
                pageSizeOptions={['10', '20', '50', '100']}
                onChange={(page, pageSize) => {
                    onTableChange(
                        { current: page, pageSize },
                        {},
                        {} as SorterResult<ProjectData>,
                    );
                }}
            />
        </div>
    );
};

export default memo(ProjectPage);
