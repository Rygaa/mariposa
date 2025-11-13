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
            <EatingTable
              {table}
              onEatingTablesChanged={loadEatingTables}
            />
          {/each}
        </div>
      </DataDisplayer>
    </CardContent>
  </Card>
</Page>
