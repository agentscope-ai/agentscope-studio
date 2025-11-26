import { memo } from 'react';
import { Route, Routes } from 'react-router-dom';

import { TraceContextProvider } from '../../context/TraceContext';
import TraceListPage from './TraceListPage';

/**
 * Main trace page that provides routing for trace listing and detail views.
 * Wraps the page with TraceContextProvider for state management and polling.
 * Note: QueryClientProvider and trpc.Provider are provided at App level.
 */
const TracePage = () => {
    return (
        <TraceContextProvider
            defaultPollingInterval={5000}
            defaultPollingEnabled={true}
        >
            <div className="h-full flex flex-1">
                <Routes>
                    {/* Default route: Trace list page */}
                    <Route index element={<TraceListPage />} />
                </Routes>
            </div>
        </TraceContextProvider>
    );
};

export default memo(TracePage);
