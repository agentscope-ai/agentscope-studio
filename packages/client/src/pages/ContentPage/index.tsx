import { memo, ReactNode } from 'react';
import { Avatar, Col, Flex, Layout, Row, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import TitleBar from '@/components/titlebar/TitleBar.tsx';
import ProjectIcon from '@/assets/svgs/project.svg?react';
import RunIcon from '@/assets/svgs/run.svg?react';
import TokenIcon from '@/assets/svgs/token.svg?react';
import ApiIcon from '@/assets/svgs/api.svg?react';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';
import NumberCounter from '@/components/numbers/NumberCounter';
import extended from '@/pages/ContentPage/utils.ts';

import { OverviewData } from '@shared/types/trpc';
import { RouterPath } from '@/pages/RouterPath.ts';
import { useOverviewRoom } from '@/context/OverviewRoomContext.tsx';
import { RemoveScrollBarStyle, SingleLineEllipsisStyle } from '@/styles.ts';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import './index.css';

interface BlockTitleProps {
    title: string;
    description: string;
}

const BlockTitle = ({ title, description }: BlockTitleProps) => {
    return (
        <Flex vertical={true} gap={3}>
            <SubTitle title={title} />
            <span
                style={{
                    color: 'var(--muted-foreground)',
                    height: 15,
                    fontSize: 12,
                    ...SingleLineEllipsisStyle,
                }}
            >
                {description}
            </span>
        </Flex>
    );
};

const SubTitle = ({ title }: { title: string }) => {
    return (
        <span
            style={{
                fontSize: 14,
                fontWeight: 500,
                height: 20,
                maxHeight: 20,
                ...SingleLineEllipsisStyle,
            }}
        >
            {title}
        </span>
    );
};

interface BlockProps {
    title: string;
    number: number | undefined;
    footer: string | undefined;
    icon: ReactNode;
}

const Block = ({ title, number, footer, icon }: BlockProps) => {
    return (
        <Col span={6}>
            <Flex
                style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--box-shadow)',
                    borderRadius: 8,
                    padding: 24,
                    height: '100%',
                }}
                vertical={true}
                gap={8}
            >
                <Flex
                    vertical={false}
                    style={{ width: '100%' }}
                    justify="space-between"
                >
                    <SubTitle title={title} />
                    {icon}
                </Flex>

                <Flex vertical={true} gap={0}>
                    {number !== undefined ? (
                        <NumberCounter
                            number={number}
                            style={{ fontSize: 24, fontWeight: 700 }}
                        />
                    ) : (
                        <Skeleton.Node
                            active
                            style={{ height: 30, width: '100%' }}
                        />
                    )}

                    {footer ? (
                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--muted-foreground)',
                                width: '100%',
                                height: 15,
                                ...SingleLineEllipsisStyle,
                            }}
                        >
                            {footer}
                        </div>
                    ) : (
                        <Skeleton.Node
                            active
                            style={{ width: '100%', height: 15 }}
                        />
                    )}
                </Flex>
            </Flex>
        </Col>
    );
};

interface ProjectRowProps {
    project: string;
    runCount: number;
    lastUpdateTime: string;
}

const ProjectRow = ({ project, runCount, lastUpdateTime }: ProjectRowProps) => {
    const { t } = useTranslation();
    const unit = runCount > 1 ? t('unit.runs') : t('unit.run');
    const navigate = useNavigate();
    return (
        <Flex
            className="as-project-row"
            style={{
                height: 50,
                minHeight: 50,
                width: '100%',
                minWidth: 0,
                cursor: 'pointer',
                borderRadius: 6,
                padding: '0 8px',
            }}
            vertical={false}
            align="center"
            justify="space-between"
            onClick={() => navigate('/dashboard/projects/' + project)}
        >
            <Flex
                gap="small"
                align="center"
                flex={1}
                style={{ width: '100%', minWidth: 0 }}
            >
                <Avatar style={{ flexShrink: 0 }}>{project.slice(0, 1)}</Avatar>
                <Flex
                    vertical={true}
                    flex={1}
                    style={{ minWidth: 0, width: 0 }}
                    gap={2}
                >
                    <div
                        style={{
                            fontSize: 14,
                            width: '100%',
                            minWidth: 0,
                            fontWeight: 500,
                            ...SingleLineEllipsisStyle,
                        }}
                    >
                        {project}
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 400,
                            color: 'var(--muted-foreground)',
                            flexShrink: 0,
                            ...SingleLineEllipsisStyle,
                        }}
                    >
                        {t('home.last-update', { time: lastUpdateTime })}
                    </div>
                </Flex>
            </Flex>
            <Flex style={{ fontWeight: 500 }} align="flex-end">
                <NumberCounter number={runCount} style={{ fontSize: 14 }} />
                <div
                    style={{
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                    }}
                >
                    &nbsp;{unit}
                </div>
            </Flex>
        </Flex>
    );
};

