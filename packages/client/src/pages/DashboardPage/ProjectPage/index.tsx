import { Key, memo, MouseEvent, useEffect, useState } from 'react';
import { Input, TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import DeleteIcon from '@/assets/svgs/delete.svg?react';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';
import AsTable from '@/components/tables/AsTable';

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
    // Obtain data and actions from the ProjectListRoom context
    const {
        tableDataSource,
        tableLoading,
        total,
        tableRequestParams,
        setTableRequestParams,
        deleteProjects,
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

    // Filter the selected rows when table data source changes
    useEffect(() => {
        const existedProjects = tableDataSource.map((proj) => proj.project);
        setSelectedRowKeys((prevRowKeys) =>
            prevRowKeys.filter((project) =>
                existedProjects.includes(project as string),
            ),
        );
    }, [tableDataSource]);

    // Handle delete action
    const handleDelete = async () => {
        try {
            await deleteProjects(selectedRowKeys as string[]);
            setSelectedRowKeys([]);
        } catch (error) {
            console.error('Failed to delete projects:', error);
        }
    };

    // Handle search text change
    const handleSearchTextChange = (searchText: string) => {
        setTableRequestParams((prevParams) => ({
            pagination: {
                page: 1, // Reset to first page on search
                pageSize: prevParams.pagination.pageSize,
            },
            sort: prevParams.sort,
            filters: {
                project: searchText,
            },
        }));
    };

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
                        // value={tableRequestParams.filters?.project}
                        onChange={(event) => {
                            handleSearchTextChange(event.target.value);
                        }}
                        onClear={() => {
                            handleSearchTextChange('');
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
                    onClick={handleDelete}
                >
                    {t('action.delete')}
                </SecondaryButton>
            </div>

            <div className="flex-1 h-full overflow-hidden">
                <AsTable<ProjectData>
                    columns={columns}
                    dataSource={tableDataSource}
                    loading={tableLoading}
                    scroll={{
                        y: 'calc(100vh - 250px)',
                        x: 'max-content',
                    }}
                    onChange={(pagination, _filters, sorter) => {
                        const page = pagination.current || 1;
                        const pageSize = pagination.pageSize || 50;
                        const sortField = sorter.field;
                        const sortOrder = sorter.order
                            ? sorter.order === 'ascend'
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
                    pagination={{
                        size: 'default',
                        current: tableRequestParams.pagination.page,
                        pageSize: tableRequestParams.pagination.pageSize,
                        total: total,
                        showSizeChanger: true,
                        showTotal: (total: number) =>
                            t('table.pagination.total', { total }),
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                />
            </div>
        </div>
    );
};

export default memo(ProjectPage);
