<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import MenuItem from "./components/MenuItem.svelte";
  import CreateMenuItemModal from "./components/CreateMenuItemModal.svelte";
  import DraggableList from "../../lib/components/DraggableList.svelte";
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

  let { type }: { type?: string } = $props();

  let menuItems = $state<getMenuItemById["menuItem"][]>([]);
  let categories = $state<any[]>([]);
  let showUpdateModal = $state(false);
  let showDeleteModal = $state(false);
  let showVersionsModal = $state(false);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let filterType = $state<Array<string>>([]);
  let filterCategoryId = $state<string>("");
  let filterAvailable = $state<string>("all");
  let hasLoadedUserPreferences = $state(false);
  let lastSavedFilters = $state<string>("");

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    
    // Load user preferences from meta
    const userMeta = _globalStore.user.meta as Record<string, any>;
    const savedFilters = userMeta?.menu_items_filters;
    
    if (type) {
      // Type prop takes precedence
      filterType = [type];
    } else if (savedFilters) {
      if (savedFilters.type) filterType = savedFilters.type;
      if (savedFilters.categoryId) filterCategoryId = savedFilters.categoryId;
      if (savedFilters.available) filterAvailable = savedFilters.available;
      if (savedFilters.search) searchQuery = savedFilters.search;
      
      lastSavedFilters = JSON.stringify(savedFilters);
    } else {
      lastSavedFilters = JSON.stringify({});
    }
    
    hasLoadedUserPreferences = true;
    await Promise.all([loadMenuItems(), loadCategories()]);
  });

  // Watch for type prop changes
  $effect(() => {
    if (type && hasLoadedUserPreferences) {
      filterType = [type];
    }
  });

  async function loadCategories() {
    try {
      const result = await trpc.listCategories.query({ limit: 500 });
      if (result.success) {
        categories = result.categories;
        
        // Set first category as default if no filter is set
        if (!filterCategoryId && categories.length > 0) {
          filterCategoryId = categories[0].id;
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

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

      // Only apply category filter when filtering by MENU_ITEM type
      if (filterCategoryId && filterType.includes("MENU_ITEM")) {
        if (filterCategoryId === "not-linked") {
          filters.categoryId = null;
        } else {
          filters.categoryId = filterCategoryId;
        }
      }

      if (filterAvailable !== "all") {
        filters.isAvailable = filterAvailable === "available";
      }

      const result = await trpc.listAllMenuItems.query(filters);
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
    filterCategoryId;
    filterAvailable;
    
    // Only run after initial mount and preferences are loaded
    if (_globalStore.user && hasLoadedUserPreferences) {
      loadMenuItems();
    }
  });

  // Save all filters to user meta when they change
  $effect(() => {
    if (hasLoadedUserPreferences && _globalStore.user) {
      const currentFilters = {
        type: filterType,
        categoryId: filterCategoryId,
        available: filterAvailable,
        search: searchQuery,
      };
      const currentFiltersStr = JSON.stringify(currentFilters);
      
      // Only save if the value has actually changed
      if (currentFiltersStr !== lastSavedFilters) {
        // Debounce the save operation
        const timeoutId = setTimeout(async () => {
          try {
            await trpc.updateUserMeta.mutate({
              metaKey: "menu_items_filters",
              metaValue: currentFilters,
            });
            
            lastSavedFilters = currentFiltersStr;
            
            // Update local user meta
            if (_globalStore.user) {
              _globalStore.user = {
                ..._globalStore.user,
                meta: {
                  ...(_globalStore.user.meta as Record<string, any> || {}),
                  menu_items_filters: currentFilters,
                },
              };
            }
          } catch (error) {
            console.error("Error saving filter preferences:", error);
          }
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  });

  const filteredMenuItems = $derived(menuItems);

  // Reorder handler for drag and drop
  async function handleReorder(reorderedItems: getMenuItemById["menuItem"][]) {
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      index: index,
    }));

    try {
      await trpc.batchUpdateMenuItems.mutate({ updates });
    } catch (error) {
      console.error("Error reordering menu items:", error);
      // Reload items on error
      await loadMenuItems();
    }
  }
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Menu Items</CardTitle>
      <CreateMenuItemModal onMenuItemCreated={loadMenuItems} />
    </CardHeader>
    <CardContent class="p-4 flex flex-col">
      <div class="mb-6">
        <div class="flex flex-col gap-4">
          {#if filterType.includes("MENU_ITEM") && !filterType.includes("SUPPLEMENT")}
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-2">Categories</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  onclick={() => filterCategoryId = "not-linked"}
                  class="px-3 py-1.5 text-sm rounded-md transition-colors {filterCategoryId === 'not-linked' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                >
                  Not Linked
                </button>
                {#each categories as category}
                  <button
                    onclick={() => filterCategoryId = category.id}
                    class="px-3 py-1.5 text-sm rounded-md transition-colors {filterCategoryId === category.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                  >
                    {category.name}
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Availability</h3>
            <div class="flex flex-wrap gap-2">
              <button
                onclick={() => filterAvailable = "all"}
                class="px-3 py-1.5 text-sm rounded-md transition-colors {filterAvailable === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                All Items
              </button>
              <button
                onclick={() => filterAvailable = "available"}
                class="px-3 py-1.5 text-sm rounded-md transition-colors {filterAvailable === 'available' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                Available
              </button>
              <button
                onclick={() => filterAvailable = "unavailable"}
                class="px-3 py-1.5 text-sm rounded-md transition-colors {filterAvailable === 'unavailable' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                Unavailable
              </button>
            </div>
          </div>
        </div>
      </div>

      <DataDisplayer {isLoading} isEmpty={filteredMenuItems.length === 0}>
        <DraggableList items={filteredMenuItems} onReorder={handleReorder}>
          {#snippet children({ item: menuItem, dragHandleProps })}
            <MenuItem {menuItem} {dragHandleProps} />
          {/snippet}
        </DraggableList>
      </DataDisplayer>
    </CardContent>
  </Card>
</Page>

