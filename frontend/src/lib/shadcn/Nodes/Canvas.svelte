<script lang="ts">
  import type { Snippet } from "svelte";

  interface Connection {
    from: string;
    to: string;
    color?: string;
  }

  interface NodeData {
    id: string;
    x: number;
    y: number;
  }

  interface Props {
    width?: number;
    height?: number;
    children?: Snippet;
    connections?: Connection[];
    class?: string;
  }

  let {
    width: initialWidth = 3000,
    height: initialHeight = 2000,
    children,
    connections = [],
    class: className = "",
  }: Props = $props();

  let canvasElement: HTMLDivElement;
  let svgElement: SVGSVGElement;
  let nodes = $state<Map<string, NodeData>>(new Map());
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0 });
  let scrollOffset = $state({ x: 0, y: 0 });
  let canvasWidth = $state(initialWidth);
  let canvasHeight = $state(initialHeight);
  let scale = $state(1);
  const expandThreshold = 300;
  const expandAmount = 1000;
  const nodeSize = { width: 200, height: 100 };

  export function registerNode(id: string, x: number, y: number) {
    nodes.set(id, { id, x, y });
    nodes = new Map(nodes);
  }

  export function updateNodePosition(id: string, x: number, y: number) {
    const node = nodes.get(id);
    if (!node) return;

    node.x = x;
    node.y = y;
    nodes = new Map(nodes);
    expandCanvasIfNeeded(x, y);
  }

  export function getAllNodePositions(): Map<string, { x: number; y: number }> {
    return new Map(nodes);
  }

  function shiftNodes(axis: "x" | "y", amount: number) {
    nodes.forEach((node) => {
      node[axis] += amount;
    });
    nodes = new Map(nodes);
  }

  function expandCanvasIfNeeded(nodeX: number, nodeY: number) {
    const nodeRight = nodeX + nodeSize.width;
    const nodeBottom = nodeY + nodeSize.height;

    if (nodeRight > canvasWidth - expandThreshold) {
      canvasWidth += expandAmount;
    }

    if (nodeBottom > canvasHeight - expandThreshold) {
      canvasHeight += expandAmount;
    }

    if (nodeX < expandThreshold) {
      canvasWidth += expandAmount;
      shiftNodes("x", expandAmount);
      setTimeout(
        () => canvasElement && (canvasElement.scrollLeft += expandAmount),
        0
      );
    }

    if (nodeY < expandThreshold) {
      canvasHeight += expandAmount;
      shiftNodes("y", expandAmount);
      setTimeout(
        () => canvasElement && (canvasElement.scrollTop += expandAmount),
        0
      );
    }
  }

  function getConnectionPath(from: string, to: string): string {
    const fromNode = nodes.get(from);
    const toNode = nodes.get(to);
    if (!fromNode || !toNode) return "";

    const fromX = fromNode.x + nodeSize.width / 2;
    const fromY = fromNode.y + nodeSize.height / 2;
    const toX = toNode.x + nodeSize.width / 2;
    const toY = toNode.y + nodeSize.height / 2;

    const curveOffset = Math.min(Math.abs(toX - fromX) * 0.5, 100);
    return `M ${fromX} ${fromY} C ${fromX + curveOffset} ${fromY}, ${toX - curveOffset} ${toY}, ${toX} ${toY}`;
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.target === canvasElement || e.target === svgElement) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isPanning && canvasElement) {
      canvasElement.scrollLeft = scrollOffset.x - (e.clientX - panStart.x);
      canvasElement.scrollTop = scrollOffset.y - (e.clientY - panStart.y);
    }
  }

  function handleMouseUp() {
    if (isPanning && canvasElement) {
      scrollOffset = {
        x: canvasElement.scrollLeft,
        y: canvasElement.scrollTop,
      };
      isPanning = false;
    }
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault();
      scale = Math.max(0.5, Math.min(2, scale + (e.deltaY > 0 ? -0.1 : 0.1)));
    }
  }

  $effect(() => {
    if (!isPanning) return;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={canvasElement}
  class="node-canvas relative overflow-auto bg-gray-100 {isPanning
    ? 'cursor-grabbing'
    : 'cursor-grab'} {className}"
  onmousedown={handleMouseDown}
  onwheel={handleWheel}
  role="application"
  tabindex="0"
  style="width: 100%; height: 100%;"
>
  <div
    class="canvas-content relative"
    style="width: {canvasWidth}px; height: {canvasHeight}px; transform: scale({scale}); transform-origin: top left;"
  >
    <!-- Connection lines -->
    <svg
      bind:this={svgElement}
      class="absolute inset-0 pointer-events-none z-10"
      width={canvasWidth}
      height={canvasHeight}
    >
      {#each connections as connection}
        {#if nodes.get(connection.from) && nodes.get(connection.to)}
          <line
            x1={nodes.get(connection.from)!.x + 100}
            y1={nodes.get(connection.from)!.y + 50}
            x2={nodes.get(connection.to)!.x + 100}
            y2={nodes.get(connection.to)!.y + 50}
            stroke={connection.color || "#3b82f6"}
            stroke-width="2"
          />
        {/if}
      {/each}
    </svg>

    <!-- Nodes -->
    <div class="nodes-container relative z-20">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>

  <!-- Controls info -->
  <div
    class="absolute bottom-4 left-4 bg-white px-3 py-2 rounded shadow text-sm text-gray-600 pointer-events-none"
  >
    <div>Drag canvas to pan</div>
    <div>Ctrl + Scroll to zoom (Scale: {scale.toFixed(1)}x)</div>
    <div class="text-xs text-gray-500 mt-1">
      Canvas: {canvasWidth} × {canvasHeight}px
    </div>
  </div>
</div>

<style>
  .node-canvas {
    position: relative;
    user-select: none;
  }

  .connection-path {
    transition: stroke-width 0.2s;
  }

  .connection-path:hover {
    stroke-width: 3;
  }

  .nodes-container {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
