<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type DragPosition = {
    x: number;
    y: number;
  };

  export let disabled = false;
  export let cursor = 'grab';
  export let dragCursor = 'grabbing';
  export let threshold = 5; // Minimum pixels to move before considering it a drag

  const dispatch = createEventDispatcher<{
    dragged: { draggedTo: DragPosition; draggedFrom: DragPosition };
    dragstart: { position: DragPosition };
    dragend: { position: DragPosition };
  }>();

  let dragging = false;
  let hasMoved = false;
  let draggedFrom: DragPosition = { x: 0, y: 0 };
  let currentPos: DragPosition = { x: 0, y: 0 };
  let offsetX = 0;
  let offsetY = 0;
  let element: HTMLElement;
  let initialX = 0;
  let initialY = 0;

  function handleMouseDown(e: MouseEvent) {
    if (disabled) return;
    
    // Get the current position of the element
    const rect = element.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    dragging = true;
    hasMoved = false;
    draggedFrom = { x: e.clientX, y: e.clientY };
    
    // Calculate offset from mouse position to element position
    offsetX = e.clientX - initialX;
    offsetY = e.clientY - initialY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragging || disabled) return;
    
    const deltaX = Math.abs(e.clientX - draggedFrom.x);
    const deltaY = Math.abs(e.clientY - draggedFrom.y);
    
    // Check if we've moved past the threshold
    if (!hasMoved && (deltaX > threshold || deltaY > threshold)) {
      hasMoved = true;
      dispatch('dragstart', { position: draggedFrom });
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (hasMoved) {
      currentPos = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (!dragging || disabled) return;
    
    dragging = false;
    
    if (hasMoved) {
      const draggedTo = { x: e.clientX, y: e.clientY };
      dispatch('dragged', { draggedTo, draggedFrom });
      dispatch('dragend', { position: draggedTo });
      e.preventDefault();
      e.stopPropagation();
    }
    
    hasMoved = false;
  }

  function handleTouchStart(e: TouchEvent) {
    if (disabled) return;
    
    const touch = e.touches[0];
    const rect = element.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    dragging = true;
    hasMoved = false;
    draggedFrom = { x: touch.clientX, y: touch.clientY };
    
    offsetX = touch.clientX - initialX;
    offsetY = touch.clientY - initialY;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!dragging || disabled) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - draggedFrom.x);
    const deltaY = Math.abs(touch.clientY - draggedFrom.y);
    
    if (!hasMoved && (deltaX > threshold || deltaY > threshold)) {
      hasMoved = true;
      dispatch('dragstart', { position: draggedFrom });
      e.preventDefault();
    }
    
    if (hasMoved) {
      currentPos = { x: touch.clientX, y: touch.clientY };
      e.preventDefault();
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!dragging || disabled) return;
    
    const touch = e.changedTouches[0];
    dragging = false;
    
    if (hasMoved) {
      const draggedTo = { x: touch.clientX, y: touch.clientY };
      dispatch('dragged', { draggedTo, draggedFrom });
      dispatch('dragend', { position: draggedTo });
      e.preventDefault();
    }
    
    hasMoved = false;
  }

  // Calculate transform for visual feedback
  $: transform = hasMoved && dragging 
    ? `translate(${currentPos.x - offsetX - initialX}px, ${currentPos.y - offsetY - initialY}px)` 
    : 'none';
</script>

<svelte:window
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
/>

<div
  bind:this={element}
  class="draggable"
  class:dragging={hasMoved}
  class:disabled
  style:cursor={hasMoved ? dragCursor : cursor}
  style:transform={transform}
  on:mousedown={handleMouseDown}
  on:touchstart={handleTouchStart}
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-disabled={disabled}
>
  <slot />
</div>

<style>
  .draggable {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    touch-action: none;
    transition: transform 0s;
  }

  .draggable.dragging {
    opacity: 0.8;
    z-index: 1000;
    position: relative;
    transition: opacity 0.2s;
  }

  .draggable.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
