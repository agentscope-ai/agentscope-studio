import { Layout, Menu } from 'antd';
import { useEffect, useState } from 'react';
import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import EvalPage from '../EvalPage';
import FridayPage from '../FridayPage';
import ContentPage from '../ContentPage';
import DashboardPage from '../DashboardPage';
import ApiIcon from '@/assets/svgs/api.svg?react';
import HomeIcon from '@/assets/svgs/home.svg?react';
import GitHubIcon from '@/assets/svgs/github.svg?react';
import DiscordIcon from '@/assets/svgs/discord.svg?react';
import DingTalkIcon from '@/assets/svgs/dingtalk.svg?react';
import DashboardIcon from '@/assets/svgs/dashboard.svg?react';
import TutorialIcon from '@/assets/svgs/tutorial.svg?react';
import CopilotIcon from '@/assets/svgs/copilot.svg?react';
import LogoIcon from '@/assets/svgs/logo-font.svg?react';
// import EvaluationIcon from '@/assets/svgs/evaluation.svg?react';

import { RouterPath } from '../RouterPath.ts';
import { checkForUpdates } from '@/utils/versionCheck.ts';
import { useNotification } from '@/context/NotificationContext.tsx';
import { OverviewRoomContextProvider } from '@/context/OverviewRoomContext.tsx';

enum SiderWidth {
    COLLAPSE = 72,
    EXPAND = 250,
}

