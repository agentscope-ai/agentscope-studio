import { TableColumnsType } from 'antd';
import { Key, memo, MouseEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import DeleteIcon from '@/assets/svgs/delete.svg?react';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';
import AsTable from '@/components/tables/AsTable';

import { SecondaryButton } from '@/components/buttons/ASButton';
import { NumberCell, TextCell } from '@/components/tables/utils.tsx';
import { useProjectListRoom } from '@/context/ProjectListRoomContext.tsx';
import { formatDateTime } from '@/utils/common';
import type { ProjectData } from '@shared/types';

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

    const columns: TableColumnsType<ProjectData> = [
        {
            key: 'project',
            width: '40%',
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            key: 'createdAt',
            width: '20%',
            render: (value, record) => (
                <TextCell
                    text={formatDateTime(value)}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            key: 'running',
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            key: 'finished',
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            key: 'pending',
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            key: 'total',
            render: (value, record) => (
                <NumberCell
                    number={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
    ];

    return (
        <div className="flex flex-col w-full h-full py-8 px-12 gap-4">
            <PageTitleSpan title={t('common.projects')} />
            <div className="flex-1 min-h-0 w-full">
                <AsTable<ProjectData>
                    columns={columns}
                    searchableColumns={['project']}
                    searchType="project"
                    dataSource={tableDataSource}
                    loading={tableLoading}
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
                    total={total}
                    tableRequestParams={tableRequestParams}
                    setTableRequestParams={setTableRequestParams}
                    selectedRowKeys={selectedRowKeys}
                    setSelectedRowKeys={setSelectedRowKeys}
                    actions={
                        <SecondaryButton
                            tooltip={
                                selectedRowKeys.length === 0
                                    ? t(
                                          'tooltip.button.delete-selected-projects-disable',
                                      )
                                    : t(
                                          'tooltip.button.delete-selected-projects',
                                          {
                                              number: selectedRowKeys.length,
                                          },
                                      )
                            }
                            icon={<DeleteIcon width={13} height={13} />}
                            disabled={selectedRowKeys.length === 0}
                            variant="dashed"
                            onClick={handleDelete}
                        >
                            {t('action.delete')}
                        </SecondaryButton>
                    }
                />
            </div>
        </div>
    );
};

export default memo(ProjectPage);
