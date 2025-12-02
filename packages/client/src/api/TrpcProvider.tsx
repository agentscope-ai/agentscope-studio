import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { queryClient, trpc, trpcClient } from './trpc';

interface TrpcProviderProps {
    children: ReactNode;
}

/**
 * A reusable provider component that wraps QueryClientProvider and trpc.Provider.
 * Use this component to enable tRPC hooks in any part of your application.
 */
export function TrpcProvider({ children }: TrpcProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                {children}
            </trpc.Provider>
        </QueryClientProvider>
    );
}
