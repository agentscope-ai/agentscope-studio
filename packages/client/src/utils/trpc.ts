import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
// Import AppRouter type from server package using relative path
import type { AppRouter } from '../../../server/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();

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
