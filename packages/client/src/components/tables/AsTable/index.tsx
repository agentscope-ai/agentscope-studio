import { Key, memo, ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableColumnsType, TableColumnType } from 'antd';
import { TableProps } from 'antd/es/table/InternalTable';

import EmptyData from '@/components/tables/EmptyData.tsx';
import { AsPagination } from '@/components/tables/pagination.tsx';
import { renderSortIcon, renderTitle } from '@/components/tables/utils.tsx';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group.tsx';
import { StringFilterOperator, TableRequestParams } from '@shared/types';
import { ChevronDownIcon } from 'lucide-react';

interface AsTableProps<T> extends Omit<TableProps<T>, 'columns'> {
    columns: TableColumnsType<T>;
    tableRequestParams: TableRequestParams;
    setTableRequestParams: (
        updateFn: (params: TableRequestParams) => TableRequestParams,
    ) => void;
    total: number;
    selectedRowKeys: Key[] | undefined | null | (() => Key[]);
    setSelectedRowKeys: (keys: Key[]) => void;
    actions?: ReactNode;
    searchableColumns: Key[];
    /** Type for search placeholder, e.g., 'project', 'trace', 'evaluation' */
    searchType?: string;
}

const AsTable = <T extends object>({
    columns,
    tableRequestParams,
    setTableRequestParams,
    total,
    selectedRowKeys,
    setSelectedRowKeys,
    actions,
    searchableColumns = [],
    searchType,
    ...rest
}: AsTableProps<T>) => {
    const { t } = useTranslation();
    const defaultSearchField =
        columns.length > 0 ? columns[0].key?.toString() : undefined;
    const [searchField, setSearchField] = useState<string | undefined>(
        defaultSearchField,
    );
    const [searchText, setSearchText] = useState<string>('');

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

    const handlePageChange = (page: number) => {
        setTableRequestParams((prevParams) => {
            if (page == prevParams.pagination.page) {
                return prevParams;
            }
            return {
                ...prevParams,
                pagination: {
                    page,
                    pageSize: prevParams.pagination.pageSize,
                },
            };
        });
    };

    const handleSearch = (searchText: string) => {
        setTableRequestParams((prevParams) => {
            if (searchField) {
                // Check if the filter value has actually changed
                const hasChanged =
                    !prevParams.filters ||
                    !prevParams.filters[searchField] ||
                    prevParams.filters[searchField].value !== searchText;

                if (hasChanged) {
                    return {
                        ...prevParams,
                        pagination: {
                            page: 1,
                            pageSize: prevParams.pagination.pageSize,
                        },
                        filters: {
                            ...prevParams.filters,
                            [searchField]: {
                                operator: StringFilterOperator.CONTAINS,
                                value: searchText,
                            },
                        },
                    };
                }
            }
            return prevParams;
        });
    };

    const handlePageSizeChange = (pageSize: number) => {
        setTableRequestParams((prevParams) => {
            if (pageSize == prevParams.pagination.pageSize) {
                return prevParams;
            }
            return {
                ...prevParams,
                pagination: {
                    page: prevParams.pagination.page,
                    pageSize: pageSize,
                },
            };
        });
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    return (
        <div className="flex flex-col gap-4 w-full max-w-full">
            <div className="flex flex-row gap-2 items-center">
                <InputGroup className="max-w-96">
                    <InputGroupInput
                        placeholder={
                            searchType
                                ? t(`placeholder.search-${searchType}`)
                                : t('action.search')
                        }
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyUp={(e) => {
                            if (e.key === 'Enter') {
                                handleSearch(searchText);
                            }
                        }}
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton variant="secondary" size="icon-xs">
                            ⏎
                        </InputGroupButton>
                    </InputGroupAddon>
                    <InputGroupAddon>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <InputGroupButton
                                    variant="ghost"
                                    className="!pr-1.5 text-xs"
                                >
                                    {searchField
                                        ? t(`table.column.${searchField}`)
                                        : t('action.search')}{' '}
                                    <ChevronDownIcon className="size-3" />
                                </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {searchableColumns.map((column) => {
                                    if (column !== undefined) {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                checked={
                                                    searchField ===
                                                    column.toString()
                                                }
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSearchField(
                                                            column.toString(),
                                                        );
                                                    }
                                                }}
                                            >
                                                {t(
                                                    `table.column.${column.toString()}`,
                                                )}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    }
                                    return null;
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </InputGroupAddon>
                </InputGroup>

                {actions}
            </div>

            <div className="w-full overflow-auto rounded-md border">
                <Table<T>
                    className="w-full"
                    columns={updatedColumns}
                    locale={tableLocale}
                    size="small"
                    sticky={{ offsetHeader: 0 }}
                    showSorterTooltip={{ target: 'full-header' }}
                    pagination={false}
                    rowSelection={rowSelection}
                    scroll={{
                        x: 'max-content',
                        ...rest.scroll,
                    }}
                    {...rest}
                />
            </div>
            <AsPagination
                total={total}
                pageTotal={rest.dataSource ? rest.dataSource.length : 0}
                nSelectedRows={selectedRowKeys.length}
                page={tableRequestParams.pagination.page}
                pageSize={tableRequestParams.pagination.pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />
        </div>
    );
};

export default memo(AsTable) as typeof AsTable;
