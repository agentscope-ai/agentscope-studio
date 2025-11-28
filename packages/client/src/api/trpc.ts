import { QueryClient } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
// Import AppRouter type from server package using relative path
import type { AppRouter } from '../../../server/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            staleTime: 0,
            gcTime: 0,
        },
    },
});

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: '/trpc',
            fetch(url, options) {
                return fetch(url, {
                    ...options,
                    cache: 'no-store', // Disable HTTP caching
                });
            },
        }),
    ],
});
