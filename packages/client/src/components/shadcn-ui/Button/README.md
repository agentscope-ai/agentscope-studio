# Button 组件

基于 shadcn/ui 设计的按钮组件，支持多种变体和尺寸。

## 功能特性

- ✅ **多种变体**: 支持 default、destructive、outline、secondary、ghost、link 等变体
- ✅ **多种尺寸**: 支持 default、sm、lg、icon 等尺寸
- ✅ **无障碍支持**: 内置键盘导航和屏幕阅读器支持
- ✅ **类型安全**: 完整的 TypeScript 类型定义
- ✅ **主题一致**: 使用设计系统的颜色变量
- ✅ **可定制**: 支持自定义 className 和样式

## 基本用法

```tsx
import { Button } from '@/components/ui/button';

// 默认按钮
<Button>点击我</Button>

// 不同变体
<Button variant="outline">轮廓按钮</Button>
<Button variant="destructive">危险按钮</Button>
<Button variant="ghost">幽灵按钮</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="lg">大按钮</Button>
<Button size="icon">图标按钮</Button>
```

## 高级用法

### 禁用状态

```tsx
<Button disabled>禁用按钮</Button>
```

### 作为子组件

```tsx
import { Link } from 'react-router-dom';

<Button asChild>
  <Link to="/dashboard">跳转到仪表板</Link>
</Button>
```

### 自定义样式

```tsx
<Button className="w-full bg-blue-500 hover:bg-blue-600">
  自定义样式按钮
</Button>
```

### 带图标

```tsx
import { Plus, Download } from 'lucide-react';

<Button>
  <Plus className="mr-2 h-4 w-4" />
  添加项目
</Button>

<Button variant="outline">
  <Download className="mr-2 h-4 w-4" />
  下载
</Button>
```

## API 参考

### ButtonProps

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'default'` | 按钮变体 |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | 按钮尺寸 |
| `asChild` | `boolean` | `false` | 是否作为子组件渲染 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `className` | `string` | - | 自定义样式类名 |
| `onClick` | `(event: MouseEvent) => void` | - | 点击事件处理函数 |

### 变体说明

- **default**: 主要按钮，用于主要操作
- **destructive**: 危险按钮，用于删除等危险操作
- **outline**: 轮廓按钮，用于次要操作
- **secondary**: 次要按钮，用于辅助操作
- **ghost**: 幽灵按钮，用于最小化视觉干扰的操作
- **link**: 链接按钮，用于导航操作

### 尺寸说明

- **default**: 标准尺寸 (h-10 px-4 py-2)
- **sm**: 小尺寸 (h-9 px-3)
- **lg**: 大尺寸 (h-11 px-8)
- **icon**: 图标尺寸 (h-10 w-10)

## 样式定制

### CSS 变量

组件使用以下 CSS 变量，可以在全局样式中覆盖：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}
```

### 自定义变体

可以通过 `class-variance-authority` 创建自定义变体：

```tsx
import { cva } from "class-variance-authority";

const customButtonVariants = cva(
  "base-styles",
  {
    variants: {
      variant: {
        custom: "bg-purple-500 text-white hover:bg-purple-600",
      },
    },
  }
);
```

## 最佳实践

1. **语义化使用**: 根据操作的重要性选择合适的变体
2. **一致性**: 在同一界面中保持按钮样式的一致性
3. **可访问性**: 确保按钮有清晰的标签和适当的对比度
4. **响应式**: 在移动设备上考虑按钮的触摸目标大小
5. **加载状态**: 对于异步操作，考虑添加加载状态指示器

## 注意事项

- 按钮组件基于 Radix UI 的 Slot 组件，支持 `asChild` 属性
- 所有原生 button 属性都可以直接传递给 Button 组件
- 使用 `focus-visible` 确保键盘导航时的焦点可见性
- 禁用状态会自动阻止指针事件并降低透明度
