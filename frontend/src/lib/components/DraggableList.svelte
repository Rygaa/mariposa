<script lang="ts" generics="T extends { id: string }">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  interface Props {
    items: T[];
    onReorder: (reorderedItems: T[]) => Promise<void>;
    itemKey?: (item: T) => string;
    children: Snippet<[{ item: T; index: number; isDragging: boolean; dragHandleProps: any }]>;
    gridClass?: string;
  }

  let {
    items = $bindable(),
    onReorder,
    itemKey = (item) => item.id,
    children,
    gridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
  }: Props = $props();

  let draggedIndex = $state<number | null>(null);
  let isDragging = $state(false);

  async function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      isDragging = false;
      draggedIndex = null;
      return;
    }

    // Swap the items
    const newItems = [...items];
    const temp = newItems[draggedIndex];
    newItems[draggedIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update the local state immediately for smooth UX
    items = newItems;
    isDragging = false;
    draggedIndex = null;

    // Call the reorder callback
    try {
      await onReorder(newItems);
    } catch (error) {
      console.error("Error reordering items:", error);
    }
  }

  function handleDragStart(index: number) {
    draggedIndex = index;
    isDragging = true;
  }

  function handleDragEnd() {
    draggedIndex = null;
    isDragging = false;
  }
</script>

<div class={gridClass}>
  {#each items as item, index (itemKey(item))}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="transition-opacity {isDragging && draggedIndex === index
        ? 'opacity-50'
        : 'opacity-100'}"
      ondragover={(e) => {
        e.preventDefault();
      }}
      ondrop={() => handleDrop(index)}
    >
      {@render children({
        item,
        index,
        isDragging: isDragging && draggedIndex === index,
        dragHandleProps: {
          draggable: true,
          ondragstart: () => handleDragStart(index),
          ondragend: handleDragEnd,
        },
      })}
    </div>
  {/each}
</div>
