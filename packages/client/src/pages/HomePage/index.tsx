import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar.tsx';
import EvalPage from '../EvalPage';
import FridayPage from '../FridayPage';
import ContentPage from '../ContentPage';
import DashboardPage from '../DashboardPage';

import { RouterPath } from '../RouterPath.ts';
import { checkForUpdates } from '@/utils/versionCheck.ts';
import { useNotification } from '@/context/NotificationContext.tsx';
import { OverviewRoomContextProvider } from '@/context/OverviewRoomContext.tsx';
import StudioSidebar from '@/pages/HomePage/sidebar.tsx';
import TracePage from '../TracePage/index.tsx';

const HomePage = () => {
    const { t } = useTranslation();
    const { notificationApi } = useNotification();

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
        <SidebarProvider>
            <StudioSidebar />
            <SidebarInset>
                <Routes>
                    <Route
                        path={RouterPath.OVERVIEW}
                        element={
                            <OverviewRoomContextProvider>
                                <ContentPage />
                            </OverviewRoomContextProvider>
                        }
                    />
                    <Route
                        path={`${RouterPath.PROJECTS}/*`}
                        element={<DashboardPage />}
                    />
                    <Route
                        path={`${RouterPath.TRACING}/*`}
                        element={<TracePage />}
                    />
                    <Route
                        path={`${RouterPath.EVAL}/*`}
                        element={<EvalPage />}
                    />
                    <Route
                        path={`${RouterPath.FRIDAY}/*`}
                        element={<FridayPage />}
                    />
                    <Route
                        path="*"
                        element={<Navigate to={RouterPath.OVERVIEW} replace />}
                    />
                </Routes>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default HomePage;
