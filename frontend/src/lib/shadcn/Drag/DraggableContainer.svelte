<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type DragPosition = {
    x: number;
    y: number;
  };

  export let allowDrop = true;
  export let highlightOnDragOver = true;

  const dispatch = createEventDispatcher<{
    drop: { position: DragPosition; event: DragEvent };
    dragover: { position: DragPosition; event: DragEvent };
    dragenter: { event: DragEvent };
    dragleave: { event: DragEvent };
  }>();

  let isDragOver = false;
  let element: HTMLElement;

  function handleDragOver(e: DragEvent) {
    if (!allowDrop) return;
    
    e.preventDefault();
    isDragOver = true;
    
    const position = { x: e.clientX, y: e.clientY };
    dispatch('dragover', { position, event: e });
  }

  function handleDragEnter(e: DragEvent) {
    if (!allowDrop) return;
    
    e.preventDefault();
    isDragOver = true;
    
    dispatch('dragenter', { event: e });
  }

  function handleDragLeave(e: DragEvent) {
    if (!allowDrop) return;
    
    isDragOver = false;
    
    dispatch('dragleave', { event: e });
  }

  function handleDrop(e: DragEvent) {
    if (!allowDrop) return;
    
    e.preventDefault();
    isDragOver = false;
    
    const position = { x: e.clientX, y: e.clientY };
    dispatch('drop', { position, event: e });
  }
</script>

<div
  bind:this={element}
  class="draggable-container"
  class:drag-over={isDragOver && highlightOnDragOver}
  on:dragover={handleDragOver}
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  role="region"
  aria-label="Draggable container"
>
  <slot />
</div>

<style>
  .draggable-container {
    width: 100%;
    height: 100%;
    transition: background-color 0.2s ease;
  }

  .draggable-container.drag-over {
    background-color: rgba(59, 130, 246, 0.1);
    outline: 2px dashed rgba(59, 130, 246, 0.5);
    outline-offset: 4px;
  }
</style>