interface MonthlyRunItem {
    month: string;
    count: number;
}

const ContentPage = () => {
    const { Content } = Layout;
    const { overviewData } = useOverviewRoom();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const dataAvailable = overviewData !== null;

    const monthlyRuns: MonthlyRunItem[] = dataAvailable
        ? JSON.parse(overviewData.monthlyRuns)
        : [];

    const yAxisMax = Math.max(...monthlyRuns.map((item) => item.count));
    const yAxisMin = Math.min(...monthlyRuns.map((item) => item.count));
    const ticks = extended(yAxisMin, yAxisMax, 4);
    const maxTick = ticks[ticks.length - 1];
    const yAxisWidth =
        maxTick < 10 ? 20 : maxTick < 100 ? 25 : maxTick < 1000 ? 30 : 42;

    const obtainRatioOrNumber = (
        nPast: number,
        nTotal: number,
        unit: string,
        units: string,
    ) => {
        if (nPast === nTotal) {
            if (nTotal === 1) {
                return `${nTotal.toLocaleString()} ${unit.toLowerCase()}`;
            } else {
                return `${nTotal.toLocaleString()} ${units.toLowerCase()}`;
            }
        }
        return `${((nPast / (nTotal - nPast)) * 100).toFixed(1)}%`;
    };

    const renderProjectHint = (data: OverviewData | null) => {
        if (data === null) {
            return undefined;
        }
        if (data.projectsWeekAgo !== 0) {
            return t('home.change-last-week', {
                value: obtainRatioOrNumber(
                    data.projectsWeekAgo,
                    data.totalProjects,
                    t('common.project'),
                    t('common.projects'),
                ),
            });
        }
        if (data.projectsMonthAgo !== 0) {
            return t('home.change-last-month', {
                value: obtainRatioOrNumber(
                    data.projectsMonthAgo,
                    data.totalProjects,
                    t('common.project'),
                    t('common.projects'),
                ),
            });
        }
        if (data.projectsYearAgo !== 0) {
            return t('home.change-last-year', {
                value: obtainRatioOrNumber(
                    data.projectsYearAgo,
                    data.totalProjects,
                    t('common.project'),
                    t('common.projects'),
                ),
            });
        }
        return t('home.change-last-month', { value: '0 project' });
    };

    const renderRunHint = (data: OverviewData | null) => {
        if (data === null) {
            return undefined;
        }
        if (data.runsWeekAgo !== 0) {
            return t('home.change-last-week', {
                value: obtainRatioOrNumber(
                    data.runsWeekAgo,
                    data.totalRuns,
                    t('common.run'),
                    t('common.runs'),
                ),
            });
        }
        if (data.runsMonthAgo !== 0) {
            return t('home.change-last-month', {
                value: obtainRatioOrNumber(
                    data.runsMonthAgo,
                    data.totalRuns,
                    t('common.run'),
                    t('common.runs'),
                ),
            });
        }
        if (data.runsYearAgo !== 0) {
            return t('home.change-last-year', {
                value: obtainRatioOrNumber(
                    data.runsYearAgo,
                    data.totalRuns,
                    t('common.run'),
                    t('common.runs'),
                ),
            });
        }
        return t('home.change-last-month', { value: '0 run' });
    };

    const renderTokenHint = (data: OverviewData | null) => {
        if (data === null) {
            return undefined;
        }
        if (data.tokensWeekAgo !== 0) {
            return t('home.change-last-week', {
                value: obtainRatioOrNumber(
                    data.tokensWeekAgo,
                    data.totalTokens,
                    'token',
                    'tokens',
                ),
            });
        }
        if (data.tokensMonthAgo !== 0) {
            return t('home.change-last-month', {
                value: obtainRatioOrNumber(
                    data.tokensMonthAgo,
                    data.totalTokens,
                    'token',
                    'tokens',
                ),
            });
        }
        if (data.tokensYearAgo !== 0) {
            return t('home.change-last-year', {
                value: obtainRatioOrNumber(
                    data.tokensYearAgo,
                    data.totalTokens,
                    'token',
                    'tokens',
                ),
            });
        }
        return t('home.change-last-month', { value: '0 token' });
    };

    const renderModelInvocation = (data: OverviewData | null) => {
        if (data === null) {
            return undefined;
        }
        if (data.modelInvocationsWeekAgo !== 0) {
            return t('home.change-last-week', {
                value: obtainRatioOrNumber(
                    data.modelInvocationsWeekAgo,
                    data.totalModelInvocations,
                    t('unit.time'),
                    t('unit.times'),
                ),
            });
        }
        if (data.modelInvocationsMonthAgo !== 0) {
            return t('home.change-last-month', {
                value: obtainRatioOrNumber(
                    data.modelInvocationsMonthAgo,
                    data.totalModelInvocations,
                    t('unit.time'),
                    t('unit.times'),
                ),
            });
        }
        if (data.modelInvocationsYearAgo !== 0) {
            return t('home.change-last-year', {
                value: obtainRatioOrNumber(
                    data.modelInvocationsYearAgo,
                    data.totalModelInvocations,
                    t('unit.time'),
                    t('unit.times'),
                ),
            });
        }
        return t('home.change-last-month', { value: '0 API calls' });
    };

    return (
        <Layout>
            <TitleBar title={t('common.home')} />

            <Content style={{ height: '100%' }}>
                <Flex
                    vertical={true}
                    style={{
                        padding: '32px 48px',
                        width: '100%',
                    }}
                    gap={32}
                >
                    <Flex
                        style={{
                            width: '100%',
                            borderRadius: 8,
                        }}
                        vertical={true}
                        gap="middle"
                    >
                        <PageTitleSpan title={t('common.dashboard')} />
                        <Flex
                            vertical={true}
                            justify="space-between"
                            style={{
                                width: '100%',
                                height: '100%',
                            }}
                            gap="middle"
                        >
                            <Row
                                gutter={16}
                                style={{ width: '100%' }}
                                wrap={false}
                            >
                                <Block
                                    title={t('common.projects')}
                                    number={overviewData?.totalProjects}
                                    footer={renderProjectHint(overviewData)}
                                    icon={
                                        <ProjectIcon width={16} height={16} />
                                    }
                                />
                                <Block
                                    title={t('common.runs')}
                                    number={overviewData?.totalRuns}
                                    footer={renderRunHint(overviewData)}
                                    icon={<RunIcon width={16} height={16} />}
                                />
                                <Block
                                    title={t('common.total-tokens')}
                                    number={overviewData?.totalTokens}
                                    footer={renderTokenHint(overviewData)}
                                    icon={<TokenIcon width={16} height={16} />}
                                />
                                <Block
                                    title={t('common.llm-invocations')}
                                    number={overviewData?.totalModelInvocations}
                                    footer={renderModelInvocation(overviewData)}
                                    icon={<ApiIcon width={16} height={16} />}
                                />
                            </Row>

                            <Row
                                gutter={16}
                                style={{ width: '100%' }}
                                wrap={false}
                            >
                                <Col span={14}>
                                    <Flex
                                        style={{
                                            border: '1px solid var(--border)',
                                            boxShadow: 'var(--box-shadow)',
                                            padding: 24,
                                            borderRadius: 8,
                                            height: 325,
                                        }}
                                        vertical={true}
                                        gap="large"
                                    >
                                        <BlockTitle
                                            title={t('common.overview')}
                                            description={t(
                                                'home.overview-description',
                                            )}
                                        />

                                        <Flex flex={1}>
                                            <ResponsiveContainer
                                                width={'100%'}
                                                minWidth={'100%'}
                                            >
                                                <BarChart
                                                    layout="horizontal"
                                                    data={monthlyRuns.reverse()}
                                                    margin={{
                                                        bottom: -5,
                                                        top: 0,
                                                    }}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="1 10"
                                                        vertical={false}
                                                    />
                                                    <YAxis
                                                        type="number"
                                                        fontSize={10}
                                                        allowDecimals={false}
                                                        width={yAxisWidth}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        domain={[
                                                            ticks[0],
                                                            ticks[-1],
                                                        ]}
                                                        ticks={ticks}
                                                        tickFormatter={(
                                                            count: number,
                                                        ) => {
                                                            if (
                                                                count >= 10000
                                                            ) {
                                                                return count.toExponential(
                                                                    1,
                                                                );
                                                            } else if (
                                                                count >= 1000
                                                            ) {
                                                                return count.toLocaleString();
                                                            } else {
                                                                return count.toLocaleString();
                                                            }
                                                        }}
                                                    />
                                                    <XAxis
                                                        dataKey="month"
                                                        type="category"
                                                        fontSize={10}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(
                                                            month: string,
                                                        ) => {
                                                            const numericMonth =
                                                                parseInt(
                                                                    month.split(
                                                                        '-',
                                                                    )[1],
                                                                );
                                                            return [
                                                                'Jan',
                                                                'Feb',
                                                                'Mar',
                                                                'Apr',
                                                                'May',
                                                                'Jun',
                                                                'Jul',
                                                                'Aug',
                                                                'Sep',
                                                                'Oct',
                                                                'Nov',
                                                                'Dec',
                                                            ][numericMonth - 1];
                                                        }}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            borderRadius: 6,
                                                            border: '1px solid var(--border)',
                                                        }}
                                                        labelStyle={{
                                                            fontWeight: 500,
                                                        }}
                                                        labelFormatter={(
                                                            label,
                                                        ) => {
                                                            const numericMonth =
                                                                parseInt(
                                                                    label.split(
                                                                        '-',
                                                                    )[1],
                                                                );
                                                            const year =
                                                                parseInt(
                                                                    label.split(
                                                                        '-',
                                                                    )[0],
                                                                );
                                                            const strMonth = [
                                                                'Jan',
                                                                'Feb',
                                                                'Mar',
                                                                'Apr',
                                                                'May',
                                                                'Jun',
                                                                'Jul',
                                                                'Aug',
                                                                'Sep',
                                                                'Oct',
                                                                'Nov',
                                                                'Dec',
                                                            ][numericMonth - 1];
                                                            return `${strMonth}, ${year}`;
                                                        }}
                                                        formatter={(value) => [
                                                            value,
                                                            t(
                                                                'home.run-number',
                                                            ),
                                                        ]}
                                                    />

                                                    <Bar
                                                        dataKey="count"
                                                        radius={[6, 6, 0, 0]}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Flex>
                                    </Flex>
                                </Col>
                                <Col span={10}>
                                    <Flex
                                        style={{
                                            border: '1px solid var(--border)',
                                            boxShadow: 'var(--box-shadow)',
                                            padding: 24,
                                            borderRadius: 8,
                                            height: 325,
                                        }}
                                        vertical={true}
                                        gap="small"
                                    >
                                        <BlockTitle
                                            title={t('home.recent-projects')}
                                            description={
                                                overviewData &&
                                                overviewData.recentProjects
                                                    .length > 0
                                                    ? t(
                                                          'home.recent-projects-description',
                                                      )
                                                    : t(
                                                          'home.recent-projects-empty',
                                                      )
                                            }
                                        />

                                        <Flex
                                            flex={1}
                                            vertical={true}
                                            style={{
                                                overflowY: 'auto',
                                                ...RemoveScrollBarStyle,
                                            }}
                                            justify="start"
                                        >
                                            {overviewData
                                                ? overviewData.recentProjects.map(
                                                      (proj) => (
                                                          <ProjectRow
                                                              key={proj.name}
                                                              project={
                                                                  proj.name
                                                              }
                                                              runCount={
                                                                  proj.runCount
                                                              }
                                                              lastUpdateTime={
                                                                  proj.lastUpdateTime
                                                              }
                                                          />
                                                      ),
                                                  )
                                                : null}
                                        </Flex>
                                    </Flex>
                                </Col>
                            </Row>
                        </Flex>
                    </Flex>

                    <Flex
                        style={{
                            width: '100%',
                            borderRadius: 8,
                        }}
                        vertical={true}
                        gap="middle"
                    >
                        <PageTitleSpan title={t('common.application')} />
                        <Flex vertical={true}>
                            <Row gutter={16} wrap={false}>
                                <Col span={12}>
                                    <Flex
                                        vertical={true}
                                        style={{
                                            border: '1px solid var(--border)',
                                            boxShadow: 'var(--box-shadow)',
                                            padding: 24,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            navigate(RouterPath.FRIDAY_SETTING);
                                        }}
                                    >
                                        <BlockTitle
                                            title="AgentScope Friday"
                                            description={t(
                                                'home.as-friday-description',
                                            )}
                                        />
                                    </Flex>
                                </Col>
                                <Col span={12}>
                                    <Flex
                                        vertical={true}
                                        style={{
                                            border: '1px solid var(--border)',
                                            boxShadow: 'var(--box-shadow)',
                                            padding: 24,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            navigate(RouterPath.EVAL);
                                        }}
                                    >
                                        <BlockTitle
                                            title="AgentScope X"
                                            description={t(
                                                'home.as-x-description',
                                            )}
                                        />
                                    </Flex>
                                </Col>
                            </Row>
                        </Flex>
                    </Flex>
                </Flex>
            </Content>
        </Layout>
    );
};

export default memo(ContentPage);
