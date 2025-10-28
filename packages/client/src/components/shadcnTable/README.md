# ShadcnTable Component

A general-purpose table component based on shadcn/ui style, supporting pagination, sorting, API integration, and more.

## Features

- ✅ **Pagination Support**: Frontend and backend pagination
- ✅ **Sorting Support**: Frontend and backend sorting
- ✅ **API Integration**: tRPC interface calls
- ✅ **Row Selection**: Single and multiple selection
- ✅ **Custom Rendering**: Custom column rendering
- ✅ **Responsive Design**: Fixed columns and sticky headers
- ✅ **Internationalization**: Multi-language support
- ✅ **Loading State**: Built-in loading state management
- ✅ **Error Handling**: Built-in error handling and notifications

## Basic Usage

```tsx
import ShadcnTable from '@/components/shadcnTable';
import type { TableRequestParams, ResponseBody, TableData } from '@shared/types';

// Define data type
interface UserData {
    id: string;
    name: string;
    email: string;
    age: number;
    createdAt: string;
}

// Define columns
const columns = [
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
    },
    {
        key: 'email',
        title: 'Email',
        dataIndex: 'email',
    },
    {
        key: 'age',
        title: 'Age',
        dataIndex: 'age',
        sorter: true,
        align: 'right' as const,
    },
    {
        key: 'createdAt',
        title: 'Created At',
        dataIndex: 'createdAt',
        render: (value: string) => new Date(value).toLocaleDateString(),
    },
];

// API function
const getUsers = async (params: TableRequestParams): Promise<ResponseBody<TableData<UserData>>> => {
    // Call tRPC interface
    return await trpcClient.getUsers.query(params);
};

// Use component
function UserList() {
    return (
        <ShadcnTable
            columns={columns}
            apiFunction={getUsers}
            rowKey="id"
            pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
            }}
        />
    );
}
```

## Advanced Usage

### Table with Row Selection

```tsx
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

<ShadcnTable
    columns={columns}
    dataSource={data}
    rowKey="id"
    rowSelection={{
        selectedRowKeys,
        onChange: setSelectedRowKeys,
    }}
    onRow={(record) => ({
        onClick: () => console.log('Row clicked:', record),
        style: { cursor: 'pointer' },
    })}
/>
```

### Fixed Columns

```tsx
const columns = [
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        fixed: 'left' as const,
        width: 200,
    },
    {
        key: 'description',
        title: 'Description',
        dataIndex: 'description',
    },
    {
        key: 'actions',
        title: 'Actions',
        fixed: 'right' as const,
        width: 120,
        render: (_, record) => (
            <div className="flex gap-2">
                <button>Edit</button>
                <button>Delete</button>
            </div>
        ),
    },
];
```

### Custom Pagination

```tsx
<ShadcnTable
    columns={columns}
    apiFunction={getUsers}
    pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
            `Showing ${range[0]}-${range[1]} of ${total} records`,
        pageSizeOptions: [10, 20, 50, 100],
    }}
/>
```

### Disable Pagination

```tsx
<ShadcnTable
    columns={columns}
    dataSource={staticData}
    pagination={false}
/>
```

## API Reference

### ShadcnTableProps<T>

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `columns` | `TableColumn<T>[]` | - | Table column definitions |
| `dataSource` | `T[]` | - | Data source (optional, if provided uses static data) |
| `loading` | `boolean` | - | Loading state (optional, if provided overrides internal state) |
| `pagination` | `PaginationConfig \| false` | `{}` | Pagination config, set to `false` to disable |
| `apiFunction` | `(params: TableRequestParams) => Promise<ResponseBody<TableData<T>>>` | - | API function (optional, if provided enables backend pagination and sorting) |
| `initialParams` | `Partial<TableRequestParams>` | - | Initial request parameters |
| `rowKey` | `keyof T \| string \| (record: T) => string` | `'id'` | Row key |
| `rowSelection` | `{ selectedRowKeys: React.Key[]; onChange: (keys: React.Key[]) => void }` | - | Row selection config |
| `onRow` | `(record: T, index: number) => { onClick?, style?, className? }` | - | Row event handlers |
| `className` | `string` | - | Custom CSS class name |
| `size` | `'small' \| 'middle' \| 'large'` | `'middle'` | Table size |
| `bordered` | `boolean` | `true` | Whether to show borders |
| `sticky` | `boolean` | `false` | Whether to enable sticky header |

### TableColumn<T>

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `keyof T \| string` | - | Column key |
| `title` | `string` | - | Column title |
| `dataIndex` | `keyof T \| string` | - | Data field name |
| `width` | `string \| number` | - | Column width |
| `fixed` | `'left' \| 'right'` | - | Fixed column position |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Alignment |
| `sorter` | `boolean \| (a: T, b: T) => number` | - | Sort configuration |
| `render` | `(value: unknown, record: T, index: number) => React.ReactNode` | - | Custom render function |
| `sortOrder` | `'ascend' \| 'descend'` | - | Sort state |
| `ellipsis` | `boolean` | - | Whether to show ellipsis |

### PaginationConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `page` | `number` | `1` | Current page number |
| `pageSize` | `number` | `10` | Items per page |
| `showSizeChanger` | `boolean` | `true` | Whether to show page size selector |
| `showQuickJumper` | `boolean` | `true` | Whether to show quick jumper |
| `showTotal` | `(total: number, range: [number, number]) => string` | - | Show total function |
| `pageSizeOptions` | `number[]` | `[10, 20, 50, 100]` | Page size options |

## Notes

1. **API Function**: If `apiFunction` is provided, the component automatically handles pagination and sorting API calls
2. **Data Source**: If both `dataSource` and `apiFunction` are provided, `dataSource` takes priority
3. **Sorting**: Backend sorting requires `apiFunction` support, frontend sorting requires `sorter` to be `true`
4. **Pagination**: Backend pagination requires `apiFunction` support, frontend pagination uses `dataSource`
5. **Row Key**: Ensure each row has a unique `rowKey` value
6. **Performance**: For large datasets, consider using backend pagination and sorting

## Style Customization

The component uses Tailwind CSS classes and can be customized in the following ways:

```tsx
<ShadcnTable
    className="custom-table-class"
    // ... other props
/>
```

Or customize the theme through CSS variables:

```css
:root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --muted: 210 40% 98%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
}
```