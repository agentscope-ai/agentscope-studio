import { memo, ReactNode } from 'react';
import { Avatar, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
import { RemoveScrollBarStyle } from '@/styles.ts';
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
        <div className="flex flex-col gap-1">
            <SubTitle title={title} />
            <span className="text-[12px] h-[15px] text-muted-foreground truncate">
                {description}
            </span>
        </div>
    );
};

const SubTitle = ({ title }: { title: string }) => {
    return (
        <span className="text-[14px] font-medium h-5 max-h-5 truncate">
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
        <div className="border border-border rounded-lg p-6 h-full flex flex-col gap-2 shadow-sm">
            <div className="flex justify-between w-full">
                <SubTitle title={title} />
                {icon}
            </div>

            <div className="flex flex-col gap-0">
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
                    <div className="text-[12px] text-muted-foreground w-full h-[15px] max-h-[15px] truncate">
                        {footer}
                    </div>
                ) : null}
            </div>
        </div>
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
        <div
            className="as-project-row flex items-center justify-between h-[50px] min-h-[50px] w-full min-w-0 cursor-pointer rounded-md px-2"
            onClick={() => navigate(RouterPath.PROJECTS + '/' + project)}
        >
            <div className="flex items-center w-full min-w-0 gap-2">
                <Avatar style={{ flexShrink: 0 }}>{project.slice(0, 1)}</Avatar>
                <div className="flex flex-col min-w-0 w-0 flex-1 gap-0.5">
                    <div className="text-[14px] w-full min-w-0 font-medium truncate">
                        {project}
                    </div>
                    <div className="text-[12px] font-normal text-muted-foreground shrink-0 truncate">
                        {t('home.last-update', { time: lastUpdateTime })}
                    </div>
                </div>
            </div>
            <div className="flex items-end font-medium">
                <NumberCounter number={runCount} style={{ fontSize: 14 }} />
                <div className="text-[12px] text-muted-foreground">
                    &nbsp;{unit}
                </div>
            </div>
        </div>
    );
};

interface MonthlyRunItem {
    month: string;
    count: number;
}

const ContentPage = () => {
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
        <div className="flex flex-1 flex-col gap-4 py-8 px-12 h-full w-full overflow-y-auto">
            <div className="flex flex-col w-full rounded-lg gap-4">
                <PageTitleSpan title={t('common.projects')} />

                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 w-full">
                    <Block
                        title={t('common.projects')}
                        number={overviewData?.totalProjects}
                        footer={renderProjectHint(overviewData)}
                        icon={<ProjectIcon width={16} height={16} />}
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
                </div>

                {/* Chart + Recent projects */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
                    <div className="lg:col-span-7 border border-border rounded-lg p-6 h-[325px] flex flex-col gap-6 shadow-sm">
                        <BlockTitle
                            title={t('common.overview')}
                            description={t('home.overview-description')}
                        />
                        <div className="flex flex-1">
                            <ResponsiveContainer width="100%" minWidth="100%">
                                <BarChart
                                    layout="horizontal"
                                    data={monthlyRuns.reverse()}
                                    margin={{ bottom: -5, top: 0 }}
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
                                        domain={[ticks[0], ticks[-1]]}
                                        ticks={ticks}
                                        tickFormatter={(count: number) => {
                                            if (count >= 10000) {
                                                return count.toExponential(1);
                                            } else if (count >= 1000) {
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
                                        tickFormatter={(month: string) => {
                                            const numericMonth = parseInt(
                                                month.split('-')[1],
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
                                        labelStyle={{ fontWeight: 500 }}
                                        labelFormatter={(label) => {
                                            const numericMonth = parseInt(
                                                label.split('-')[1],
                                            );
                                            const year = parseInt(
                                                label.split('-')[0],
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
                                            t('home.run-number'),
                                        ]}
                                    />
                                    <Bar
                                        dataKey="count"
                                        radius={[6, 6, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="lg:col-span-5 border border-border rounded-lg p-6 h-[325px] flex flex-col gap-2 shadow-sm">
                        <BlockTitle
                            title={t('home.recent-projects')}
                            description={
                                overviewData &&
                                overviewData.recentProjects.length > 0
                                    ? t('home.recent-projects-description')
                                    : t('home.recent-projects-empty')
                            }
                        />
                        <div
                            className="flex flex-col flex-1"
                            style={RemoveScrollBarStyle}
                        >
                            {overviewData
                                ? overviewData.recentProjects.map((proj) => (
                                      <ProjectRow
                                          key={proj.name}
                                          project={proj.name}
                                          runCount={proj.runCount}
                                          lastUpdateTime={proj.lastUpdateTime}
                                      />
                                  ))
                                : null}
                        </div>
                    </div>
                </div>
            </div>

            {/* Applications */}
            <div className="flex flex-col w-full rounded-lg gap-4">
                <PageTitleSpan title={t('common.agent')} />
                <div className="grid grid-cols-1 gap-4 w-full">
                    <div
                        className="border border-border rounded-lg p-6 cursor-pointer flex flex-col shadow-sm"
                        onClick={() =>
                            navigate(
                                `${RouterPath.FRIDAY}${RouterPath.FRIDAY_SETTING}`,
                            )
                        }
                    >
                        <BlockTitle
                            title="AgentScope Friday"
                            description={t('home.as-friday-description')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ContentPage);
