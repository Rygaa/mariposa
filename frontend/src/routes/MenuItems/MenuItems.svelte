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
  let draggedIndex = $state<number | null>(null);
  let isDragging = $state(false);

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    
    // Load user preferences from meta
    const userMeta = _globalStore.user.meta as Record<string, any>;
    const savedFilters = userMeta?.menu_items_filters;
    
    if (savedFilters) {
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

  async function loadCategories() {
    try {
      const result = await trpc.listCategories.query({ limit: 500 });
      if (result.success) {
        categories = result.categories;
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

      if (filterCategoryId) {
        filters.categoryId = filterCategoryId;
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

  // Drag and drop handlers
  async function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      isDragging = false;
      draggedIndex = null;
      return;
    }

    // Swap the items
    const newItems = [...menuItems];
    const temp = newItems[draggedIndex];
    newItems[draggedIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update the local state immediately for smooth UX
    menuItems = newItems;
    isDragging = false;
    draggedIndex = null;

    // Prepare batch update with new indices
    const updates = newItems.map((item, index) => ({
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
              <Select bind:value={filterType} multiple>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by types" />
                </SelectTrigger>
                <SelectContent>
                  {#each typeEnum.enumValues as type}
                    <SelectItem value={type}>{type}</SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>

            {#if filterType.includes("MENU_ITEM")}
              <div class="w-full sm:w-48">
                <Select bind:value={filterCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {#each categories as category}
                      <SelectItem value={category.id}>{category.name}</SelectItem>
                    {/each}
                  </SelectContent>
                </Select>
              </div>
            {/if}

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
          {#each filteredMenuItems as menuItem, index (menuItem.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              draggable="true"
              ondragstart={() => {
                draggedIndex = index;
                isDragging = true;
              }}
              ondragend={() => {
                draggedIndex = null;
                isDragging = false;
              }}
              ondragover={(e) => {
                e.preventDefault();
              }}
              ondrop={() => handleDrop(index)}
              class="transition-opacity {isDragging && draggedIndex === index ? 'opacity-50' : 'opacity-100'} cursor-move"
            >
              <MenuItem {menuItem} />
            </div>
          {/each}
        </div>
      </DataDisplayer>
    </CardContent>
  </Card>
</Page>

