import { memo } from 'react';
import { Route, Routes } from 'react-router-dom';

import RunPage from './RunPage';
import ProjectPage from './ProjectPage';

import { TourContextProvider } from '@/context/TourContext.tsx';
import { ProjectListRoomContextProvider } from '@/context/ProjectListRoomContext.tsx';

/**
 * Main dashboard page that provides routing for project management and run monitoring.
 * Uses nested routing with context providers for different sections.
 */
const DashboardPage = () => {
    return (
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
                path={'/:projectName/*'}
                element={
                    <TourContextProvider>
                        <RunPage />
                    </TourContextProvider>
                }
            />
        </Routes>
    );
};

export default memo(DashboardPage);
