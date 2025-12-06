<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";

  let {
    data = [],
    onCellClick,
    tableId = "default-table",
    actions,
    excludeFilters = [],
    inputFilters = [],
  }: {
    data?: any[];
    onCellClick?: (event: MouseEvent) => void;
    tableId?: string;
    actions?: Snippet<[any]>;
    excludeFilters?: string[];
    inputFilters?: string[];
  } = $props();

  const columns = $derived(data.length > 0 ? Object.keys(data[0]).filter(key => !key.startsWith('_')) : []);
  const storageKey = `datagrid-filters-${tableId}`;


  $effect(() => {
  console.log(data)

  })
  
  let columnFilters = $state<Record<string, string>>({});
  
  onMount(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        columnFilters = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
  });
  
  $effect(() => {
    if (Object.keys(columnFilters).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(columnFilters));
    }
  });
  
  const columnOptions = $derived(
    columns.reduce((acc, column) => {
      const uniqueValues = new Set<string>();
      data.forEach((row) => {
        const value = row[column];
        if (value !== null && value !== undefined) {
          uniqueValues.add(String(value));
        }
      });
      acc[column] = Array.from(uniqueValues).sort();
      return acc;
    }, {} as Record<string, string[]>)
  );
  
  const filteredData = $derived(
    data.filter((row) => {
      return Object.entries(columnFilters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = row[column];
        if (cellValue === null || cellValue === undefined) return false;
        
        // For input filters, use case-insensitive partial match
        if (inputFilters.includes(column)) {
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
        }
        
        // For dropdown filters, use exact match
        return String(cellValue) === filterValue;
      });
    })
  );

  $effect(() => {
    console.log(filteredData)
    console.log(data)
    console.log(columnFilters)
  });
  
  function isHTML(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.trim().startsWith('<') && value.trim().endsWith('>');
  }

  function isSnippet(value: any): value is Snippet {
    return typeof value === 'function';
  }
</script>

<div class="w-full border border-gray-200 rounded-lg overflow-hidden" onclick={onCellClick}>
  <div class="overflow-auto max-h-[calc(100vh-300px)]">
    <div class="min-w-full">
      <div class="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
        <div class="flex">
          {#each columns as column}
            <div class="flex-1 px-4 py-3 text-left">
              <div class="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                {column}
              </div>
              {#if !excludeFilters.includes(column)}
                {#if inputFilters.includes(column)}
                  <input
                    type="text"
                    bind:value={columnFilters[column]}
                    placeholder="Filter..."
                    class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    onclick={(e) => e.stopPropagation()}
                  />
                {:else}
                  <select
                    bind:value={columnFilters[column]}
                    class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    onclick={(e) => e.stopPropagation()}
                  >
                    <option value="">All</option>
                    {#each columnOptions[column] || [] as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                {/if}
              {/if}
            </div>
          {/each}
          {#if actions}
            <div class="w-32 px-4 py-3 text-left">
              <div class="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Actions
              </div>
            </div>
          {/if}
        </div>
      </div>
      <div class="bg-white divide-y divide-gray-200">
      {#each filteredData as row, i (i)}
        <div class="flex hover:bg-gray-50 transition-colors {row._isDeleted ? 'bg-gray-100 opacity-60' : ''}">
          {#each columns as column}
            <div class="flex-1 px-4 py-3 text-sm {row._isDeleted ? 'text-gray-500' : 'text-gray-900'} {column === 'Valid' && row._hasError ? 'text-red-600 font-bold' : ''}">
              {#if isSnippet(row[column])}
                {@render row[column]()}
              {:else if isHTML(row[column])}
                {@html row[column]}
              {:else}
                {row[column]}
              {/if}
            </div>
          {/each}
          {#if actions}
            <div class="w-32 px-4 py-3 text-sm">
              {@render actions(row)}
            </div>
          {/if}
        </div>
      {/each}
      </div>
    </div>
  </div>
</div>
