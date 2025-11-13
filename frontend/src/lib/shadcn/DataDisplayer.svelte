<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    isLoading = false,
    isEmpty = false,
  }: {
    children?: Snippet;
    isLoading?: boolean;
    isEmpty?: boolean;
  } = $props();
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-12">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
{:else if isEmpty}
  <div class="col-span-full py-12 text-center">
    <div class="text-gray-400">
      <p class="text-lg font-medium">No data available</p>
      <p class="text-sm mt-1">There are no items to display</p>
    </div>
  </div>
{:else if children}
  {@render children()}
{/if}

