<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import EatingTable from "./components/EatingTable.svelte";
  import CreateEatingTableModal from "./components/CreateEatingTableModal.svelte";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";
  import Page from "../../lib/shadcn/Page.svelte";
  import DataDisplayer from "../../lib/shadcn/DataDisplayer.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../lib/shadcn/Card/index";
  import { Draggable } from "../../lib/shadcn/Drag";
  import type { getEatingTableById } from "../../../../backend/src/router.types";

  let eatingTables = $state<getEatingTableById["eatingTable"][]>([]);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let filterType = $state<string>("all");
  let filterActive = $state<string>("all");

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    await loadEatingTables();
  });

  async function loadEatingTables() {
    isLoading = true;
    try {
      const filters: any = {};

      if (searchQuery) {
        filters.search = searchQuery;
      }

      if (filterType !== "all") {
        filters.type = filterType;
      }

      if (filterActive !== "all") {
        filters.isActive = filterActive === "active";
      }

      const result = await trpc.listEatingTables.query(filters);
      if (result.success) {
        eatingTables = result.eatingTables;
      }
    } catch (error) {
      console.error("Error loading eating tables:", error);
    }
    isLoading = false;
  }

  // Reactive filter
  $effect(() => {
    loadEatingTables();
  });

  const filteredTables = $derived(eatingTables);

  function getTableAtPosition(x: number, y: number, excludeId?: string): getEatingTableById["eatingTable"] | null {
    // Get element at the drop position
    const elements = document.elementsFromPoint(x, y);
    
    // Find the table element
    for (const el of elements) {
      const tableEl = el.closest('[data-table-id]');
      if (tableEl) {
        const tableId = (tableEl as HTMLElement).dataset.tableId;
        if (tableId && tableId !== excludeId) {
          return filteredTables.find(t => t.id === tableId) || null;
        }
      }
    }
    return null;
  }

  async function handleTableDragged(draggedTable: getEatingTableById["eatingTable"], event: CustomEvent) {
    const { draggedTo, draggedFrom } = event.detail;
    
    // Find which table was at the start position
    const fromTable = getTableAtPosition(draggedFrom.x, draggedFrom.y, draggedTable.id);
    
    // Find which table is at the drop position
    const toTable = getTableAtPosition(draggedTo.x, draggedTo.y, draggedTable.id);
    
    console.log(`Table "${draggedTable.name}" dragged:`);
    console.log('  From:', fromTable ? `Table "${fromTable.name}" (ID: ${fromTable.id})` : 'original position');
    console.log('  To:', toTable ? `Table "${toTable.name}" (ID: ${toTable.id})` : 'empty space');
    
    // Swap positions if dropped on another table
    if (toTable) {
      console.log(`  -> Swapping "${draggedTable.name}" with "${toTable.name}"`);
      
      try {
        const result = await trpc.reorderEatingTables.mutate({
          tableId: draggedTable.id,
          targetTableId: toTable.id,
        });
        
        if (result.success) {
          console.log('  -> Tables reordered successfully');
          await loadEatingTables();
        }
      } catch (error) {
        console.error('  -> Error reordering tables:', error);
      }
    }
  }
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Eating Tables</CardTitle>
      <CreateEatingTableModal onTableCreated={loadEatingTables} />
    </CardHeader>
    <CardContent class="px-4 flex flex-col">
      <div class="mb-6">
        <div
          class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between"
        >
          <!-- Search and Filters -->
          <div class="flex-1 flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <!-- Search -->
            <div class="flex-1 max-w-md">
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <Icon iconName="search" class="text-gray-400" />
                </div>
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder="Search tables..."
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DataDisplayer {isLoading} isEmpty={filteredTables.length === 0}>
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {#each filteredTables as table (table.id)}
            <div data-table-id={table.id}>
              <Draggable on:dragged={(e) => handleTableDragged(table, e)}>
                <EatingTable
                  {table}
                  onEatingTablesChanged={loadEatingTables}
                />
              </Draggable>
            </div>
          {/each}
        </div>
      </DataDisplayer>
    </CardContent>
  </Card>
</Page>
