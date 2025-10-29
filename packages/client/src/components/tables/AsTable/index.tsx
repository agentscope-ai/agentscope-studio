import { memo, useMemo } from 'react';
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
	
	const updatedColumns: TableColumnsType<T> | undefined = useMemo(() => {
		if (!columns) return undefined;
		return columns.map((column, index) => {
			const columnKey = column.key as keyof T;
			const translationKey = columnKey?.toString().replace('_', '-');

			const baseProps: Partial<TableColumnType<T>> = {
				title: renderTitle(t(`table.column.${translationKey}`)),
				dataIndex: columnKey as string,
				ellipsis: true,
				// 服务端排序场景：仅展示排序 UI，由上层 onChange 处理
				sorter: column.sorter ?? true,
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
	}, [columns, t]);

	return (
		<Table<T>
			{...rest}
			className="h-full w-full border border-border rounded-md"
			columns={updatedColumns}
			locale={{
				emptyText: <EmptyData />,
				cancelSort: t('tooltip.table.cancel-sort'),
				triggerAsc: t('tooltip.table.trigger-asc'),
				triggerDesc: t('tooltip.table.trigger-desc'),
				sortTitle: t('tooltip.table.sort-title'),
				...rest.locale,
			}}
			size="small"
			sticky
			showSorterTooltip={{ target: 'full-header' }}
		/>
	);
};

export default memo(AsTable) as typeof AsTable;
