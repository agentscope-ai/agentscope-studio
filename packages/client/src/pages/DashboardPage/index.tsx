import { memo } from 'react';
import { Layout } from 'antd';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import RunPage from './RunPage';
import ProjectPage from './ProjectPage';
import TitleBar from '@/components/titlebar/TitleBar';

import { TourContextProvider } from '@/context/TourContext.tsx';
import { ProjectListRoomContextProvider } from '@/context/ProjectListRoomContext.tsx';

/**
 * Main dashboard page that provides routing for project management and run monitoring.
 * Uses nested routing with context providers for different sections.
 */
const DashboardPage = () => {
    const { Content } = Layout;
    const { t } = useTranslation();

    return (
        <Layout style={{ height: '100%' }}>
            <TitleBar title={t('common.dashboard')} />

            <Content style={{ display: 'flex', flex: 1 }}>
                <Routes>
                    {/* Default route: Project list page */}
                    <Route
                        index
                        element={
                            <ProjectListRoomContextProvider>
                                <ProjectPage />
                            </ProjectListRoomContextProvider>
                        }
                    />
                    {/* Project-specific run monitoring with tour support */}
                    <Route
                        path={'/projects/:projectName/*'}
                        element={
                            <TourContextProvider>
                                <RunPage />
                            </TourContextProvider>
                        }
                    />
                    {/* Explicit projects route: Project list page */}
                    <Route
                        path="/projects"
                        element={
                            <ProjectListRoomContextProvider>
                                <ProjectPage />
                            </ProjectListRoomContextProvider>
                        }
                    />
                </Routes>
            </Content>
        </Layout>
    );
};

export default memo(DashboardPage);
