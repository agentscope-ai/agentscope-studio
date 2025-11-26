import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '../../../server/src/trpc/router';

/**
 * tRPC client instance
 * Type-safe API client that connects to the backend router
 */
export const trpcClient = createTRPCProxyClient<AppRouter>({
    links: [
        httpLink({
            url: '/trpc',
        }),
    ],
});

/**
 * tRPC React hooks
 * Use this for React components with hooks like useQuery
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * QueryClient instance for React Query
 * Configured with default options for the application
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000,
            refetchOnWindowFocus: false,
        },
    },
});

/**
 * tRPC React client instance
 * Use this for the trpc.Provider in your app
 */
export const trpcReactClient = trpc.createClient({
    links: [
        httpLink({
            url: '/trpc',
        }),
    ],
});
