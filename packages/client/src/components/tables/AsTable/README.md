# AsTable 组件使用指南

增强版的 AsTable 组件，支持分页、排序和 tRPC 集成。

## 功能特性

- ✅ **分页支持** - 可配置分页或禁用分页
- ✅ **排序支持** - 客户端排序（静态数据）和服务端排序（API 数据）
- ✅ **tRPC 集成** - 直接传入 tRPC 函数即可自动处理数据获取
- ✅ **国际化** - 内置多语言支持
- ✅ **类型安全** - 完整的 TypeScript 类型支持

## 基础用法

### 1. 静态数据（无分页）

```tsx
import { AsTable } from '@/components/tables/AsTable';

const columns = [
    { key: 'id', dataIndex: 'id' },
    { key: 'name', dataIndex: 'name' },
    { key: 'status', dataIndex: 'status' },
];

const data = [
    { id: '1', name: '项目1', status: 'active' },
    { id: '2', name: '项目2', status: 'inactive' },
];

<AsTable
    columns={columns}
    dataSource={data}
    pagination={false}
/>
```

### 2. 静态数据（带分页）

```tsx
<AsTable
    columns={columns}
    dataSource={data}
    pagination={{
        pageSize: 10,
        showSizeChanger: true,
    }}
/>
```

### 3. tRPC API 数据（推荐）

```tsx
import { trpcClient } from '@/api/trpc';

const getProjects = async (params: TableRequestParams): Promise<ResponseBody<TableData<ProjectData>>> => {
    try {
        return await trpcClient.getProjects.query(params);
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : '请求失败',
        };
    }
};

<AsTable
    columns={columns}
    apiFunction={getProjects}
    pagination={{
        pageSize: 20,
    }}
/>
```

### 4. 带初始参数

```tsx
<AsTable
    columns={columns}
    apiFunction={getProjects}
    initialParams={{
        pagination: { page: 1, pageSize: 10 },
        sort: { field: 'project', order: 'asc' },
        filters: { status: 'active' },
    }}
/>
```

## 属性说明

### 基础属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `columns` | `TableColumnsType<T>` | - | 表格列配置（必需） |
| `dataSource` | `T[]` | - | 静态数据源 |
| `loading` | `boolean` | - | 加载状态 |
| `pagination` | `PaginationConfig \| false` | `{}` | 分页配置，`false` 禁用分页 |

### API 相关属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `apiFunction` | `(params: TableRequestParams) => Promise<ResponseBody<TableData<T>>>` | tRPC API 函数 |
| `initialParams` | `Partial<TableRequestParams>` | 初始请求参数 |

### 分页配置

```tsx
interface PaginationConfig {
    page?: number;                    // 当前页
    pageSize?: number;               // 每页条数
    showSizeChanger?: boolean;       // 显示页面大小选择器
    showQuickJumper?: boolean;       // 显示快速跳转
    showTotal?: (total: number, range: [number, number]) => string; // 显示总数
    pageSizeOptions?: string[];      // 页面大小选项
}
```

## 排序功能

### 客户端排序（静态数据）
- 自动支持数字和字符串排序
- 无需额外配置

### 服务端排序（API 数据）
- 点击列头触发服务端排序
- 自动传递 `sort.field` 和 `sort.order` 参数
- 支持多列排序状态管理

## tRPC 函数要求

tRPC 函数需要返回以下格式的数据：

```tsx
interface ResponseBody<T> {
    success: boolean;
    message: string;
    data?: T;
}

interface TableData<T> {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
}
```

## 完整示例

```tsx
import React from 'react';
import { Card, Space, Input } from 'antd';
import { AsTable } from '@/components/tables/AsTable';
import { trpcClient } from '@/api/trpc';
import type { ProjectData, TableRequestParams, ResponseBody, TableData } from '@shared/types';

const { Search } = Input;

function ProjectList() {
    const [keyword, setKeyword] = React.useState('');

    const columns = [
        {
            key: 'project',
            dataIndex: 'project',
        },
        {
            key: 'running',
            dataIndex: 'running',
        },
        {
            key: 'total',
            dataIndex: 'total',
        },
        {
            key: 'createdAt',
            dataIndex: 'createdAt',
        },
    ];

    const getProjects = async (params: TableRequestParams): Promise<ResponseBody<TableData<ProjectData>>> => {
        try {
            return await trpcClient.getProjects.query(params);
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : '请求失败',
            };
        }
    };

    return (
        <Card title="项目列表">
            <Space style={{ marginBottom: 16 }}>
                <Search
                    placeholder="搜索项目..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ width: 200 }}
                />
            </Space>
            
            <AsTable<ProjectData>
                columns={columns}
                apiFunction={(params) => getProjects({
                    ...params,
                    filters: keyword ? { project: keyword } : undefined,
                })}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                        `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                }}
            />
        </Card>
    );
}
```

## 注意事项

1. **数据源优先级**: 如果同时提供 `dataSource` 和 `apiFunction`，优先使用 `dataSource`
2. **排序模式**: 有 `apiFunction` 时使用服务端排序，否则使用客户端排序
3. **分页配置**: 传入 `false` 可完全禁用分页
4. **类型安全**: 建议为数据项定义明确的 TypeScript 类型
5. **错误处理**: 组件会自动处理 API 错误并显示消息提示

## 国际化

组件内置支持以下翻译键：

- `table.column.{columnKey}` - 列标题
- `table.pagination.show-total` - 分页总数显示
- `tooltip.table.*` - 排序相关提示

确保在 i18n 配置中添加相应的翻译文本。
