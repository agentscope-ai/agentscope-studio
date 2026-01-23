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

    // Process traces: calculate duration and apply pagination
    const allTraces = useMemo(() => {
        const rawTraces = response?.data?.list || [];
        return rawTraces.map((trace) => {
            // Calculate duration from startTime and endTime
            const startTimeNs = BigInt(trace.startTime || '0');
            const endTimeNs = BigInt(trace.endTime || '0');
            const duration = Number(endTimeNs - startTimeNs) / 1e9;

            return {
                ...trace,
                duration,
            } as Trace;
        });
    }, [response?.data?.list]);

    // Calculate statistics from all traces
    const statistics = useMemo<TraceStatistics | undefined>(() => {
        if (allTraces.length === 0) {
            return undefined;
        }

        let totalSpans = 0;
        let totalTokens = 0;
        const statusMap = new Map<number, number>();
        let errorTraces = 0;
        let totalDuration = 0;

        allTraces.forEach((trace) => {
            // Sum spans and tokens
            totalSpans += trace.spanCount || 0;
            totalTokens += trace.totalTokens || 0;

            // Count by status
            statusMap.set(trace.status, (statusMap.get(trace.status) || 0) + 1);

            // Count error traces
            if (trace.status === 2) {
                errorTraces++;
            }

            // Sum durations
            totalDuration += trace.duration;
        });

        const avgDuration =
            allTraces.length > 0 ? totalDuration / allTraces.length : 0;

        const tracesByStatus = Array.from(statusMap.entries()).map(
            ([status, count]) => ({
                status,
                count,
            }),
        );

        return {
            totalTraces: allTraces.length,
            totalSpans,
            errorTraces,
            avgDuration,
            totalTokens,
            tracesByStatus,
        };
    }, [allTraces]);

    // Apply pagination to get current page
    const traces = useMemo(() => {
        const page = tableRequestParams.pagination.page;
        const pageSize = tableRequestParams.pagination.pageSize;
        const skip = (page - 1) * pageSize;
        return allTraces.slice(skip, skip + pageSize);
    }, [
        allTraces,
        tableRequestParams.pagination.page,
        tableRequestParams.pagination.pageSize,
    ]);

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
            total: allTraces.length,

            // Selected trace
            selectedTraceId,
            setSelectedTraceId,
            drawerOpen,
            setDrawerOpen,

            // Refresh functions
            refetch,
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
            allTraces.length,
            selectedTraceId,
            drawerOpen,
            refetch,
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
