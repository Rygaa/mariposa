<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    trigger,
    open = $bindable(false),
    align = "end" as "start" | "end" | "center",
    class: className = "",
  }: {
    children?: Snippet;
    trigger?: Snippet;
    open?: boolean;
    align?: "start" | "end" | "center";
    class?: string;
  } = $props();

  function toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    open = !open;
  }

  function closeDropdown() {
    open = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    e.stopPropagation();
    closeDropdown();
  }

  const alignClasses = {
    start: "left-0",
    end: "right-0",
    center: "left-1/2 -translate-x-1/2",
  };
</script>

<div class="relative inline-block {className}">
  <button type="button" onclick={toggleDropdown} class="inline-flex">
    {#if trigger}
      {@render trigger()}
    {/if}
  </button>

  {#if open}
    <div
      class="absolute {alignClasses[align]} mt-2 w-max overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md z-50"
    >
      {#if children}
        {@render children()}
      {/if}
    </div>

    <button
      class="fixed inset-0 z-40"
      onclick={handleBackdropClick}
      aria-label="Close dropdown"
      tabindex="-1"
    ></button>
  {/if}
</div>
