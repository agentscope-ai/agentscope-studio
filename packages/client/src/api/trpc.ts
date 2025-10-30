import { createTRPCProxyClient, httpLink } from '@trpc/client';
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
