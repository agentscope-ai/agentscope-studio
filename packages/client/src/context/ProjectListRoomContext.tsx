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

import {
    ProjectData,
    SocketEvents,
    SocketRoomName,
    TableRequestParams,
} from '@shared/types';
import { trpcClient } from '@/api/trpc';
import { useSocket } from './SocketContext';
import { useMessageApi } from './MessageApiContext.tsx';
import type {
    SorterResult,
    TablePaginationConfig,
} from 'antd/es/table/interface';

// Define Context type
interface ProjectListRoomContextType {
    projects: ProjectData[];
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
    const [projects, setProjects] = useState<ProjectData[]>([]);
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
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingCountRef = useRef<number>(0);
    const maxPollingCount = 1000; // Maximum number of polls
    const pollingInterval = 5000; // 5-second polling interval

    // Store current state for polling
    const currentStateRef = useRef({
        pagination: { current: 1, pageSize: 10, total: 0 },
        searchText: '',
        sortField: undefined as string | undefined,
        sortOrder: undefined as 'asc' | 'desc' | undefined,
    });

    // Sync current state to ref for polling
    useEffect(() => {
        currentStateRef.current = {
            pagination,
            searchText,
            sortField,
            sortOrder,
        };
    }, [pagination, searchText, sortField, sortOrder]);

    useEffect(() => {
        if (!socket) {
            return;
        }

        // 进入 projectList room
        socket.emit(SocketEvents.client.joinProjectListRoom);

        // Handle data updates
        socket.on(
            SocketEvents.server.pushProjects,
            (projects: ProjectData[]) => {
                setProjects(projects);
            },
        );

        // When leaving, clean up
        return () => {
            socket.off(SocketEvents.server.pushProjects);
            socket.emit(
                SocketEvents.client.leaveRoom,
                SocketRoomName.ProjectListRoom,
            );
        };
    }, [socket]);

    /**
     * tRPC: Get project list
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

    /**
     * Fetch and write table data
     */
    const fetchTableData = useCallback(
        async (params: TableRequestParams) => {
            setTableLoading(true);
            try {
                const res = await getProjects(params);
                // Parse the actual response structure
                if (res.success && res.data) {
                    setTableDataSource(res.data.list);
                    setPagination({
                        current: res.data.page,
                        pageSize: res.data.pageSize,
                        total: res.data.total,
                    });
                } else {
                    messageApi.error(res.message || 'Failed to load projects');
                }
            } catch (error) {
                console.error('Failed to load data', error);
            } finally {
                setTableLoading(false);
            }
        },
        [getProjects, messageApi],
    );

    /** Silent refresh for polling - only updates data without affecting UI state */
    const silentRefresh = useCallback(async () => {
        try {
            const currentState = currentStateRef.current;

            const res = await getProjects({
                pagination: {
                    page: currentState.pagination.current,
                    pageSize: currentState.pagination.pageSize,
                },
                filters: currentState.searchText
                    ? { project: currentState.searchText }
                    : undefined,
                sort: currentState.sortField
                    ? {
                          field: currentState.sortField,
                          order: currentState.sortOrder || 'asc',
                      }
                    : undefined,
            });

            // Parse the actual response structure
            if (res.success && res.data) {
                setTableDataSource(res.data.list);
                setPagination((prev) => ({
                    ...prev,
                    total: res.data?.total || 0,
                }));
            }
        } catch (error) {
            console.error('Silent refresh failed', error);
        }
    }, [getProjects]);

    /** When the component initializes, load data */
    useEffect(() => {
        fetchTableData({
            pagination: { page: 1, pageSize: 10 },
            filters: undefined,
            sort: undefined,
        });
    }, [fetchTableData]);

    /** Create debounced search function */
    const debouncedSearch = useMemo(
        () =>
            debounce((searchValue: string) => {
                fetchTableData({
                    pagination: { page: 1, pageSize: pagination.pageSize },
                    filters: searchValue ? { project: searchValue } : undefined,
                    sort: sortField
                        ? { field: sortField, order: sortOrder || 'asc' }
                        : undefined,
                });
            }, 500),
        [fetchTableData, pagination.pageSize, sortField, sortOrder],
    );

    /** When the search changes (with debounce) */
    useEffect(() => {
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

            setSortField(nextSortField);
            setSortOrder(nextSortOrder);

            const requestParams = {
                pagination: { page: nextPage, pageSize: nextSize },
                filters: searchText ? { project: searchText } : undefined,
                sort: nextSortField
                    ? { field: nextSortField, order: nextSortOrder || 'asc' }
                    : undefined,
            };

            fetchTableData(requestParams);
        },
        [fetchTableData, pagination.pageSize, searchText],
    );

    const refresh = useCallback(() => {
        fetchTableData({
            pagination: {
                page: pagination.current,
                pageSize: pagination.pageSize,
            },
            filters: searchText ? { project: searchText } : undefined,
            sort: sortField
                ? { field: sortField, order: sortOrder || 'asc' }
                : undefined,
        });
    }, [fetchTableData, pagination, searchText, sortField, sortOrder]);

    /** Stop polling */
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearTimeout(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setIsPolling(false);
        pollingCountRef.current = 0;
    }, []);

    /** Start polling */
    const startPolling = useCallback(() => {
        if (isPolling || pollingIntervalRef.current) {
            return;
        }

        setIsPolling(true);
        pollingCountRef.current = 0;

        const poll = async () => {
            // Check if we've reached max polling count
            if (pollingCountRef.current >= maxPollingCount) {
                stopPolling();
                return;
            }

            pollingCountRef.current += 1;
            // Silent refresh without affecting UI
            await silentRefresh();

            // Schedule next poll
            if (pollingIntervalRef.current) {
                pollingIntervalRef.current = setTimeout(poll, pollingInterval);
            }
        };

        // Start first poll after interval
        pollingIntervalRef.current = setTimeout(poll, pollingInterval);
    }, [isPolling, silentRefresh, stopPolling]);

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

    /** Auto-start polling when component mounts */
    useEffect(() => {
        // Start polling after initial data load
        const timer = setTimeout(() => {
            startPolling();
        }, 1000); // Wait 1 second after mount to start polling

        return () => {
            clearTimeout(timer);
        };
    }, [startPolling]);

    /** Cleanup polling on unmount */
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    return (
        <ProjectListRoomContext.Provider
            value={{
                projects,
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
