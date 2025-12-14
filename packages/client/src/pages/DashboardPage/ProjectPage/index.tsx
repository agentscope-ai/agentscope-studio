import { Key, memo, MouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Input, TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';

import AsTable from '@/components/tables/AsTable';
import DeleteIcon from '@/assets/svgs/delete.svg?react';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';

import { useProjectListRoom } from '@/context/ProjectListRoomContext.tsx';
import { SecondaryButton } from '@/components/buttons/ASButton';
import {
    NumberCell,
    renderTitle,
    TextCell,
} from '@/components/tables/utils.tsx';

interface DataType {
    project: string;
    running: number;
    pending: number;
    finished: number;
    total: number;
    createdAt: string;
}

const ProjectPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { projects, deleteProjects } = useProjectListRoom();

    const [searchText, setSearchText] = useState<string>('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    useEffect(() => {
        const existedProjects = projects.map((proj) => proj.project);
        setSelectedRowKeys((prevRowKeys) =>
            prevRowKeys.filter((project) =>
                existedProjects.includes(project as string),
            ),
        );
    }, [projects]);

    const columns: TableColumnsType<DataType> = [
        {
            title: renderTitle(t('common.project'), 14),
            key: 'project',
            width: '40%',
            defaultSortOrder: undefined,
            render: (value, record) => (
                <TextCell
                    text={value}
                    selected={selectedRowKeys.includes(record.project)}
                />
            ),
        },
        {
            key: 'createdAt',
            defaultSortOrder: 'descend',
            width: '20%',
            render: (value, record) => (
                <TextCell
                    text={value}
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
        <Flex
            style={{ width: '100%', height: '100%', padding: '32px 48px' }}
            vertical={true}
            gap="middle"
        >
            <PageTitleSpan title={t('common.projects')} />
            <Flex vertical={false} gap="middle" align="center">
                <Input
                    value={searchText}
                    onChange={(event) => {
                        setSearchText(event.target.value);
                    }}
                    style={{
                        width: 300,
                        borderRadius: 'calc(var(--radius) - 2px)',
                    }}
                    variant="outlined"
                    placeholder={t('placeholder.search-project')}
                />

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
            </Flex>

            <AsTable<DataType>
                columns={columns}
                dataSource={projects.filter((proj) =>
                    proj.project.includes(searchText),
                )}
                loading={false}
                onRow={(record: DataType) => {
                    return {
                        onClick: (event: MouseEvent) => {
                            if (event.type === 'click') {
                                navigate(`${record.project}`);
                            }
                        },
                        style: {
                            cursor: 'pointer',
                        },
                    };
                }}
                pagination={false}
                rowKey="project"
                rowSelection={rowSelection}
            />
        </Flex>
    );
};

export default memo(ProjectPage);
