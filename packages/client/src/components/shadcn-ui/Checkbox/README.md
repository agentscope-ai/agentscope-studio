# Checkbox Component

A checkbox component based on the shadcn/ui design system with accessibility and keyboard support.

## Features

- ✅ **Accessibility**: Built-in screen reader and keyboard support
- ✅ **Type-safe**: Full TypeScript typings
- ✅ **Theming**: Uses design system color tokens
- ✅ **Customizable**: Supports custom className and styles
- ✅ **Controlled/Uncontrolled**: Works in both modes
- ✅ **Indeterminate state**: Supports partial selection state

## Basic Usage

```tsx
import { Checkbox } from '@/components/shadcn-ui';

// Uncontrolled
<Checkbox />

// Controlled
<Checkbox checked={isChecked} onCheckedChange={setIsChecked} />

// With label
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label htmlFor="terms">Accept terms and conditions</label>
</div>
```

## Advanced Usage

### Disabled State

```tsx
<Checkbox disabled />
<Checkbox checked disabled />
```

### Indeterminate State

```tsx
<Checkbox 
  checked={indeterminate ? "indeterminate" : isChecked}
  onCheckedChange={setIsChecked}
/>
```

### Custom Styling

```tsx
<Checkbox className="border-2 border-blue-500 data-[state=checked]:bg-blue-500" />
```

### With Form Integration

```tsx
import { useForm } from 'react-hook-form';

function MyForm() {
  const { register, handleSubmit } = useForm();
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center space-x-2">
        <Checkbox {...register('newsletter')} />
        <label>Subscribe to newsletter</label>
      </div>
    </form>
  );
}
```

### Checkbox Group

```tsx
const [selectedItems, setSelectedItems] = useState<string[]>([]);

const items = ['item1', 'item2', 'item3'];

const handleItemChange = (item: string, checked: boolean) => {
  if (checked) {
    setSelectedItems(prev => [...prev, item]);
  } else {
    setSelectedItems(prev => prev.filter(i => i !== item));
  }
};

return (
  <div className="space-y-2">
    {items.map(item => (
      <div key={item} className="flex items-center space-x-2">
        <Checkbox
          checked={selectedItems.includes(item)}
          onCheckedChange={(checked) => handleItemChange(item, checked as boolean)}
        />
        <label>{item}</label>
      </div>
    ))}
  </div>
);
```

## API Reference

### CheckboxProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean \| "indeterminate"` | `false` | Checked state |
| `onCheckedChange` | `(checked: boolean) => void` | - | Change handler |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required for form validation |
| `name` | `string` | - | Form field name |
| `value` | `string` | - | Form field value |
| `className` | `string` | - | Custom class names |
| `id` | `string` | - | Element ID for accessibility |

### Checked States

- **`false`**: Unchecked
- **`true`**: Checked
- **`"indeterminate"`**: Partially selected (useful for parent checkboxes)

## Styling

### CSS Variables

The component uses the following CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}
```

### Custom Styling

```tsx
// Custom colors
<Checkbox className="border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />

// Custom size
<Checkbox className="h-6 w-6" />

// Custom focus ring
<Checkbox className="focus-visible:ring-4 focus-visible:ring-blue-300" />
```

## Accessibility

### Keyboard Navigation

- **Space**: Toggle checked state
- **Tab**: Move to next focusable element
- **Shift + Tab**: Move to previous focusable element

### Screen Reader Support

- Properly labeled with `aria-checked`
- Supports `aria-describedby` for additional context
- Works with form labels using `htmlFor` and `id`

### Example with Proper Labeling

```tsx
<div className="flex items-center space-x-2">
  <Checkbox 
    id="privacy" 
    aria-describedby="privacy-description"
  />
  <div>
    <label htmlFor="privacy" className="font-medium">
      Privacy Policy
    </label>
    <p id="privacy-description" className="text-sm text-muted-foreground">
      I agree to the terms and conditions
    </p>
  </div>
</div>
```

## Best Practices

1. **Always use labels**: Provide clear, descriptive labels for checkboxes
2. **Group related options**: Use fieldset and legend for checkbox groups
3. **Provide context**: Use descriptions for complex options
4. **Handle indeterminate state**: Use for parent checkboxes in hierarchical selections
5. **Consider touch targets**: Ensure adequate size for mobile devices
6. **Use semantic HTML**: Prefer native form elements when possible

## Examples

### Terms and Conditions

```tsx
<Checkbox 
  id="terms"
  required
  aria-describedby="terms-description"
/>
<label htmlFor="terms">
  I agree to the <a href="/terms">Terms of Service</a>
</label>
<p id="terms-description" className="text-sm text-muted-foreground">
  You must agree to continue
</p>
```

### Settings Panel

```tsx
const settings = [
  { id: 'notifications', label: 'Email notifications', description: 'Receive updates via email' },
  { id: 'marketing', label: 'Marketing emails', description: 'Receive promotional content' },
  { id: 'analytics', label: 'Analytics tracking', description: 'Help us improve our service' },
];

const [enabledSettings, setEnabledSettings] = useState<string[]>([]);

return (
  <fieldset>
    <legend className="text-lg font-semibold">Preferences</legend>
    <div className="space-y-4 mt-4">
      {settings.map(setting => (
        <div key={setting.id} className="flex items-start space-x-3">
          <Checkbox
            id={setting.id}
            checked={enabledSettings.includes(setting.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setEnabledSettings(prev => [...prev, setting.id]);
              } else {
                setEnabledSettings(prev => prev.filter(id => id !== setting.id));
              }
            }}
          />
          <div className="flex-1">
            <label htmlFor={setting.id} className="font-medium">
              {setting.label}
            </label>
            <p className="text-sm text-muted-foreground">
              {setting.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  </fieldset>
);
```

## Notes

- Built on Radix UI Checkbox primitive
- Supports both controlled and uncontrolled usage
- Automatically handles focus management
- Uses `data-[state=checked]` and `data-[state=indeterminate]` for styling
- Disabled state prevents interaction and reduces opacity
