import { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Table, TableColumnsType, TableColumnType, PaginationProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { TableProps } from 'antd/es/table/InternalTable';
import type { SorterResult } from 'antd/es/table/interface';

import EmptyData from '@/components/tables/EmptyData.tsx';
import { renderSortIcon, renderTitle } from '@/components/tables/utils.tsx';
import { useMessageApi } from '@/context/MessageApiContext';
import type { TableRequestParams, ResponseBody, TableData } from '@shared/types';

/**
 * 分页配置接口
 */
interface PaginationConfig {
    page?: number;
    pageSize?: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: (total: number, range: [number, number]) => string;
    pageSizeOptions?: string[];
}

/**
 * AsTable 组件属性
 */
interface AsTableProps<T> extends Omit<TableProps<T>, 'dataSource' | 'pagination' | 'loading' | 'onChange'> {
    columns: TableColumnsType<T>;
    dataSource?: T[];
    loading?: boolean;
    pagination?: PaginationConfig | false;
    apiFunction?: (params: TableRequestParams) => Promise<ResponseBody<TableData<T>>>;
    initialParams?: Partial<TableRequestParams>;
}

/**
 * Generic table component with built-in sorting, internationalization, pagination, and tRPC integration.
 * Provides consistent table behavior across the application.
 */
const AsTable = <T extends object>({ 
    columns, 
    dataSource: externalDataSource,
    loading: externalLoading,
    pagination = {},
    apiFunction,
    initialParams,
    ...rest 
}: AsTableProps<T>) => {
    const { t } = useTranslation();
    const { messageApi } = useMessageApi();

    // 状态管理
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [paginationState, setPaginationState] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [sortField, setSortField] = useState<string | undefined>();
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
    
    // 使用 ref 来跟踪是否已经初始化，避免 StrictMode 的重复调用
    const initializedRef = useRef(false);

    /**
     * 加载数据
     */
    const loadData = useCallback(async (params: TableRequestParams) => {
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
                messageApi.error(response.message || '数据加载失败');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '数据加载失败';
            messageApi.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [apiFunction, messageApi]);

    /**
     * 初始化加载 - 使用 ref 避免 StrictMode 重复调用
     */
    useEffect(() => {
        if (apiFunction && !initializedRef.current) {
            console.log('AsTable: 初始化加载数据', { apiFunction: !!apiFunction });
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
                    console.log('AsTable: API 响应', response);
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
                    console.error('AsTable: API 错误', error);
                    const errorMessage = error instanceof Error ? error.message : '数据加载失败';
                    messageApi.error(errorMessage);
                } finally {
                    setLoading(false);
                }
            };
            
            loadInitialData();
        }
    }, [apiFunction, messageApi]);

    /**
     * 处理表格变化（分页、排序、筛选）
     */
    const handleTableChange = useCallback((
        pagination: unknown,
        filters: unknown,
        sorter: SorterResult<T> | SorterResult<T>[]
    ) => {
        if (!apiFunction) return;

        const params: TableRequestParams = {
            pagination: {
                page: (pagination as any).current,
                pageSize: (pagination as any).pageSize,
            },
        };

        // 处理排序
        if (sorter && !Array.isArray(sorter) && sorter.field) {
            const field = sorter.field as string;
            const order = sorter.order === 'ascend' ? 'asc' : 'desc';
            
            params.sort = {
                field,
                order,
            };
            
            setSortField(field);
            setSortOrder(order);
        } else {
            setSortField(undefined);
            setSortOrder(undefined);
        }

        // 处理筛选
        if (filters) {
            const filterParams: Record<string, unknown> = {};
            Object.keys(filters as Record<string, unknown>).forEach(key => {
                const filterValue = (filters as Record<string, unknown>)[key];
                if (filterValue && Array.isArray(filterValue) && filterValue.length > 0) {
                    filterParams[key] = filterValue;
                }
            });
            if (Object.keys(filterParams).length > 0) {
                params.filters = filterParams;
            }
        }

        loadData(params);
    }, [apiFunction, loadData]);

    /**
     * Generic sorter function that handles number and string comparisons.
     * Returns undefined for unsupported types to disable sorting.
     */
    const generalSorter = useCallback(<K extends keyof T>(a: T, b: T, key: K) => {
        const valueA = a[key];
        const valueB = b[key];
        
        // Handle null/undefined values
        if (valueA == null || valueB == null) {
            if (valueA == null && valueB == null) return 0;
            return valueA == null ? -1 : 1;
        }
        
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return valueA - valueB;
        }
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return valueA.localeCompare(valueB);
        }
        
        return undefined;
    }, []);

    /**
     * Process columns with enhanced functionality:
     * - Internationalized titles
     * - Built-in sorting (client-side if no API, server-side if API provided)
     * - First column fixed and sorted by default
     * - Consistent styling
     */
    const updatedColumns: TableColumnsType<T> | undefined = useMemo(() => {
        if (!columns) return undefined;
        
        return columns.map((column, index) => {
            const columnKey = column.key as keyof T;
            const translationKey = columnKey?.toString().replace('_', '-');
            
            const baseProps: Partial<TableColumnType<T>> = {
                title: renderTitle(t(`table.column.${translationKey}`)),
                dataIndex: columnKey as string,
                ellipsis: true,
                // 如果有 API 函数，使用服务端排序；否则使用客户端排序
                sorter: apiFunction ? true : (columnKey ? (a: T, b: T) => {
                    const result = generalSorter(a, b, columnKey);
                    return result ?? 0;
                } : false),
                sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            };

            // 如果有 API 函数且当前列是排序字段，设置排序状态
            if (apiFunction && columnKey && sortField === columnKey) {
                baseProps.sortOrder = sortOrder === 'asc' ? 'ascend' : 'descend';
            }

            // First column gets special treatment
            if (index === 0) {
                baseProps.fixed = 'left';
            }

            return {
                ...baseProps,
                ...column,
            } as TableColumnType<T>;
        });
    }, [columns, t, generalSorter, apiFunction, sortField, sortOrder]);

    /**
     * 分页配置
     */
    const paginationConfig: PaginationProps | false = useMemo(() => {
        if (pagination === false) return false;
        
        const defaultConfig: PaginationProps = {
            current: paginationState.current,
            pageSize: paginationState.pageSize,
            total: paginationState.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
                t('table.pagination.show-total', { 
                    start: range[0], 
                    end: range[1], 
                    total 
                }),
            pageSizeOptions: ['10', '20', '50', '100'],
        };

        return {
            ...defaultConfig,
            ...pagination,
        };
    }, [pagination, paginationState, t]);

    /**
     * Localized table text configuration.
     */
    const tableLocale = useMemo(() => ({
        emptyText: <EmptyData />,
        cancelSort: t('tooltip.table.cancel-sort'),
        triggerAsc: t('tooltip.table.trigger-asc'),
        triggerDesc: t('tooltip.table.trigger-desc'),
        sortTitle: t('tooltip.table.sort-title'),
        ...rest.locale,
    }), [t, rest.locale]);

    // 决定使用哪个数据源
    const dataSource = externalDataSource || data;
    const isLoading = externalLoading !== undefined ? externalLoading : loading;

    return (
        <Table<T>
            className="h-full w-full border border-border rounded-md"
            columns={updatedColumns}
            dataSource={dataSource}
            loading={isLoading}
            pagination={paginationConfig}
            locale={tableLocale}
            size="small"
            sticky
            showSorterTooltip={{ target: 'full-header' }}
            onChange={apiFunction ? handleTableChange : undefined}
            {...rest}
        />
    );
};

export default memo(AsTable) as typeof AsTable;
