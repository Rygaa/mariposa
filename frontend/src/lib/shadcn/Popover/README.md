# Popover and DateTimePicker Components

## Popover Component

A flexible popover component inspired by shadcn/ui that displays content in a floating panel relative to a trigger element.

### Features
- Context-based state management
- Flexible positioning (align, side, sideOffset, alignOffset)
- Automatic viewport boundary detection
- Keyboard support (Escape to close)
- Click outside to close

### Usage

```svelte
<script>
  import { Popover, PopoverTrigger, PopoverContent } from '$lib/shadcn';
  
  let open = $state(false);
</script>

<Popover bind:open>
  <PopoverTrigger>
    <button>Open Popover</button>
  </PopoverTrigger>
  
  <PopoverContent align="center" side="bottom" sideOffset={8}>
    <div class="space-y-2">
      <h3 class="font-semibold">Popover Title</h3>
      <p class="text-sm text-gray-600">This is the popover content.</p>
    </div>
  </PopoverContent>
</Popover>
```

### Props

#### Popover
- `open` (boolean, bindable): Controls the open/closed state
- `onOpenChange` (function): Callback when open state changes

#### PopoverTrigger
- `asChild` (boolean): Render as a div wrapper instead of button
- All button HTML attributes

#### PopoverContent
- `align` ('start' | 'center' | 'end'): Horizontal alignment relative to trigger
- `side` ('top' | 'bottom' | 'left' | 'right'): Which side of trigger to appear on
- `sideOffset` (number): Distance from trigger in pixels (default: 8)
- `alignOffset` (number): Offset for alignment (default: 0)
- `class` (string): Additional CSS classes

---

## DateTimePicker Component

A comprehensive date and time picker component inspired by shadcn/ui that uses the Popover component.

### Features
- Calendar view with month/year navigation
- Time picker with hour, minute, and AM/PM selection
- "Now" button for quick current date/time selection
- Fully keyboard accessible
- Visual indicators for today and selected dates
- 12-hour time format

### Usage

```svelte
<script>
  import { DateTimePicker } from '$lib/shadcn';
  
  let selectedDateTime = $state<Date | undefined>(new Date());
  
  function handleChange(date: Date | undefined) {
    console.log('Selected:', date);
  }
</script>

<DateTimePicker 
  bind:value={selectedDateTime}
  onValueChange={handleChange}
  placeholder="Select date and time"
/>
```

### Props

- `value` (Date | undefined, bindable): The selected date and time
- `onValueChange` (function): Callback when value changes
- `placeholder` (string): Placeholder text when no date selected (default: "Pick a date and time")
- `disabled` (boolean): Disable the picker
- `class` (string): Additional CSS classes for the trigger button

### Features Detail

#### Calendar
- Navigate between months with arrow buttons
- Visual indicator for today's date (gray background)
- Visual indicator for selected date (dark background)
- Click any date to select it

#### Time Picker
- Hour input (1-12)
- Minute input (0-59)
- AM/PM toggle button
- All inputs validate and constrain values

#### Actions
- **Now** button: Sets to current date and time
- **Done** button: Closes the picker

### Styling

The component uses Tailwind CSS classes and follows shadcn/ui design patterns. All elements are fully customizable through the `class` prop and can be styled to match your application's theme.

