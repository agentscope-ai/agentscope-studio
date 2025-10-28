# Select Component

A select component built on shadcn/ui and Radix UI with rich interactions and accessibility support.

## Features

- ✅ Full keyboard navigation
- ✅ Accessibility built-in
- ✅ Smooth open/close animations
- ✅ Customizable styles and layout
- ✅ Type-safe with full TypeScript typings
- ✅ Theming with design tokens
- ✅ Responsive by default

## Basic Usage

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn-ui';

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

## Advanced Usage

### Controlled Component

```tsx
import { useState } from 'react';

const [value, setValue] = useState('');

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Pick one" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
    <SelectItem value="orange">Orange</SelectItem>
  </SelectContent>
</Select>
```

### Grouped Options

```tsx
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Choose fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Fruits</SelectLabel>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Vegetables</SelectLabel>
      <SelectItem value="carrot">Carrot</SelectItem>
      <SelectItem value="broccoli">Broccoli</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### Disabled

```tsx
<Select disabled>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Disabled" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Custom Styles

```tsx
<Select>
  <SelectTrigger className="w-[200px] h-12 border-2 border-blue-500">
    <SelectValue placeholder="Custom style" />
  </SelectTrigger>
  <SelectContent className="bg-blue-50">
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Dynamic Options

```tsx
const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
];

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Choose framework" />
  </SelectTrigger>
  <SelectContent>
    {options.map((option) => (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## API Reference

### Select

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Current selected value |
| `onValueChange` | `(value: string) => void` | - | Change handler |
| `defaultValue` | `string` | - | Default value |
| `disabled` | `boolean` | `false` | Disabled state |
| `name` | `string` | - | Form field name |
| `required` | `boolean` | `false` | Whether it is required |

### SelectTrigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Custom class name |
| `placeholder` | `string` | - | Placeholder text |

### SelectContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'popper' \| 'item-aligned'` | `'popper'` | Content positioning |
| `className` | `string` | - | Custom class name |

### SelectItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Option value (required) |
| `disabled` | `boolean` | `false` | Disabled |
| `className` | `string` | - | Custom class name |

### SelectLabel

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Custom class name |

### SelectSeparator

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Custom class name |

## Keyboard Shortcuts

- **Space/Enter**: Open select
- **Arrow Up/Down**: Navigate options
- **Enter**: Choose current option
- **Escape**: Close select
- **Tab**: Move to next focusable element

## Styling

### CSS Variables

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}
```

### Custom Theme

```tsx
// Dark theme example
<Select>
  <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-600">
    <SelectValue placeholder="Select" />
  </SelectTrigger>
  <SelectContent className="bg-gray-800 border-gray-600">
    <SelectItem value="option1" className="text-white hover:bg-gray-700">
      Option 1
    </SelectItem>
  </SelectContent>
</Select>
```

## Best Practices

1. Provide a clear label for Select
2. Use meaningful placeholders
3. Group and separate options for large datasets
4. Ensure keyboard accessibility
5. Provide loading indicators for async data
6. Handle errors gracefully

## Notes

- Built on Radix UI Select primitives
- All native select props can be passed via SelectTrigger
- Uses Portal; ensure proper z-index
- Supports touch scrolling and gestures
- Automatically manages focus and keyboard navigation

## FAQ

- How to customize option styles? Use `className` on `SelectItem`.
- How to handle large datasets? Use virtualization or pagination.
- How to implement search? Add an input inside SelectContent to filter.
- How to implement multi-select? Not supported by this component; use another component or custom logic.
