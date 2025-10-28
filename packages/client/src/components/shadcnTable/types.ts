/**
 * Type definitions related to the ShadcnTable component
 */

import type { TableRequestParams, ResponseBody, TableData } from '@shared/types';

/**
 * Paging Configuration Interface
 */
export interface PaginationConfig {
    page?: number;
    pageSize?: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: (total: number, range: [number, number]) => string;
    pageSizeOptions?: number[];
}

/**
 * Table column definition interface
 */
export interface TableColumn<T> {
    key: keyof T | string;
    title: string;
    dataIndex?: keyof T | string;
    width?: string | number;
    fixed?: 'left' | 'right';
    align?: 'left' | 'center' | 'right';
    sorter?: boolean | ((a: T, b: T) => number);
    render?: (value: unknown, record: T, index: number) => React.ReactNode;
    sortOrder?: 'ascend' | 'descend';
    ellipsis?: boolean;
}

/**
 * Table property interface
 */
export interface ShadcnTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
    columns: TableColumn<T>[];
    dataSource?: T[];
    loading?: boolean;
    pagination?: PaginationConfig | false;
    /**
     * Called when the table is ready. Provides imperative APIs like reload.
     */
    onReady?: (api: { reload: () => void }) => void;
    apiFunction?: (params: TableRequestParams) => Promise<ResponseBody<TableData<T>>>;
    initialParams?: Partial<TableRequestParams>;
    rowKey?: keyof T | string | ((record: T) => string);
    rowSelection?: {
        selectedRowKeys: React.Key[];
        onChange: (selectedRowKeys: React.Key[]) => void;
    };
    onRow?: (record: T, index: number) => {
        onClick?: (event: React.MouseEvent) => void;
        style?: React.CSSProperties;
        className?: string;
    };
    className?: string;
    size?: 'small' | 'middle' | 'large';
    bordered?: boolean;
    sticky?: boolean;
}

/**
 * Sort order
 */
export type SortOrder = 'ascend' | 'descend' | undefined;

/**
 * Paging status
 */
export interface PaginationState {
    current: number;
    pageSize: number;
    total: number;
}
