import { Button, Flex, Input, Layout, Tooltip } from 'antd';
import { Key, memo, useEffect, useRef, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import AsTable from '@/components/tables/AsTable';
import EyeIcon from '@/assets/svgs/eye.svg?react';
import DeleteIcon from '@/assets/svgs/delete.svg?react';
import EyeInvisibleIcon from '@/assets/svgs/eye-invisible.svg?react';

import { LogOutIcon } from 'lucide-react';
import { useTour } from '@/context/TourContext.tsx';
import { RemoveScrollBarStyle } from '@/styles.ts';
import { StatusCell, TextCell } from '@/components/tables/utils.tsx';
import { SecondaryButton, SwitchButton } from '@/components/buttons/ASButton';
import { useProjectRoom } from '@/context/ProjectRoomContext.tsx';

import './index.css';
import { RouterPath } from '@/pages/RouterPath.ts';

const { Sider } = Layout;

/**
 * Sider width configurations for folded and unfolded states.
 */
enum SiderDrawerWidth {
    UNFOLDED = '80vw',
    FOLDED = 280,
}

/**
 * Props for the project run sidebar component.
 */
interface Props {
    onRunClick: (runId: string) => void;
}

/**
 * Sidebar component for displaying and managing project runs.
 * Features run table, search, auto-focus on latest run, and tour integration.
 */
const ProjectRunSider = ({ onRunClick }: Props) => {
    const { t } = useTranslation();
    const { runs } = useProjectRoom();
    const { registerRunPageTourStep } = useTour();
    const navigate = useNavigate();
    const refTable = useRef(null);

    const [folded] = useState<boolean>(true);
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [focusOnLatestRun, setFocusOnLatestRun] = useState<boolean>(true);

    // Register tour step for the run table
    useEffect(() => {
        registerRunPageTourStep({
            title: t('tour.run.run-table-title'),
            description: t('tour.run.run-table-description'),
            target: refTable.current,
            placement: 'right',
        });
    }, []);

    // Extract current run and project from URL
    const match = useMatch('/projects/:projectName/runs/:runId');
    const runId = match?.params?.runId;
    const project = match?.params?.projectName;

    // Auto-navigate to latest run when focus mode is enabled
    useEffect(() => {
        if (focusOnLatestRun && runs.length > 0) {
            const latestRun = runs.reduce((prev, current) => {
                return prev.timestamp > current.timestamp ? prev : current;
            });

            if (latestRun.id !== runId) {
                onRunClick(latestRun.id);
            }
        }
    }, [runs, focusOnLatestRun]);

    // Row selection configuration for multi-select functionality
    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    return (
        <Sider
            width={SiderDrawerWidth.FOLDED}
            style={{ height: '100%', zIndex: 1 }}
        >
            <Flex
                ref={refTable}
                className="animated-sider-content"
                style={{
                    width: folded
                        ? SiderDrawerWidth.FOLDED
                        : SiderDrawerWidth.UNFOLDED,
                    padding: 16,
                    height: '100%',
                    background: 'white',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: folded
                        ? 'none'
                        : '2px 0 8px -2px rgba(0,0,0,0.15)',
                    position: 'relative',
                    borderRight: '1px solid var(--border)',
                }}
                vertical={true}
                gap="middle"
            >
                {/* Header with back button and project name */}
                <Flex
                    vertical={false}
                    align="center"
                    gap="small"
                    style={{ maxWidth: '100%' }}
                >
                    <Button
                        variant="filled"
                        icon={<LogOutIcon className="rotate-180 size-4" />}
                        color="default"
                        onClick={() => {
                            navigate(RouterPath.PROJECTS);
                        }}
                    />

                    <Tooltip title={t('common.project') + `: ${project}`}>
                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: 14,
                                fontWeight: 500,
                            }}
                        >
                            {project}
                        </div>
                    </Tooltip>
                </Flex>

                {/* Search and control buttons */}
                <Flex vertical={false} gap="small" justify="space-between">
                    <Input
                        style={{
                            maxWidth: 300,
                            borderRadius: 'calc(var(--radius) - 2px)',
                            flex: 1,
                        }}
                        variant="outlined"
                        placeholder={t('placeholder.search-run')}
                    />

                    <SwitchButton
                        active={focusOnLatestRun}
                        activeIcon={<EyeIcon width={14} height={14} />}
                        inactiveIcon={
                            <EyeInvisibleIcon width={14} height={14} />
                        }
                        onClick={() =>
                            setFocusOnLatestRun((prevState) => !prevState)
                        }
                        tooltip={t('tooltip.button.focus-on-latest-run')}
                        style={{ border: '1px dashed var(--border)' }}
                        title={undefined}
                    >
                        {folded ? null : 'Latest'}
                    </SwitchButton>

                    {/* Delete button only shown when unfolded */}
                    {folded ? null : (
                        <SecondaryButton
                            tooltip="Delete the selected runs"
                            icon={<DeleteIcon width={13} height={13} />}
                        />
                    )}
                </Flex>

                {/* Runs table with conditional columns and row selection */}
                <AsTable
                    columns={[
                        {
                            key: 'id',
                            hidden: folded,
                            ellipsis: { showTitle: false },
                            render: (value, record) => (
                                <TextCell
                                    text={value}
                                    selected={selectedRowKeys.includes(
                                        record.project,
                                    )}
                                />
                            ),
                        },
                        {
                            dataIndex: 'name',
                            key: 'name',
                            render: (value, record) => (
                                <TextCell
                                    text={value}
                                    selected={selectedRowKeys.includes(
                                        record.project,
                                    )}
                                />
                            ),
                        },
                        {
                            key: 'status',
                            render: (value, record) => (
                                <StatusCell
                                    status={value}
                                    selected={selectedRowKeys.includes(
                                        record.project,
                                    )}
                                />
                            ),
                        },
                        {
                            key: 'timestamp',
                            hidden: folded,
                            ellipsis: { showTitle: false },
                            render: (value, record) => (
                                <TextCell
                                    text={value}
                                    selected={selectedRowKeys.includes(
                                        record.project,
                                    )}
                                />
                            ),
                            defaultSortOrder: 'descend',
                            sortOrder:
                                focusOnLatestRun && folded
                                    ? 'descend'
                                    : undefined,
                        },
                        {
                            key: 'pid',
                            hidden: folded,
                            render: (value, record) => (
                                <TextCell
                                    text={value}
                                    selected={selectedRowKeys.includes(
                                        record.project,
                                    )}
                                />
                            ),
                        },
                        {
                            key: 'run_dir',
                            hidden: folded,
                            render: (value, record) => (
                                <TextCell
                                    text={value}
                                    selected={selectedRowKeys.includes(
                                        record.project,
                                    )}
                                />
                            ),
                        },
                    ]}
                    dataSource={runs}
                    onRow={(record) => {
                        const styleProps: Record<string, unknown> = {};
                        // Highlight current run row
                        if (runId === record.id) {
                            styleProps['background'] = 'var(--primary-200)';
                        }
                        return {
                            onClick: (event) => {
                                if (event.type === 'click') {
                                    onRunClick(record.id);
                                }
                            },
                            style: {
                                cursor: 'pointer',
                                ...styleProps,
                            },
                        };
                    }}
                    pagination={false}
                    rowKey="id"
                    rowSelection={folded ? undefined : rowSelection}
                    showSorterTooltip={!folded}
                    style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'calc(var(--radius) - 2px)',
                        flex: 1,
                        overflow: 'auto',
                        minHeight: 0,
                        ...RemoveScrollBarStyle,
                    }}
                    rowHoverable={true}
                />
            </Flex>
        </Sider>
    );
};

export default memo(ProjectRunSider);
