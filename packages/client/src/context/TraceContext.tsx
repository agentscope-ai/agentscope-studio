import { TraceListItem, TraceStatistics } from '@shared/types';
import dayjs from 'dayjs';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { TrpcProvider } from '../api/TrpcProvider';
import { trpc } from '../api/trpc';

export interface TraceContextType {
    // Filter state
    timeRange: 'week' | 'month' | 'all';
    setTimeRange: (range: 'week' | 'month' | 'all') => void;

    // Pagination state
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;

    // Data
    traces: TraceListItem[];
    statistics: TraceStatistics | undefined;
    traceData:
        | {
              traceId: string;
              spans: import('@shared/types/trace').SpanData[];
              startTime: string;
              endTime: string;
              duration: number;
              status: number;
              totalTokens?: number;
          }
        | undefined; // Selected trace detail data
    isLoading: boolean;
    isLoadingTrace: boolean;
    error: Error | null;
    total: number;

    // Selected trace
    selectedTraceId: string | null;
    setSelectedTraceId: (traceId: string | null) => void;
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;

    // Refresh functions
    refetch: () => void;
    refetchTrace: () => void;
}

const TraceContext = createContext<TraceContextType | null>(null);

interface TraceContextProviderProps {
    children: ReactNode;
    pollingInterval?: number; // in milliseconds
    pollingEnabled?: boolean;
}

// Internal component that uses tRPC hooks - must be inside trpc.Provider
function TraceContextProviderInner({
    children,
    pollingInterval = 5000,
    pollingEnabled = true,
}: TraceContextProviderProps) {
    // Filter state
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>(
        'week',
    );

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Selected trace
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Calculate time range filter
    const timeRangeFilter = useMemo(() => {
        const now = dayjs();
        let startTime: string | undefined;
        let endTime: string | undefined;

        switch (timeRange) {
            case 'week':
                startTime = (
                    BigInt(now.subtract(7, 'day').startOf('day').valueOf()) *
                    BigInt(1_000_000)
                ).toString();
                endTime = (
                    BigInt(now.endOf('day').valueOf()) * BigInt(1_000_000)
                ).toString();
                break;
            case 'month':
                startTime = (
                    BigInt(now.subtract(30, 'day').startOf('day').valueOf()) *
                    BigInt(1_000_000)
                ).toString();
                endTime = (
                    BigInt(now.endOf('day').valueOf()) * BigInt(1_000_000)
                ).toString();
                break;
            case 'all':
            default:
                startTime = undefined;
                endTime = undefined;
                break;
        }

        return { startTime, endTime };
    }, [timeRange]);

    // Fetch trace list with polling
    const {
        data: traceListData,
        isLoading,
        error,
        refetch,
    } = trpc.getTraceList.useQuery(
        {
            limit: pageSize,
            offset: (page - 1) * pageSize,
            ...timeRangeFilter,
        },
        {
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            staleTime: 0,
            gcTime: 0,
            refetchInterval: pollingEnabled ? pollingInterval : false,
            refetchIntervalInBackground: true,
        },
    );

    // Fetch statistics with polling
    const { data: statistics, refetch: refetchStatistics } =
        trpc.getTraceStatistic.useQuery(timeRangeFilter, {
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            staleTime: 0,
            gcTime: 0,
            refetchInterval: pollingEnabled ? pollingInterval : false,
            refetchIntervalInBackground: true,
        });

    // Fetch selected trace detail with polling
    const {
        data: traceData,
        isLoading: isLoadingTrace,
        refetch: refetchTrace,
    } = trpc.getTrace.useQuery(
        { traceId: selectedTraceId || '' },
        {
            enabled: !!selectedTraceId,
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            staleTime: 0,
            gcTime: 0,
            refetchInterval: pollingEnabled ? pollingInterval : false,
            refetchIntervalInBackground: true,
        },
    );

    // Use traces directly from API (no client-side filtering needed)
    const traces = traceListData?.traces || [];

    const value: TraceContextType = useMemo(
        () => ({
            // Filter state
            timeRange,
            setTimeRange,

            // Pagination state
            page,
            setPage,
            pageSize,
            setPageSize,

            // Data
            traces,
            statistics,
            traceData,
            isLoading,
            isLoadingTrace,
            error: error as Error | null,
            total: traceListData?.total || 0,

            // Selected trace
            selectedTraceId,
            setSelectedTraceId,
            drawerOpen,
            setDrawerOpen,

            // Refresh functions
            refetch: () => {
                refetch();
                refetchStatistics();
            },
            refetchTrace,
        }),
        [
            timeRange,
            page,
            pageSize,
            traces,
            statistics,
            traceData,
            isLoading,
            isLoadingTrace,
            error,
            traceListData?.total,
            selectedTraceId,
            drawerOpen,
            refetch,
            refetchStatistics,
            refetchTrace,
        ],
    );

    return (
        <TraceContext.Provider value={value}>{children}</TraceContext.Provider>
    );
}

// External wrapper that provides QueryClientProvider and trpc.Provider
export function TraceContextProvider({
    children,
    pollingInterval = 5000, // 5 seconds default
    pollingEnabled = true,
}: TraceContextProviderProps) {
    return (
        <TrpcProvider>
            <TraceContextProviderInner
                pollingInterval={pollingInterval}
                pollingEnabled={pollingEnabled}
            >
                {children}
            </TraceContextProviderInner>
        </TrpcProvider>
    );
}

export function useTraceContext() {
    const context = useContext(TraceContext);
    if (!context) {
        throw new Error(
            'useTraceContext must be used within a TraceContextProvider',
        );
    }
    return context;
}
