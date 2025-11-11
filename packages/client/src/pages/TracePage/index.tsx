import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';

import TitleBar from '@/components/titlebar/TitleBar';
import { trpc, trpcClient } from '@/utils/trpc';
import TraceListPage from './TraceListPage';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            staleTime: 0, // Always consider data stale, so it refetches
            gcTime: 0, // Don't cache data (v5 renamed cacheTime to gcTime)
        },
    },
});

/**
 * Main trace page that provides routing for trace listing and detail views.
 */
const TracePage = () => {
    const { Content } = Layout;
    const { t } = useTranslation();

    return (
        <QueryClientProvider client={queryClient}>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <Layout style={{ height: '100%' }}>
                    <TitleBar title={t('common.trace')} />

                    <Content style={{ display: 'flex', flex: 1 }}>
                        <Routes>
                            {/* Default route: Trace list page */}
                            <Route index element={<TraceListPage />} />
                        </Routes>
                    </Content>
                </Layout>
            </trpc.Provider>
        </QueryClientProvider>
    );
};

export default memo(TracePage);
