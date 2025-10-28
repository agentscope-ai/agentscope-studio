import { Key, memo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';

import ShadcnTable from '@/components/shadcnTable';
import type { TableColumn } from '@/components/shadcnTable/types';
import DeleteIcon from '@/assets/svgs/delete.svg?react';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';

import { trpcClient } from '@/api/trpc';
import { SecondaryButton } from '@/components/buttons/ASButton';
import { NumberCell, TextCell } from '@/components/tables/utils.tsx';
import { useProjectListRoom } from '@/context/ProjectListRoomContext.tsx';
import type {
    ProjectData,
    TableRequestParams,
    ResponseBody,
    TableData,
} from '@shared/types';

const ProjectPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { projects, deleteProjects } = useProjectListRoom();

    const [searchText, setSearchText] = useState<string>('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const searchTextRef = useRef(searchText);

    // Update ref when searchText changes
    searchTextRef.current = searchText;

    useEffect(() => {
        const existedProjects = projects.map((proj) => proj.project);
        setSelectedRowKeys((prevRowKeys) =>
            prevRowKeys.filter((project) =>
                existedProjects.includes(project as string),
            ),
        );
    }, [projects]);

    /**
     * tRPC API function
     */
    const getProjects = useCallback(
        async (
            params: TableRequestParams,
        ): Promise<ResponseBody<TableData<ProjectData>>> => {
            try {
                return await trpcClient.getProjects.query(params);
            } catch (error) {
                return {
                    success: false,
                    message:
                        error instanceof Error ? error.message : '请求失败',
                };
            }
        },
        [],
    );

    /**
     * API function with search - using ref to avoid StrictMode duplicate calls
     */
    const getProjectsWithSearch = useCallback(
        async (
            params: TableRequestParams,
        ): Promise<ResponseBody<TableData<ProjectData>>> => {
            const searchParams = {
                ...params,
                filters: searchTextRef.current
                    ? { project: searchTextRef.current }
                    : undefined,
            };
            return getProjects(searchParams);
        },
        [getProjects],
    );

    const columns: TableColumn<ProjectData>[] = [
        {
            title: t('common.project'),
            key: 'project',
            dataIndex: 'project',
            width: '40%',
            sorter: true,
            render: (value: unknown) => <TextCell text={String(value)} />,
        },
        {
            title: 'createdAt',
            key: 'createdAt',
            dataIndex: 'createdAt',
            width: '20%',
            sorter: true,
            render: (value: unknown) => <TextCell text={String(value)} />,
        },
        {
            title: 'running',
            key: 'running',
            dataIndex: 'running',
            align: 'right',
            sorter: true,
            render: (value: unknown) => <NumberCell number={Number(value)} />,
        },
        {
            title: 'finished',
            key: 'finished',
            dataIndex: 'finished',
            align: 'right',
            sorter: true,
            render: (value: unknown) => <NumberCell number={Number(value)} />,
        },
        {
            title: 'pending',
            key: 'pending',
            dataIndex: 'pending',
            align: 'right',
            sorter: true,
            render: (value: unknown) => <NumberCell number={Number(value)} />,
        },
        {
            title: 'total',
            key: 'total',
            dataIndex: 'total',
            align: 'right',
            sorter: true,
            render: (value: unknown) => <NumberCell number={Number(value)} />,
        },
    ];

    const tableApiRef = useRef<{ reload: () => void } | null>(null);

    return (
        <div className="w-full h-full p-8 space-y-4">
            {/* Page title */}
            <PageTitleSpan title={t('common.projects')} />

            {/* Search and operation bar */}
            <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-4">
                    <Input
                        value={searchText}
                        onChange={(event) => {
                            setSearchText(event.target.value);
                        }}
                        onPressEnter={() => {
                            // 触发搜索，重新调用 API
                            if (getProjectsWithSearch) {
                                const params = {
                                    pagination: {
                                        page: 1,
                                        pageSize: 10,
                                    },
                                };
                                getProjectsWithSearch(params);
                            }
                        }}
                        style={{ width: '400px' }}
                        placeholder={t('placeholder.search-project')}
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
                    disabled={selectedRowKeys.length === 0}
                    onClick={async () => {
                        await deleteProjects(selectedRowKeys as string[]);
                        tableApiRef.current?.reload();
                    }}
                    className="flex items-center space-x-2"
                >
                    <DeleteIcon className="h-4 w-4" />
                    <span>
                        {selectedRowKeys.length === 0
                            ? t('action.delete')
                            : t('tooltip.button.delete-selected-projects', {
                                  number: selectedRowKeys.length,
                              })}
                    </span>
                </SecondaryButton>
            </div>

            {/* Table */}
            <ShadcnTable<ProjectData>
                columns={columns}
                apiFunction={getProjectsWithSearch}
                onReady={(api) => {
                    tableApiRef.current = api;
                }}
                rowKey="project"
                rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                }}
                onRow={(record: ProjectData) => ({
                    onClick: () => navigate(`projects/${record.project}`),
                    className: 'cursor-pointer hover:bg-muted/50',
                })}
                pagination={{
                    showSizeChanger: false,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} items`,
                }}
                className="rounded-lg"
                sticky
            />
        </div>
    );
};

export default memo(ProjectPage);
