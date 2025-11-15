<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    onPositionChange?: (id: string, x: number, y: number) => void;
    children?: Snippet;
    class?: string;
  }

  let {
    id,
    x = $bindable(0),
    y = $bindable(0),
    width = 200,
    height = 100,
    onPositionChange,
    children,
    class: className = "",
  }: Props = $props();

  let isDragging = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  let nodeElement: HTMLDivElement;

  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest(".node-content")) {
      isDragging = true;
      const canvas = nodeElement.closest('.node-canvas') as HTMLElement;
      const content = nodeElement.closest('.canvas-content') as HTMLElement;
      
      if (canvas && content) {
        const canvasRect = canvas.getBoundingClientRect();
        
        // Get the scale from the transform property
        const transform = window.getComputedStyle(content).transform;
        let scale = 1;
        if (transform && transform !== 'none') {
          const matrix = transform.match(/matrix\(([^)]+)\)/);
          if (matrix) {
            scale = parseFloat(matrix[1].split(',')[0]);
          }
        }
        
        // Calculate offset accounting for scroll and scale
        const scrollLeft = canvas.scrollLeft;
        const scrollTop = canvas.scrollTop;
        
        dragOffset = {
          x: (e.clientX - canvasRect.left + scrollLeft) / scale - x,
          y: (e.clientY - canvasRect.top + scrollTop) / scale - y,
        };
      }
      e.preventDefault();
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isDragging) {
      const canvas = nodeElement.closest('.node-canvas') as HTMLElement;
      const content = nodeElement.closest('.canvas-content') as HTMLElement;
      
      if (canvas && content) {
        const canvasRect = canvas.getBoundingClientRect();
        
        // Get the scale from the transform property
        const transform = window.getComputedStyle(content).transform;
        let scale = 1;
        if (transform && transform !== 'none') {
          const matrix = transform.match(/matrix\(([^)]+)\)/);
          if (matrix) {
            scale = parseFloat(matrix[1].split(',')[0]);
          }
        }
        
        // Calculate position accounting for scroll and scale
        const scrollLeft = canvas.scrollLeft;
        const scrollTop = canvas.scrollTop;
        
        const newX = (e.clientX - canvasRect.left + scrollLeft) / scale - dragOffset.x;
        const newY = (e.clientY - canvasRect.top + scrollTop) / scale - dragOffset.y;
        
        x = newX;
        y = newY;
        
        if (onPositionChange) {
          onPositionChange(id, x, y);
        }
      }
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }

  $effect(() => {
    const handleMove = (e: MouseEvent) => handleMouseMove(e);
    const handleUp = () => handleMouseUp();

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);

      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
    }
  });

  // Get connection point (center of node)
  export function getConnectionPoint() {
    return {
      x: x + width / 2,
      y: y + height / 2,
    };
  }
</script>

<div
  bind:this={nodeElement}
  class="node absolute bg-white border-2 border-gray-300 rounded-lg shadow-lg {isDragging
    ? 'cursor-grabbing'
    : 'cursor-grab'} {className}"
  style="left: {x}px; top: {y}px; width: {width}px; min-height: {height}px;"
  onmousedown={handleMouseDown}
  role="button"
  tabindex="0"
>
  <div class="node-content p-4">
    {#if children}
      {@render children()}
    {:else}
      <div class="text-gray-700 font-medium">Node {id}</div>
    {/if}
  </div>
  
  <!-- Connection points -->
  <div
    class="absolute w-3 h-3 bg-blue-500 rounded-full top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"
    title="Connection point"
  ></div>
  <div
    class="absolute w-3 h-3 bg-blue-500 rounded-full top-1/2 right-0 translate-x-1/2 -translate-y-1/2"
    title="Connection point"
  ></div>
</div>

<style>
  .node {
    user-select: none;
    transition: box-shadow 0.2s;
  }

  .node:hover {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    border-color: #3b82f6;
  }

  .node.cursor-grabbing {
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  }
</style>
