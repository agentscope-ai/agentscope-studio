import { TraceListItem, TraceStatistics } from '@shared/types';
import dayjs from 'dayjs';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { TrpcProvider } from '../api/TrpcProvider';
import { trpc } from '../api/trpc';

export interface TraceContextType {
    // Filter state
    timeRange: 'week' | 'month' | 'all';
    setTimeRange: (range: 'week' | 'month' | 'all') => void;
    searchText: string;
    setSearchText: (text: string) => void;
    searchField: 'traceId' | 'name';
    setSearchField: (field: 'traceId' | 'name') => void;

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
    isLoadingStatistics: boolean;
    isLoadingTrace: boolean;
    error: Error | null;
    errorStatistics: Error | null;
    errorTrace: Error | null;
    total: number;

    // Time range filter
    timeRangeFilter: {
        startTime?: string;
        endTime?: string;
    };

    // Polling control
    pollingEnabled: boolean;
    setPollingEnabled: (enabled: boolean) => void;
    pollingInterval: number;
    setPollingInterval: (interval: number) => void;

    // Selected trace
    selectedTraceId: string | null;
    setSelectedTraceId: (traceId: string | null) => void;
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;

    // Refresh functions
    refetch: () => void;
    refetchStatistics: () => void;
    refetchTrace: () => void;
}

const TraceContext = createContext<TraceContextType | null>(null);

interface TraceContextProviderProps {
    children: ReactNode;
    defaultPollingInterval?: number; // in milliseconds
    defaultPollingEnabled?: boolean;
}

// Internal component that uses tRPC hooks - must be inside trpc.Provider
function TraceContextProviderInner({
    children,
    defaultPollingInterval = 5000,
    defaultPollingEnabled = true,
}: TraceContextProviderProps) {
    // Filter state
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>(
        'week',
    );
    const [searchText, setSearchText] = useState<string>('');
    const [searchField, setSearchField] = useState<'traceId' | 'name'>(
        'traceId',
    );

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Polling control
    const [pollingEnabled, setPollingEnabled] = useState(defaultPollingEnabled);
    const [pollingInterval, setPollingInterval] = useState(
        defaultPollingInterval,
    );

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
    const {
        data: statistics,
        isLoading: isLoadingStatistics,
        error: errorStatistics,
        refetch: refetchStatistics,
    } = trpc.getTraceStatistic.useQuery(timeRangeFilter, {
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
        error: errorTrace,
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

    // Filter traces based on search
    const filteredTraces = useMemo(() => {
        if (!traceListData?.traces) return [];
        if (!searchText) return traceListData.traces;

        const searchValue = searchText.toLowerCase();
        return traceListData.traces.filter((trace) => {
            switch (searchField) {
                case 'traceId':
                    return trace.traceId.toLowerCase().includes(searchValue);
                case 'name':
                    return trace.name.toLowerCase().includes(searchValue);
                default:
                    return (
                        trace.traceId.toLowerCase().includes(searchValue) ||
                        trace.name.toLowerCase().includes(searchValue)
                    );
            }
        });
    }, [traceListData?.traces, searchText, searchField]);

    const value: TraceContextType = useMemo(
        () => ({
            // Filter state
            timeRange,
            setTimeRange,
            searchText,
            setSearchText,
            searchField,
            setSearchField,

            // Pagination state
            page,
            setPage,
            pageSize,
            setPageSize,

            // Data
            traces: filteredTraces,
            statistics,
            traceData,
            isLoading,
            isLoadingStatistics,
            isLoadingTrace,
            error: error as Error | null,
            errorStatistics: errorStatistics as Error | null,
            errorTrace: errorTrace as Error | null,
            total: traceListData?.total || 0,

            // Time range filter
            timeRangeFilter,

            // Polling control
            pollingEnabled,
            setPollingEnabled,
            pollingInterval,
            setPollingInterval,

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
            refetchStatistics,
            refetchTrace,
        }),
        [
            timeRange,
            searchText,
            searchField,
            page,
            pageSize,
            filteredTraces,
            statistics,
            traceData,
            isLoading,
            isLoadingStatistics,
            isLoadingTrace,
            error,
            errorStatistics,
            errorTrace,
            traceListData?.total,
            timeRangeFilter,
            pollingEnabled,
            pollingInterval,
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
    defaultPollingInterval = 5000, // 5 seconds default
    defaultPollingEnabled = true,
}: TraceContextProviderProps) {
    return (
        <TrpcProvider>
            <TraceContextProviderInner
                defaultPollingInterval={defaultPollingInterval}
                defaultPollingEnabled={defaultPollingEnabled}
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
