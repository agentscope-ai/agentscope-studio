import { memo } from 'react';

import { TraceContextProvider } from '../../context/TraceContext';
import TraceListPage from './TraceListPage';

/**
 * Main trace page that provides trace listing view.
 * Wraps the page with TraceContextProvider for state management and polling.
 * TraceContextProvider internally provides QueryClientProvider and trpc.Provider.
 */
const TracePage = () => {
    return (
        <TraceContextProvider pollingInterval={5000} pollingEnabled={true}>
            <div className="h-full flex flex-1">
                <TraceListPage />
            </div>
        </TraceContextProvider>
    );
};

export default memo(TracePage);
