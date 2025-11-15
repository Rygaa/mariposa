<script lang="ts">
  import { onMount } from "svelte";
  import { Canvas, Node } from "../lib/shadcn/Nodes";
  import { Page } from "../lib/shadcn";

  // Node positions (bindable)
  let node1 = $state({ x: 100, y: 100 });
  let node2 = $state({ x: 400, y: 100 });
  let node3 = $state({ x: 250, y: 300 });
  let node4 = $state({ x: 600, y: 200 });
  let node5 = $state({ x: 800, y: 100 });

  // Define connections between nodes
  let connections = $state([
    { from: "node1", to: "node2" },
    { from: "node1", to: "node2" },
    { from: "node2", to: "node3" },
    { from: "node1", to: "node3" },
    { from: "node2", to: "node4", color: "#ef4444" },
    { from: "node4", to: "node5", color: "#10b981" },
  ]);

  let canvasRef: any;

  // Handle node position changes
  function handlePositionChange(id: string, x: number, y: number) {
    if (canvasRef) {
      canvasRef.updateNodePosition(id, x, y);
    }
  }

  // Register nodes with canvas after mount
  onMount(() => {
    if (canvasRef) {
      canvasRef.registerNode("node1", node1.x, node1.y);
      canvasRef.registerNode("node2", node2.x, node2.y);
      canvasRef.registerNode("node3", node3.x, node3.y);
      canvasRef.registerNode("node4", node4.x, node4.y);
      canvasRef.registerNode("node5", node5.x, node5.y);
    }
  });

  // Sync canvas node positions back to local state periodically
  $effect(() => {
    const interval = setInterval(() => {
      if (canvasRef) {
        const positions = canvasRef.getAllNodePositions();
        const pos1 = positions.get("node1");
        const pos2 = positions.get("node2");
        const pos3 = positions.get("node3");
        const pos4 = positions.get("node4");
        const pos5 = positions.get("node5");
        
        if (pos1) { node1.x = pos1.x; node1.y = pos1.y; }
        if (pos2) { node2.x = pos2.x; node2.y = pos2.y; }
        if (pos3) { node3.x = pos3.x; node3.y = pos3.y; }
        if (pos4) { node4.x = pos4.x; node4.y = pos4.y; }
        if (pos5) { node5.x = pos5.x; node5.y = pos5.y; }
      }
    }, 100);

    return () => clearInterval(interval);
  });
</script>

<Page>
  <div class="flex flex-col h-full w-full">
    <!-- Header -->
    <div class="bg-white border-b px-6 py-4">
      <h1 class="text-2xl font-bold text-gray-900">Node System Demo</h1>
      <p class="text-gray-600 mt-1">
        Drag nodes around, pan the canvas, and use Ctrl+Scroll to zoom
      </p>
    </div>

    <!-- Canvas -->
    <div class="flex-1 overflow-hidden">
      <Canvas bind:this={canvasRef} {connections}>
        <Node
          id="node1"
          bind:x={node1.x}
          bind:y={node1.y}
          onPositionChange={handlePositionChange}
        >
          <div class="text-center">
            <div class="text-lg font-bold text-blue-600">Start Node</div>
            <div class="text-sm text-gray-500 mt-1">ID: node1</div>
          </div>
        </Node>

        <Node
          id="node2"
          bind:x={node2.x}
          bind:y={node2.y}
          onPositionChange={handlePositionChange}
        >
          <div class="text-center">
            <div class="text-lg font-bold text-purple-600">Process Node</div>
            <div class="text-sm text-gray-500 mt-1">ID: node2</div>
            <div class="text-xs text-gray-400 mt-1">
              Connects to node3 & node4
            </div>
          </div>
        </Node>

        <Node
          id="node3"
          bind:x={node3.x}
          bind:y={node3.y}
          onPositionChange={handlePositionChange}
          height={120}
        >
          <div class="text-center">
            <div class="text-lg font-bold text-green-600">Decision Node</div>
            <div class="text-sm text-gray-500 mt-1">ID: node3</div>
            <div class="text-xs text-gray-400 mt-1">
              Receives from node1 & node2
            </div>
          </div>
        </Node>

        <Node
          id="node4"
          bind:x={node4.x}
          bind:y={node4.y}
          onPositionChange={handlePositionChange}
        >
          <div class="text-center">
            <div class="text-lg font-bold text-red-600">Gateway Node</div>
            <div class="text-sm text-gray-500 mt-1">ID: node4</div>
            <div class="text-xs text-red-400 mt-1">Red connection</div>
          </div>
        </Node>

        <Node
          id="node5"
          bind:x={node5.x}
          bind:y={node5.y}
          onPositionChange={handlePositionChange}
        >
          <div class="text-center">
            <div class="text-lg font-bold text-indigo-600">End Node</div>
            <div class="text-sm text-gray-500 mt-1">ID: node5</div>
            <div class="text-xs text-green-400 mt-1">Green connection</div>
          </div>
        </Node>
      </Canvas>
    </div>

    <!-- Info Panel -->
    <div class="bg-white border-t px-6 py-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h3 class="font-semibold text-gray-700 mb-2">Features:</h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>✓ Draggable nodes</li>
            <li>✓ Auto-updating connections</li>
            <li>✓ Infinite canvas (auto-expands)</li>
            <li>✓ Pannable canvas</li>
            <li>✓ Zoom support (Ctrl+Scroll)</li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold text-gray-700 mb-2">Connections:</h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• node1 → node2 (blue)</li>
            <li>• node1 → node3 (blue)</li>
            <li>• node2 → node3 (blue)</li>
            <li>• node2 → node4 (red)</li>
            <li>• node4 → node5 (green)</li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold text-gray-700 mb-2">Tips:</h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Drag nodes to reposition</li>
            <li>• Drag canvas background to pan</li>
            <li>• Hold Ctrl and scroll to zoom</li>
            <li>• Canvas expands infinitely!</li>
            <li>• Drag nodes near edges to expand</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</Page>
