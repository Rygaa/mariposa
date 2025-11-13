<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    data = [],
    onCellClick,
  }: {
    data?: any[];
    onCellClick?: (event: MouseEvent) => void;
  } = $props();

  const columns = $derived(data.length > 0 ? Object.keys(data[0]) : []);
  
  function isHTML(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.trim().startsWith('<') && value.trim().endsWith('>');
  }

  function isSnippet(value: any): value is Snippet {
    return typeof value === 'function';
  }
</script>

<div class="w-full overflow-auto border border-gray-200 rounded-lg" onclick={onCellClick}>
  <div class="min-w-full">
    <div class="bg-gray-50 border-b border-gray-200">
      <div class="flex">
        {#each columns as column}
          <div class="flex-1 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {column}
          </div>
        {/each}
      </div>
    </div>
    <div class="bg-white divide-y divide-gray-200">
      {#each data as row, i (i)}
        <div class="flex hover:bg-gray-50 transition-colors">
          {#each columns as column}
            <div class="flex-1 px-4 py-3 text-sm text-gray-900">
              {#if isSnippet(row[column])}
                {@render row[column]()}
              {:else if isHTML(row[column])}
                {@html row[column]}
              {:else}
                {row[column]}
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>
