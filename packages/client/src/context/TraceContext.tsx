import {
    RangeFilterOperator,
    TableRequestParams,
    Trace,
    TraceStatistics,
} from '@shared/types';
import dayjs from 'dayjs';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { trpc } from '../api/trpc';

export interface TraceContextType {
    // Filter state
    timeRange: 'week' | 'month' | 'all';
    setTimeRange: (range: 'week' | 'month' | 'all') => void;

    tableRequestParams: TableRequestParams;
    setTableRequestParams: (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => void;

    // Data
    traces: Trace[];
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
    selectedRootSpanId: string | null; // For orphan spans, only show this span and its descendants
    setSelectedRootSpanId: (spanId: string | null) => void;
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

// Helper function to calculate time range values
const getTimeRangeValues = (
    range: 'week' | 'month' | 'all',
): { startTime: string; endTime: string } | null => {
    const now = dayjs();

    switch (range) {
        case 'week':
            return {
                startTime: (
                    BigInt(now.subtract(7, 'day').startOf('day').valueOf()) *
                    BigInt(1_000_000)
                ).toString(),
                endTime: (
                    BigInt(now.endOf('day').valueOf()) * BigInt(1_000_000)
                ).toString(),
            };
        case 'month':
            return {
                startTime: (
                    BigInt(now.subtract(30, 'day').startOf('day').valueOf()) *
                    BigInt(1_000_000)
                ).toString(),
                endTime: (
                    BigInt(now.endOf('day').valueOf()) * BigInt(1_000_000)
                ).toString(),
            };
        case 'all':
        default:
            return null;
    }
};

export function TraceContextProvider({
    children,
    pollingInterval = 5000,
    pollingEnabled = true,
}: TraceContextProviderProps) {
    // Filter state
    const [timeRange, setTimeRangeState] = useState<'week' | 'month' | 'all'>(
        'week',
    );

    // Initialize tableRequestParams with time range filter
    const initialTimeRange = getTimeRangeValues('week');
    const [tableRequestParams, setTableRequestParams] =
        useState<TableRequestParams>({
            pagination: {
                page: 1,
                pageSize: 10,
            },
            filters: initialTimeRange
                ? {
                      timeRange: {
                          operator: RangeFilterOperator.BETWEEN,
                          value: [
                              initialTimeRange.startTime,
                              initialTimeRange.endTime,
                          ],
                      },
                  }
                : undefined,
        });

    // Selected trace
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
    const [selectedRootSpanId, setSelectedRootSpanId] = useState<string | null>(
        null,
    );
    const [drawerOpen, setDrawerOpen] = useState(false);

    const setTimeRange = (range: 'week' | 'month' | 'all') => {
        setTimeRangeState(range);
        const timeValues = getTimeRangeValues(range);
        setTableRequestParams((prev) => ({
            ...prev,
            pagination: { ...prev.pagination, page: 1 },
            filters: timeValues
                ? {
                      ...prev.filters,
                      timeRange: {
                          operator: RangeFilterOperator.BETWEEN,
                          value: [timeValues.startTime, timeValues.endTime],
                      },
                  }
                : Object.fromEntries(
                      Object.entries(prev.filters || {}).filter(
                          ([key]) => key !== 'timeRange',
                      ),
                  ),
        }));
    };

    const timeRangeFilter = useMemo(() => {
        const timeValues = getTimeRangeValues(timeRange);
        return timeValues
            ? { startTime: timeValues.startTime, endTime: timeValues.endTime }
            : { startTime: undefined, endTime: undefined };
    }, [timeRange]);

    const {
        data: response,
        isLoading,
        error,
        refetch,
    } = trpc.getTraces.useQuery(tableRequestParams, {
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        staleTime: 0,
        gcTime: 0,
        refetchInterval: pollingEnabled ? pollingInterval : false,
        refetchIntervalInBackground: true,
    });

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
    const traces = response?.data?.list || [];

    const value: TraceContextType = useMemo(
        () => ({
            // Filter state
            timeRange,
            setTimeRange,

            // Table request params
            tableRequestParams,
            setTableRequestParams,

            // Data
            traces,
            statistics,
            traceData,
            isLoading,
            isLoadingTrace,
            error: error as Error | null,
            total: response?.data?.total || 0,

            // Selected trace
            selectedTraceId,
            setSelectedTraceId,
            selectedRootSpanId,
            setSelectedRootSpanId,
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
            tableRequestParams,
            traces,
            statistics,
            traceData,
            isLoading,
            isLoadingTrace,
            error,
            response?.data?.total || 0,
            selectedTraceId,
            selectedRootSpanId,
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

export function useTraceContext() {
    const context = useContext(TraceContext);
    if (!context) {
        throw new Error(
            'useTraceContext must be used within a TraceContextProvider',
        );
    }
    return context;
}
