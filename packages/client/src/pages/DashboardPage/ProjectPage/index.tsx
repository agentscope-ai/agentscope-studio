import { Key, memo, MouseEvent, useEffect, useState } from 'react';
import { Input, TableColumnsType, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
            align: 'right',
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
            align: 'right',
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
            align: 'right',
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
            align: 'right',
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
        <div className="w-full h-full py-8 px-12 flex flex-col gap-4">
            <PageTitleSpan title={t('common.projects')} />
            <div className="flex gap-4 items-center">
                <div className="w-1/4">
                    <Input
                        value={searchText}
                        onChange={(event) => {
                            setSearchText(event.target.value);
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

            <div className="h-[calc(100vh-200px)] max-h-[600px] border border-border rounded-[calc(var(--radius)-2px)] overflow-hidden flex flex-col">
                <Table<ProjectData>
                    size="small"
                    columns={columns}
                    dataSource={tableDataSource}
                    loading={tableLoading}
                    scroll={{
                        y: 'calc(100vh - 320px)',
                        x: 'max-content',
                    }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `${total} items in total`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        hideOnSinglePage: false,
                        className: 'mr-4',
                    }}
                    onChange={onTableChange}
                    onRow={(record: ProjectData) => {
                        return {
                            onClick: (event: MouseEvent) => {
                                if (event.type === 'click') {
                                    navigate(`projects/${record.project}`);
                                }
                            },
                            className: 'cursor-pointer',
                        };
                    }}
                    rowKey="project"
                    rowSelection={rowSelection}
                />
            </div>
        </div>
    );
};

export default memo(ProjectPage);
