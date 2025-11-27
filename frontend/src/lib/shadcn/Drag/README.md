# Drag Components

A set of Svelte components for implementing drag functionality.

## Components

### Draggable

A component that makes its children draggable.

#### Props

- `disabled` (boolean, default: `false`) - Disables drag functionality
- `cursor` (string, default: `'grab'`) - Cursor style when not dragging
- `dragCursor` (string, default: `'grabbing'`) - Cursor style when dragging

#### Events

- `on:dragged` - Fired when drag ends
  - `draggedTo: { x: number, y: number }` - End position
  - `draggedFrom: { x: number, y: number }` - Start position
- `on:dragstart` - Fired when drag starts
  - `position: { x: number, y: number }` - Start position
- `on:dragend` - Fired when drag ends
  - `position: { x: number, y: number }` - End position

#### Usage

```svelte
<script>
  import { Draggable } from '$lib/shadcn/Drag';

  function handleDragged(event) {
    const { draggedTo, draggedFrom } = event.detail;
    console.log('Dragged from', draggedFrom, 'to', draggedTo);
  }
</script>

<Draggable on:dragged={handleDragged}>
  <EatingTable />
</Draggable>
```

### DraggableContainer

A component that acts as a drop zone for draggable elements.

#### Props

- `allowDrop` (boolean, default: `true`) - Whether to allow drops
- `highlightOnDragOver` (boolean, default: `true`) - Whether to highlight when dragging over

#### Events

- `on:drop` - Fired when something is dropped
  - `position: { x: number, y: number }` - Drop position
  - `event: DragEvent` - Native drag event
- `on:dragover` - Fired when dragging over
  - `position: { x: number, y: number }` - Current position
  - `event: DragEvent` - Native drag event
- `on:dragenter` - Fired when drag enters
  - `event: DragEvent` - Native drag event
- `on:dragleave` - Fired when drag leaves
  - `event: DragEvent` - Native drag event

#### Usage

```svelte
<script>
  import { DraggableContainer, Draggable } from '$lib/shadcn/Drag';

  function handleDrop(event) {
    const { position } = event.detail;
    console.log('Dropped at', position);
  }
</script>

<DraggableContainer on:drop={handleDrop}>
  <Draggable on:dragged={(e) => console.log(e.detail)}>
    <EatingTable />
  </Draggable>
</DraggableContainer>
```

## Features

- ✅ Mouse support
- ✅ Touch support (mobile devices)
- ✅ TypeScript support
- ✅ Customizable cursors
- ✅ Disabled state
- ✅ Visual feedback during drag
- ✅ Drop zone highlighting