const HomePage = () => {
    const location = useLocation();
    const { Sider } = Layout;
    const collapseInit = location.pathname !== RouterPath.HOME;
    const [collapse, setCollapse] = useState<boolean>(collapseInit);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [currentPath, setCurrentPath] = useState<string>('unknown');
    const { notificationApi } = useNotification();

    const collapseSider = () => {
        if (location.pathname !== RouterPath.HOME) {
            setCollapse(true);
        }
    };

    const expandSider = () => {
        if (location.pathname !== RouterPath.HOME) {
            setCollapse(false);
        }
    };

    useEffect(() => {
        const paths = location.pathname.split('/');
        if (paths.length >= 2) {
            setCurrentPath(() => `/${paths[1]}`);

            if (`/${paths[1]}` === RouterPath.HOME) {
                setCollapse(false);
            } else {
                setCollapse(true);
            }
        } else {
            setCurrentPath(() => 'unknown');
        }
    }, [location.pathname]);

    // Check for update
    useEffect(() => {
        const checkUpdate = async () => {
            const CHECK_INTERVAL = 5 * 24 * 60 * 60 * 1000; // 5 * 24小时
            const lastCheck = localStorage.getItem('lastUpdateCheck');
            const now = Date.now();

            if (!lastCheck || now - Number(lastCheck) > CHECK_INTERVAL) {
                const updateInfo = await checkForUpdates();
                if (updateInfo.hasUpdate) {
                    notificationApi.info({
                        message: t('notification.update-version-title'),
                        description: t(
                            'notification.update-version-description',
                            {
                                latestVersion: updateInfo.latestVersion,
                                currentVersion: updateInfo.currentVersion,
                            },
                        ),
                        placement: 'topRight',
                        duration: 5,
                    });
                }
                localStorage.setItem('lastUpdateCheck', String(now));
            }
        };
        checkUpdate();
    }, []);

    return (
        <Layout>
            <Sider
                width={collapse ? SiderWidth.COLLAPSE : SiderWidth.EXPAND}
                onMouseEnter={expandSider}
                onMouseLeave={collapseSider}
                style={{
                    zIndex: 2,
                    borderRight: '1px solid var(--border)',
                }}
            >
                <div className="w-full h-[92px] py-5 text-[24px] font-extrabold flex justify-center">
                    <div className="w-full flex items-center gap-2 truncate justify-center">
                        <LogoIcon fill="#000" width={29} height={29} />
                        {collapse ? null : 'Studio'}
                    </div>
                </div>
                <Menu
                    defaultSelectedKeys={[RouterPath.HOME]}
                    selectedKeys={[currentPath]}
                    onClick={(e) => {
                        switch (e.key) {
                            case RouterPath.HOME:
                                navigate(RouterPath.HOME);
                                break;
                            case RouterPath.DASHBOARD:
                                navigate(RouterPath.DASHBOARD);
                                break;
                            case RouterPath.EVAL:
                                navigate(RouterPath.EVAL);
                                break;
                            case RouterPath.FRIDAY:
                                navigate(
                                    `${RouterPath.FRIDAY}/${RouterPath.FRIDAY_SETTING}`,
                                    {
                                        state: {
                                            autoNavigateToChat: true,
                                        },
                                    },
                                );
                                break;
                            case 'tutorial':
                            case 'api':
                                window.open(
                                    'https://doc.agentscope.io',
                                    '_blank',
                                );
                                break;
                            case 'github':
                                window.open(
                                    'https://github.com/modelscope/agentscope',
                                    '_blank',
                                );
                                break;
                            case 'discord':
                                // TODO
                                break;
                            case 'dingtalk':
                                // TODO
                                break;
                        }
                    }}
                    mode="inline"
                    items={[
                        {
                            key: RouterPath.HOME,
                            label: collapse ? undefined : t('common.home'),
                            icon: <HomeIcon width={15} height={15} />,
                        },
                        {
                            key: RouterPath.DASHBOARD,
                            label: collapse ? undefined : t('common.dashboard'),
                            icon: <DashboardIcon width={15} height={15} />,
                        },
                        // TODO: build evaluation pages
                        // {
                        //     key: RouterPath.EVAL,
                        //     label: collapse ? undefined : t('common.evaluation'),
                        //     icon: <EvaluationIcon width={16} height={16} />
                        // },
                        {
                            key: '/apps',
                            label: t('common.apps'),
                            type: 'group',
                            children: [
                                {
                                    key: RouterPath.FRIDAY,
                                    label: collapse ? undefined : 'AS-Friday',
                                    icon: (
                                        <CopilotIcon width={15} height={15} />
                                    ),
                                },
                            ],
                        },
                        {
                            key: '/docs',
                            label: t('common.docs'),
                            type: 'group',
                            children: [
                                {
                                    key: 'tutorial',
                                    label: collapse
                                        ? undefined
                                        : t('common.tutorial'),
                                    icon: (
                                        <TutorialIcon width={15} height={15} />
                                    ),
                                },
                                {
                                    key: 'api',
                                    label: collapse
                                        ? undefined
                                        : t('common.api'),
                                    icon: <ApiIcon width={15} height={15} />,
                                },
                            ],
                        },
                        {
                            key: '/contact',
                            label: t('common.cont'),
                            type: 'group',
                            children: [
                                {
                                    key: 'github',
                                    label: collapse ? undefined : 'GitHub',
                                    icon: <GitHubIcon width={15} height={15} />,
                                },
                                {
                                    key: 'discord',
                                    label: collapse ? undefined : 'Discord',
                                    icon: (
                                        <DiscordIcon width={15} height={15} />
                                    ),
                                },
                                {
                                    key: 'dingtalk',
                                    label: collapse ? undefined : 'DingTalk',
                                    icon: (
                                        <DingTalkIcon width={15} height={15} />
                                    ),
                                },
                            ],
                        },
                    ]}
                />
            </Sider>

            <Routes>
                <Route
                    path={RouterPath.HOME}
                    element={
                        <OverviewRoomContextProvider>
                            <ContentPage />
                        </OverviewRoomContextProvider>
                    }
                />
                <Route
                    path={`${RouterPath.DASHBOARD}/*`}
                    element={<DashboardPage />}
                />
                <Route path={`${RouterPath.EVAL}/*`} element={<EvalPage />} />
                <Route
                    path={`${RouterPath.FRIDAY}/*`}
                    element={<FridayPage />}
                />
                <Route
                    path="*"
                    element={<Navigate to={RouterPath.HOME} replace />}
                />
            </Routes>
        </Layout>
    );
};

export default HomePage;
