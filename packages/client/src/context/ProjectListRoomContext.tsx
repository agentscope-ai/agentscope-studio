import {
    createContext,
    useContext,
    ReactNode,
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { debounce } from 'lodash';

import { ProjectData, SocketEvents, TableRequestParams } from '@shared/types';
import { trpcClient, trpc } from '@/api/trpc';
import { useSocket } from './SocketContext';
import { useMessageApi } from './MessageApiContext.tsx';
import type {
    SorterResult,
    TablePaginationConfig,
} from 'antd/es/table/interface';

// Define Context type
interface ProjectListRoomContextType {
    // API
    getProjects: (params: TableRequestParams) => Promise<unknown>;
    deleteProjects: (projects: string[]) => void;
    // Search
    searchText: string;
    setSearchText: (text: string) => void;
    // Table driven data
    tableLoading: boolean;
    tableDataSource: ProjectData[];
    pagination: { current: number; pageSize: number; total: number };
    onTableChange: (
        pagination: TablePaginationConfig,
        _ignored: unknown,
        sorter: SorterResult<ProjectData> | SorterResult<ProjectData>[],
    ) => void;
    refresh: () => void;
    // Polling control
    isPolling: boolean;
    startPolling: () => void;
    stopPolling: () => void;
}

// Create context
const ProjectListRoomContext = createContext<ProjectListRoomContextType | null>(
    null,
);

interface Props {
    children: ReactNode;
}

export function ProjectListRoomContextProvider({ children }: Props) {
    const socket = useSocket();
    const [searchText, setSearchText] = useState<string>('');
    const { messageApi } = useMessageApi();

    // Table state
    const [tableLoading, setTableLoading] = useState<boolean>(false);
    const [tableDataSource, setTableDataSource] = useState<ProjectData[]>([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(
        undefined,
    );

    // Polling state
    const [isPolling, setIsPolling] = useState<boolean>(false);
    const pollingInterval = 5000; // 5-second polling interval
    const initialFetchDelayRef = useRef<boolean>(false);
    const isUserActionRef = useRef<boolean>(false);

    /** Stop polling */
    const stopPolling = useCallback(() => {
        setIsPolling(false);
    }, []);

    /** Start polling */
    const startPolling = useCallback(() => {
        setIsPolling(true);
    }, []);

    /**
     * tRPC: Get project list (for manual calls)
     */
    const getProjects = useCallback(
        async (params: TableRequestParams) => {
            try {
                return await trpcClient.getProjects.query(params);
            } catch (error: unknown) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                messageApi.error(errorMessage);
                throw error;
            }
        },
        [messageApi],
    );

    // Build query parameters based on current state
    const queryParams = useMemo<TableRequestParams>(
        () => ({
            pagination: {
                page: pagination.current,
                pageSize: pagination.pageSize,
            },
            filters: searchText ? { project: searchText } : undefined,
            sort: sortField
                ? {
                      field: sortField,
                      order: sortOrder || 'asc',
                  }
                : undefined,
        }),
        [
            pagination.current,
            pagination.pageSize,
            searchText,
            sortField,
            sortOrder,
        ],
    );

    // Use tRPC useQuery with polling
    const {
        data: queryData,
        isLoading: queryLoading,
        isFetching: queryFetching,
        error: queryError,
        refetch: refetchQuery,
    } = trpc.getProjects.useQuery(queryParams, {
        enabled: true, // Always enabled for initial load
        refetchInterval: isPolling ? pollingInterval : false,
        // When polling and not user action, only notify on data changes to avoid triggering loading state
        // When user action, always notify on isLoading to show loading state
        notifyOnChangeProps:
            isPolling && !isUserActionRef.current
                ? ['data']
                : ['data', 'isLoading', 'isFetching'],
    });

    // Handle query errors
    useEffect(() => {
        if (queryError) {
            const errorMessage =
                queryError instanceof Error
                    ? queryError.message
                    : String(queryError);
            messageApi.error(errorMessage);
        }
    }, [queryError, messageApi]);

    // Update table data when query data changes
    useEffect(() => {
        if (queryData?.success && queryData?.data) {
            setTableDataSource(queryData.data.list);
            setPagination((prev) => ({
                current: queryData.data?.page || prev.current,
                pageSize: queryData.data?.pageSize || prev.pageSize,
                total: queryData.data?.total || 0,
            }));
            // Reset user action flag after data is loaded
            if (isUserActionRef.current && !queryFetching) {
                isUserActionRef.current = false;
            }
        } else if (queryData && !queryData.success) {
            messageApi.error(queryData.message || 'Failed to load projects');
            // Reset user action flag on error
            if (isUserActionRef.current) {
                isUserActionRef.current = false;
            }
        }
    }, [queryData, queryFetching, messageApi]);

    // Set loading state
    // Show loading when: user action OR not polling OR actively fetching
    useEffect(() => {
        if (isUserActionRef.current || !isPolling || queryFetching) {
            setTableLoading(queryLoading || queryFetching);
        } else {
            // When polling and not user action, don't show loading to avoid flicker
            setTableLoading(false);
        }
    }, [queryLoading, queryFetching, isPolling]);

    // Initialize: delay first fetch and start polling after 1 second
    useEffect(() => {
        if (!initialFetchDelayRef.current) {
            initialFetchDelayRef.current = true;
            const timer = window.setTimeout(() => {
                startPolling();
            }, 1000);
            return () => {
                clearTimeout(timer);
            };
        }
    }, [startPolling]);

    /** Create debounced search function */
    const debouncedSearch = useMemo(
        () =>
            debounce(() => {
                // Mark as user action
                isUserActionRef.current = true;
                // Reset to first page when searching
                setPagination((prev) => ({
                    ...prev,
                    current: 1,
                }));
                // Stop polling temporarily to show loading state
                stopPolling();
                // The query will automatically refetch when queryParams change
                // Restart polling after a delay
                setTimeout(() => {
                    startPolling();
                }, 100);
            }, 500),
        [stopPolling, startPolling],
    );

    const isFirstSearch = useRef(true);

    /** When the search changes (with debounce) */
    useEffect(() => {
        if (isFirstSearch.current) {
            isFirstSearch.current = false;
            return;
        }

        debouncedSearch(searchText);

        // Cleanup function to cancel pending debounced calls
        return () => {
            debouncedSearch.cancel();
        };
    }, [searchText, debouncedSearch]);

    /** Table change (pagination/sorting) */
    const onTableChange = useCallback(
        (
            pageInfo: TablePaginationConfig,
            _ignored: unknown,
            sorter: SorterResult<ProjectData> | SorterResult<ProjectData>[],
        ) => {
            const nextPage = pageInfo.current ?? 1;
            const nextSize = pageInfo.pageSize ?? pagination.pageSize;

            let nextSortField: string | undefined = undefined;
            let nextSortOrder: 'asc' | 'desc' | undefined = undefined;

            // Handle sorting logic
            if (sorter && !Array.isArray(sorter) && sorter.field) {
                if (sorter.order) {
                    // There is a sorting direction, set the sorting
                    nextSortField = String(sorter.field);
                    nextSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
                }
            }

            // Mark as user action
            isUserActionRef.current = true;

            setSortField(nextSortField);
            setSortOrder(nextSortOrder);
            setPagination((prev) => ({
                ...prev,
                current: nextPage,
                pageSize: nextSize,
            }));

            // Stop polling temporarily to show loading state
            stopPolling();
            // The query will automatically refetch when queryParams change
            // Restart polling after a delay
            setTimeout(() => {
                startPolling();
            }, 100);
        },
        [pagination.pageSize, stopPolling, startPolling],
    );

    const refresh = useCallback(() => {
        // Mark as user action
        isUserActionRef.current = true;
        // Manually refetch the query
        refetchQuery();
        // Stop polling temporarily to show loading state
        stopPolling();
        // Restart polling after a delay
        setTimeout(() => {
            startPolling();
        }, 100);
    }, [refetchQuery, stopPolling, startPolling]);

    // After deleting a project, refresh the project list
    const deleteProjects = (projects: string[]) => {
        if (!socket) {
            messageApi.error(
                'Server is not connected, please refresh the page.',
            );
        } else {
            socket.emit(
                SocketEvents.client.deleteProjects,
                projects,
                (response: { success: boolean; message?: string }) => {
                    if (response.success) {
                        messageApi.success('Projects deleted successfully.');
                        refresh();
                    } else {
                        messageApi.error(
                            response.message || 'Failed to delete projects.',
                        );
                    }
                },
            );
        }
    };

    /** Auto-stop polling when component unmounts */
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    return (
        <ProjectListRoomContext.Provider
            value={{
                getProjects,
                deleteProjects,
                searchText,
                setSearchText,
                tableLoading,
                tableDataSource,
                pagination,
                onTableChange,
                refresh,
                isPolling,
                startPolling,
                stopPolling,
            }}
        >
            {children}
        </ProjectListRoomContext.Provider>
    );
}

export function useProjectListRoom() {
    const context = useContext(ProjectListRoomContext);
    if (!context) {
        throw new Error(
            'useProjectListRoom must be used within a ProjectListRoomProvider',
        );
    }
    return context;
}
