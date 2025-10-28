import React, {
    memo,
    useMemo,
    useCallback,
    useState,
    useEffect,
    useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from 'lucide-react';

import { cn } from '@/utils/common';
import { useMessageApi } from '@/context/MessageApiContext';
import { Button } from '@/components/shadcn-ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn-ui/Select';
import { Checkbox } from '@/components/shadcn-ui/Checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/shadcn-ui';
import type { TableRequestParams } from '@shared/types';
import type { ShadcnTableProps, SortOrder, PaginationState } from './types';

/**
* A general-purpose table component based on the shadcn/ui style
* Supports paging, sorting, API integration, and other features
*/
const ShadcnTable = <T extends Record<string, unknown> = Record<string, unknown>>({
    columns,
    dataSource: externalDataSource,
    loading: externalLoading,
    pagination = {},
    apiFunction,
    initialParams,
    rowKey = 'id',
    rowSelection,
    onRow,
    className,
    // size: _size = 'middle', // Not used yet, reserved for future expansion
    bordered = true,
    sticky = false,
    onReady,
}: ShadcnTableProps<T>) => {
    const { t } = useTranslation();
    const { messageApi } = useMessageApi();

    // State Management
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [paginationState, setPaginationState] = useState<PaginationState>({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [sortField, setSortField] = useState<string | undefined>();
    const [sortOrder, setSortOrder] = useState<SortOrder>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // Preventing StrictMode from calling ref repeatedly
    const initializedRef = useRef(false);

    /**
     * Loading data
     */
    const loadData = useCallback(
        async (params: TableRequestParams) => {
            if (!apiFunction) return;

            setLoading(true);
            try {
                const response = await apiFunction(params);
                if (response.success && response.data) {
                    setData(response.data.list);
                    setPaginationState({
                        current: response.data.page,
                        pageSize: response.data.pageSize,
                        total: response.data.total,
                    });
                } else {
                    messageApi.error(response.message || 'Data loading failed');
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Data loading failed';
                messageApi.error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [apiFunction, messageApi],
    );

    /**
     * Initialize loading data
     */
    useEffect(() => {
        if (apiFunction && !initializedRef.current) {
            initializedRef.current = true;

            const loadInitialData = async () => {
                const params: TableRequestParams = {
                    pagination: {
                        page: initialParams?.pagination?.page || 1,
                        pageSize: initialParams?.pagination?.pageSize || 10,
                    },
                    sort: initialParams?.sort,
                    filters: initialParams?.filters,
                };

                setLoading(true);
                try {
                    const response = await apiFunction(params);
                    if (response.success && response.data) {
                        setData(response.data.list);
                        setPaginationState({
                            current: response.data.page,
                            pageSize: response.data.pageSize,
                            total: response.data.total,
                        });
                    } else {
                        messageApi.error(response.message || '数据加载失败');
                    }
                } catch (error) {
                    console.error('ShadcnTable: API 错误', error);
                    const errorMessage =
                        error instanceof Error ? error.message : '数据加载失败';
                    messageApi.error(errorMessage);
                } finally {
                    setLoading(false);
                }
            };

            loadInitialData();
        }
    }, [apiFunction, messageApi]);

    // Expose imperative API via onReady
    useEffect(() => {
        if (!onReady) return;
        onReady({
            reload: () => {
                const params: TableRequestParams = {
                    pagination: {
                        page: paginationState.current,
                        pageSize: paginationState.pageSize,
                    },
                };
                if (sortField && sortOrder) {
                    params.sort = {
                        field: sortField,
                        order: sortOrder === 'ascend' ? 'asc' : 'desc',
                    };
                }
                loadData(params);
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onReady, paginationState.current, paginationState.pageSize, sortField, sortOrder]);

    /**
     * Handling table changes (paging, sorting, filtering)
     */
    const handleTableChange = useCallback(
        (
            newPagination: { current: number; pageSize: number },
            newSortField?: string,
            newSortOrder?: SortOrder,
        ) => {
            if (!apiFunction) return;

            // Update local paging status immediately
            setPaginationState(prev => ({
                ...prev,
                current: newPagination.current,
                pageSize: newPagination.pageSize,
            }));

            const params: TableRequestParams = {
                pagination: {
                    page: newPagination.current,
                    pageSize: newPagination.pageSize,
                },
            };

            if (newSortField && newSortOrder) {
                params.sort = {
                    field: newSortField,
                    order: newSortOrder === 'ascend' ? 'asc' : 'desc',
                };
                setSortField(newSortField);
                setSortOrder(newSortOrder);
            } else {
                setSortField(undefined);
                setSortOrder(undefined);
            }

            loadData(params);
        },
        [apiFunction, loadData],
    );

    /**
     * Processing sorting
     */
    const handleSort = useCallback(
        (field: string) => {
            if (!apiFunction) return;

            let newSortOrder: SortOrder;
            if (sortField === field) {
                if (sortOrder === 'ascend') {
                    newSortOrder = 'descend';
                } else if (sortOrder === 'descend') {
                    newSortOrder = undefined;
                } else {
                    newSortOrder = 'ascend';
                }
            } else {
                newSortOrder = 'ascend';
            }

            handleTableChange(paginationState, field, newSortOrder);
        },
        [apiFunction, sortField, sortOrder, paginationState, handleTableChange],
    );

    /**
     * Handling paging changes
     */
    const handlePaginationChange = useCallback(
        (page: number, pageSize: number) => {
            handleTableChange(
                { current: page, pageSize },
                sortField,
                sortOrder,
            );
        },
        [handleTableChange, sortField, sortOrder],
    );

    /**
     * Render sort icons
     */
    const renderSortIcon = useCallback(
        (field: string) => {
            if (sortField !== field) {
                return (
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                );
            }
            if (sortOrder === 'ascend') {
                return <ChevronUp className="h-4 w-4 text-foreground" />;
            }
            if (sortOrder === 'descend') {
                return <ChevronDown className="h-4 w-4 text-foreground" />;
            }
            return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
        },
        [sortField, sortOrder],
    );

    /**
     * Handling row selection
     */
    const handleRowSelection = useCallback(
        (record: T, checked: boolean) => {
            const key =
                typeof rowKey === 'function'
                    ? rowKey(record)
                    : record[rowKey as keyof T];
            const newSelectedKeys = checked
                ? [...selectedRowKeys, key as React.Key]
                : selectedRowKeys.filter((k) => k !== key);

            setSelectedRowKeys(newSelectedKeys);
            rowSelection?.onChange(newSelectedKeys);
        },
        [selectedRowKeys, rowKey, rowSelection],
    );

    /**
     * Processing Select All
     */
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            const newSelectedKeys = checked
                ? data.map((record) => {
                      const key =
                          typeof rowKey === 'function'
                              ? rowKey(record)
                              : record[rowKey as keyof T];
                      return key as React.Key;
                  })
                : [];

            setSelectedRowKeys(newSelectedKeys);
            rowSelection?.onChange(newSelectedKeys);
        },
        [data, rowKey, rowSelection],
    );

    /**
     * Get row key value
     */
    const getRowKey = useCallback(
        (record: T, index: number) => {
            if (typeof rowKey === 'function') {
                return rowKey(record);
            }
            return (record[rowKey as keyof T] as React.Key) || index;
        },
        [rowKey],
    );

    // Use external data sources or internal data
    const dataSource = externalDataSource || data;
    const isLoading = externalLoading !== undefined ? externalLoading : loading;

    // Paging Configuration
    const paginationConfig = useMemo(() => {
        if (pagination === false) return null;

        const defaultConfig = {
            current: paginationState.current,
            pageSize: paginationState.pageSize,
            total: paginationState.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number, range: [number, number]) =>
                t('table.pagination.show-total', {
                    start: range[0],
                    end: range[1],
                    total,
                }) || `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSizeOptions: [10, 20, 50, 100],
        };

        return {
            ...defaultConfig,
            ...pagination,
        };
    }, [pagination, paginationState, t]);

    return (
        <div className={cn('w-full', className)}>
            {/* Table container */}
            <div
                className={cn(
                    'relative rounded-lg',
                    bordered && 'border border-border',
                )}
            >
                <div 
                    className={cn(
                        'relative overflow-x-auto',
                        sticky && 'overflow-y-auto',
                    )}
                    style={sticky ? { maxHeight: '53vh' } : undefined}
                >
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-background">
                            <TableRow>
                                {/* Select columns */}
                                {rowSelection && (
                                    <TableHead
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Checkbox
                                            checked={
                                                selectedRowKeys.length ===
                                                    dataSource.length &&
                                                dataSource.length > 0
                                            }
                                            onCheckedChange={(checked) => {
                                                handleSelectAll(checked as boolean);
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        />
                                    </TableHead>
                                )}

                                {/* Data columns */}
                                {columns.map((column, index) => (
                                    <TableHead
                                        key={column.key as string}
                                        className={cn(
                                            column.align === 'center' &&
                                                'text-center',
                                            column.align === 'right' &&
                                                'text-right',
                                            column.fixed === 'left' &&
                                                'sticky left-0 bg-background z-10',
                                            column.fixed === 'right' &&
                                                'sticky right-0 bg-background z-10',
                                            column.sorter &&
                                                'cursor-pointer select-none hover:bg-muted/50',
                                            index === 0 &&
                                                !rowSelection &&
                                                'sticky left-0 bg-background z-10',
                                        )}
                                        style={{ width: column.width }}
                                        onClick={() =>
                                            column.sorter &&
                                            handleSort(column.key as string)
                                        }
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{column.title}</span>
                                            {column.sorter &&
                                                renderSortIcon(
                                                    column.key as string,
                                                )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={
                                            columns.length +
                                            (rowSelection ? 1 : 0)
                                        }
                                        className="h-24 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>loading...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : dataSource.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={
                                            columns.length +
                                            (rowSelection ? 1 : 0)
                                        }
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No data yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                dataSource.map((record, index) => {
                                    const rowProps =
                                        onRow?.(record, index) || {};
                                    return (
                                        <TableRow
                                            key={getRowKey(record, index)}
                                            className={cn(
                                                'border-b border-border transition-colors hover:bg-muted/50',
                                                rowProps.className,
                                            )}
                                            style={rowProps.style}
                                            onClick={rowProps.onClick}
                                        >
                                            {/* Select columns */}
                                            {rowSelection && (
                                                <TableCell 
                                                    className="[&:has([role=checkbox])]:pr-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox
                                                        checked={selectedRowKeys.includes(
                                                            getRowKey(
                                                                record,
                                                                index,
                                                            ),
                                                        )}
                                                        onCheckedChange={(checked) => {
                                                            handleRowSelection(
                                                                record,
                                                                checked as boolean,
                                                            );
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    />
                                                </TableCell>
                                            )}

                                            {/* Data columns */}
                                            {columns.map((column) => (
                                                <TableCell
                                                    key={column.key as string}
                                                    className={cn(
                                                        column.align ===
                                                            'center' &&
                                                            'text-center',
                                                        column.align ===
                                                            'right' &&
                                                            'text-right',
                                                        column.ellipsis &&
                                                            'truncate',
                                                        column.fixed ===
                                                            'left' &&
                                                            'sticky left-0 bg-background z-10',
                                                        column.fixed ===
                                                            'right' &&
                                                            'sticky right-0 bg-background z-10',
                                                    )}
                                                >
                                                    {column.render
                                                        ? column.render(
                                                              record[
                                                                  column.dataIndex as keyof T
                                                              ] ||
                                                                  record[
                                                                      column.key as keyof T
                                                                  ],
                                                              record,
                                                              index,
                                                          )
                                                        : String(
                                                              record[
                                                                  column.dataIndex as keyof T
                                                              ] ||
                                                                  record[
                                                                      column.key as keyof T
                                                                  ] ||
                                                                  '',
                                                          )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {paginationConfig && (
                <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm text-muted-foreground">
                            {paginationConfig.showTotal?.(
                                paginationConfig.total,
                                [
                                    (paginationConfig.current - 1) *
                                        paginationConfig.pageSize +
                                        1,
                                    Math.min(
                                        paginationConfig.current *
                                            paginationConfig.pageSize,
                                        paginationConfig.total,
                                    ),
                                ],
                            )}
                        </p>
                    </div>

                    <div className="flex items-center space-x-6 lg:space-x-8">
                        {paginationConfig.showSizeChanger && (
                            <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium whitespace-nowrap">每页显示</p>
                                <Select
                                    value={paginationConfig.pageSize.toString()}
                                    onValueChange={(value) =>
                                        handlePaginationChange(1, Number(value))
                                    }
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paginationConfig.pageSizeOptions?.map(
                                            (size) => (
                                                <SelectItem key={size} value={size.toString()}>
                                                    {size}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm font-medium">条</p>
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={paginationConfig.current <= 1}
                                onClick={() =>
                                    handlePaginationChange(
                                        paginationConfig.current - 1,
                                        paginationConfig.pageSize,
                                    )
                                }
                            >
                                Previous
                            </Button>

                            <span className="text-sm font-medium">
                                Page {paginationConfig.current}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    paginationConfig.current >=
                                    Math.ceil(
                                        paginationConfig.total /
                                            paginationConfig.pageSize,
                                    )
                                }
                                onClick={() =>
                                    handlePaginationChange(
                                        paginationConfig.current + 1,
                                        paginationConfig.pageSize,
                                    )
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(ShadcnTable) as typeof ShadcnTable;

