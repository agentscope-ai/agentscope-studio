import { memo, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableColumnsType, TableColumnType } from 'antd';
import { TableProps } from 'antd/es/table/InternalTable';

import EmptyData from '@/components/tables/EmptyData.tsx';
import { renderSortIcon, renderTitle } from '@/components/tables/utils.tsx';

interface AsTableProps<T> extends Omit<TableProps<T>, 'columns'> {
    columns: TableColumnsType<T>;
}

const AsTable = <T extends object>({ columns, ...rest }: AsTableProps<T>) => {
    const { t } = useTranslation();

    /**
     * Generic sorter function that handles number and string comparisons.
     * Returns undefined for unsupported types to disable sorting.
     */
    const generalSorter = useCallback(
        <K extends keyof T>(a: T, b: T, key: K) => {
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
        },
        [],
    );

    /**
     * Process columns with enhanced functionality:
     * - Internationalized titles
     * - Built-in sorting
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
                sorter: columnKey
                    ? (a: T, b: T) => {
                          const result = generalSorter(a, b, columnKey);
                          return result ?? 0;
                      }
                    : false,
                sortIcon: (sortOrder) => renderSortIcon(sortOrder, true),
            };

            if (index === 0) {
                baseProps.fixed = 'left';
            }

            return {
                ...baseProps,
                ...column,
            } as TableColumnType<T>;
        });
    }, [columns, t, generalSorter]);

    /**
     * Localized table text configuration.
     */
    const tableLocale = useMemo(
        () => ({
            emptyText: <EmptyData />,
            cancelSort: t('tooltip.table.cancel-sort'),
            triggerAsc: t('tooltip.table.trigger-asc'),
            triggerDesc: t('tooltip.table.trigger-desc'),
            sortTitle: t('tooltip.table.sort-title'),
            ...rest.locale,
        }),
        [t, rest.locale],
    );

    return (
        <Table<T>
            className="h-full w-full rounded-md [&_.ant-table]:border"
            columns={updatedColumns}
            locale={tableLocale}
            size="small"
            sticky
            showSorterTooltip={{ target: 'full-header' }}
            {...rest}
        />
    );
};

export default memo(AsTable) as typeof AsTable;
