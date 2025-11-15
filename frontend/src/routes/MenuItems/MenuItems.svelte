<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import MenuItem from "./components/MenuItem.svelte";
  import CreateMenuItemModal from "./components/CreateMenuItemModal.svelte";
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
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "../../lib/shadcn/Select/index";
  import type { getMenuItemById } from "../../../../backend/src/router.types";
  import { typeEnum } from "../../../../backend/src/db/schema";

  let menuItems = $state<getMenuItemById["menuItem"][]>([]);
  let showUpdateModal = $state(false);
  let showDeleteModal = $state(false);
  let showVersionsModal = $state(false);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let filterType = $state<Array<string>>([]);
  let filterAvailable = $state<string>("all");

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    await loadMenuItems();
  });

  async function loadMenuItems() {
    isLoading = true;
    try {
      const filters: any = {};

      if (searchQuery) {
        filters.search = searchQuery;
      }

      if (filterType.length > 0) {
        filters.type = filterType as any;
      }

      if (filterAvailable !== "all") {
        filters.isAvailable = filterAvailable === "available";
      }

      const result = await trpc.listMenuItems.query(filters);
      if (result.success) {
        menuItems = result.menuItems;
      }
    } catch (error) {
      console.error("Error loading menu items:", error);
    }
    isLoading = false;
  }

  // Re-run when filters change
  $effect(() => {
    // Read the dependencies
    searchQuery;
    filterType;
    filterAvailable;
    
    // Only run after initial mount
    if (_globalStore.user) {
      loadMenuItems();
    }
  });

  const filteredMenuItems = $derived(menuItems);
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Menu Items</CardTitle>
      <CreateMenuItemModal onMenuItemCreated={loadMenuItems} />
    </CardHeader>
    <CardContent class="px-4 flex flex-col">
      <div class="mb-6">
        <div
          class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between"
        >
          <div class="flex-1 flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
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
                  placeholder="Search menu items..."
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div class="w-full sm:w-48">
              <span class="block text-sm font-medium text-gray-700 mb-2">
                Filter by Types
              </span>
              <div class="space-y-1">
                {#each typeEnum.enumValues as type}
                  <label class="flex items-center">
                    <input
                      type="checkbox"
                      checked={filterType.includes(type)}
                      onchange={(e) => {
                        if (e.currentTarget.checked) {
                          filterType = [...filterType, type];
                        } else {
                          filterType = filterType.filter(t => t !== type);
                        }
                      }}
                      class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span class="ml-2 text-xs text-gray-700">{type}</span>
                  </label>
                {/each}
              </div>
            </div>

            <div class="w-full sm:w-48">
              <Select bind:value={filterAvailable}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <DataDisplayer {isLoading} isEmpty={filteredMenuItems.length === 0}>
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {#each filteredMenuItems as menuItem (menuItem.id)}
            <MenuItem
              {menuItem}
            />
          {/each}
        </div>
      </DataDisplayer>
    </CardContent>
  </Card>
</Page>

