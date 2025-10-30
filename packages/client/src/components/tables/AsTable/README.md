# AsTable (Presentational Wrapper for Ant Design Table)

AsTable is a thin, presentational wrapper around Ant Design's `Table`. It does not fetch data. It focuses on:

- Default i18n-friendly column titles via `t('table.column.${key}')`
- Consistent sorting UI (custom sort icons + sticky header)
- A small set of sensible defaults (small size, sticky header, bordered container)
- Keeping your data layer (pagination/sort/search) outside the component

If you need server-side pagination/sort/search, wire them up in your page or context and pass the resulting props to `AsTable`.

## Key Differences vs antd Table

- Columns are passed in as usual, but AsTable will:
  - Auto-generate a translated `title` using the column's `key` (you can still override it)
  - Add `ellipsis: true` by default
  - Render a unified sort icon via `renderSortIcon`
  - Fix the first column to the left by default
- Everything else is forwarded to antd `Table` through `...rest`.
- There is no `apiFunction`, `searchText`, or internal state. AsTable is UI-only.

## When to Use

- You want an antd `Table` with:
  - Unified styling and sort icons
  - Sticky header and small size by default
  - i18n-friendly column titles
- You already manage data in a Context, store, or container component.

## Props

AsTable accepts all antd `TableProps<T>` except it requires `columns: TableColumnsType<T>` explicitly.

```ts
interface AsTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: TableColumnsType<T>;
}
```

Commonly passed props (from your data layer):

- `dataSource: T[]`
- `loading: boolean`
- `pagination: TablePaginationConfig | false`
- `onChange: (pagination, filters, sorter) => void` (handle server-side pagination/sort)
- `rowSelection`
- `locale` (will be merged with AsTable defaults)

## Basic Example (server-side pagination/sort)

```tsx
import AsTable from '@/components/tables/AsTable';
import type { TableColumnsType } from 'antd';
import type { SorterResult, TablePaginationConfig } from 'antd/es/table/interface';
import type { ProjectData } from '@shared/types';
import { useProjectListRoom } from '@/context/ProjectListRoomContext';

export default function ProjectList() {
  const {
    tableDataSource,
    tableLoading,
    pagination,
    onTableChange,
  } = useProjectListRoom();

  const columns: TableColumnsType<ProjectData> = [
    {
      key: 'project',
      dataIndex: 'project',
      sorter: true, // server-side: UI only; handle in onTableChange
    },
    { key: 'createdAt', dataIndex: 'createdAt', sorter: true },
    { key: 'running', dataIndex: 'running', sorter: true, align: 'right' },
    { key: 'finished', dataIndex: 'finished', sorter: true, align: 'right' },
    { key: 'pending', dataIndex: 'pending', sorter: true, align: 'right' },
    { key: 'total', dataIndex: 'total', sorter: true, align: 'right' },
  ];

  return (
    <AsTable<ProjectData>
      columns={columns}
      dataSource={tableDataSource}
      loading={tableLoading}
      pagination={pagination}
      onChange={onTableChange}
      rowKey="project"
    />
  );
}
```

## i18n Title Resolution

For each column:
- If you do not provide `title`, AsTable will set
  ```ts
  title = t(`table.column.${key.replace('_', '-')}`)
  ```
- Provide your own `title` to override.

## Styling Defaults

- `size="small"`
- `sticky` header enabled
- Outer container classes: `h-full w-full border border-border rounded-md`
- Column defaults: `ellipsis: true`, first column `fixed: 'left'`
- Sort tooltip target: `{ target: 'full-header' }`

You can still customize via normal antd props (`className`, `scroll`, `rowClassName`, etc.).

## Server-side Sorting and Pagination

- Set `sorter: true` (or your own sorter config) on columns to show sort UI
- Handle `onChange(pagination, _, sorter)` in your data layer (e.g., a Context)
- Do not provide client-side `sorter.compare` if the backend controls sorting

Example handler sketch (in your Context):

```ts
const onTableChange = (
  pageInfo: TablePaginationConfig,
  _ignored: unknown,
  sorter: SorterResult<ProjectData> | SorterResult<ProjectData>[]
) => {
  // derive next page, pageSize, sort field/order
  // call your fetch function with these params
};
```

## Migration Notes (from older AsTable)

- Removed: `apiFunction`, `initialParams`, `searchText`, `searchField`, and any internal fetching/state
- New pattern: manage data in a Context/container and pass `dataSource`, `loading`, `pagination`, and `onChange`
- Sorting: leave `sorter: true` and handle server-side sorting in `onTableChange`

## Tips

- If you need fixed header + scroll, pass antd's `scroll={{ y: ..., x: ... }}`
- If your first column should not be fixed, set `fixed: undefined` on that column
- Provide `locale` to extend/override AsTable defaults (empty state, tooltips, etc.)