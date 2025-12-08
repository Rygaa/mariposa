<script lang="ts">
  import { onMount } from "svelte";
  import CreateMenuItemModal from "./components/CreateMenuItemModal.svelte";
  import UpdateRawMaterialModal from "./components/UpdateRawMaterialModal.svelte";
  import UpdateRawMaterialStock from "./components/UpdateRawMaterialStock.svelte";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";
  import Page from "../../lib/shadcn/Page.svelte";
  import DataDisplayer from "../../lib/shadcn/DataDisplayer.svelte";
  import DataGrid from "../../lib/shadcn/DataGrid.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../lib/shadcn/Card/index";
  import type { getMenuItemById } from "../../../../backend/src/router.types";

  let { type }: { type?: string } = $props();

  let menuItems = $state<getMenuItemById["menuItem"][]>([]);
  let categories = $state<any[]>([]);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let filterType = $state<Array<string>>([]);
  let filterCategoryId = $state<string>("");
  let filterAvailable = $state<string>("all");
  let hasLoadedUserPreferences = $state(false);
  let lastSavedFilters = $state<string>("");
  let isUpdateModalOpen = $state(false);
  let selectedMenuItem = $state<any>(null);
  let isStockModalOpen = $state(false);
  let stockModalMode = $state<"add" | "subtract">("add");
  let selectedStockItem = $state<any>(null);

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

  const filteredMenuItems = $derived(
    menuItems.map(item => {
      // Get latest buying and selling prices if they exist
      const buyingPrices = (item as any).buyingPrices || [];
      const sellingPrices = (item as any).sellingPrices || [];
      
      // Check for template prices
      const hasTemplates = buyingPrices.some((p: any) => p.isTemplate === true);
      
      const latestBuyingPrice = buyingPrices.length > 0 
        ? buyingPrices.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;
      
      const latestSellingPrice = sellingPrices.length > 0
        ? sellingPrices.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;

      const inHouse = item.inHouseStockQuantity ?? 0;
      const inShop = item.inShopStockQuantity ?? 0;
      const unit = item.unit || 'units';

      return {
        name: item.name,
        'in-house stock': `${inHouse} ${unit}`,
        'in-shop stock': `${inShop} ${unit}`,
        'buying price': latestBuyingPrice ? `$${latestBuyingPrice.priceValue}` : (item.cost ? `$${item.cost}` : 'N/A'),
        'selling price': latestSellingPrice ? `$${latestSellingPrice.priceValue}` : (item.price ? `$${item.price}` : 'N/A'),
        _original: item,
        _hasTemplates: hasTemplates
      };
    })
  );

  function handleEdit(row: any) {
    selectedMenuItem = row._original;
    isUpdateModalOpen = true;
  }

  function handleCloseUpdateModal() {
    isUpdateModalOpen = false;
    selectedMenuItem = null;
  }

  async function handleMenuItemUpdated() {
    await loadMenuItems();
  }

  function handleAddStock(row: any) {
    selectedStockItem = row._original;
    stockModalMode = "add";
    isStockModalOpen = true;
  }

  function handleSubtractStock(row: any) {
    selectedStockItem = row._original;
    stockModalMode = "subtract";
    isStockModalOpen = true;
  }

  function handleCloseStockModal() {
    isStockModalOpen = false;
    selectedStockItem = null;
  }

  async function handleStockUpdated() {
    await loadMenuItems();
  }
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Raw Materials</CardTitle>
      <div class="flex gap-2">
        <CreateMenuItemModal defaultType="RAW_MATERIAL" onMenuItemCreated={loadMenuItems} />
        <button
          onclick={() => {
            selectedStockItem = null;
            stockModalMode = 'add';
            isStockModalOpen = true;
          }}
          class="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          Manage Stocks
        </button>
      </div>
    </CardHeader>
    <CardContent class="p-4 flex flex-col">
      <DataDisplayer {isLoading} isEmpty={filteredMenuItems.length === 0}>
        <DataGrid 
          data={filteredMenuItems} 
          tableId="raw-materials-menu-items"
          inputFilters={['name']}
        >
          {#snippet actions(row)}
            <div class="flex items-center gap-2">
              {#if !row._hasTemplates}
                <button
                  onclick={() => {
                    selectedStockItem = row._original;
                    isStockModalOpen = true;
                  }}
                  class="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                  title="No price templates! Click to add templates."
                >
                  ⚠️ Add Templates
                </button>
              {/if}
              <button
                onclick={() => handleEdit(row)}
                class="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                Edit
              </button>
            </div>
          {/snippet}
        </DataGrid>
      </DataDisplayer>
    </CardContent>
  </Card>
</Page>

{#if selectedMenuItem}
  <UpdateRawMaterialModal
    bind:isOpen={isUpdateModalOpen}
    menuItem={selectedMenuItem}
    onClose={handleCloseUpdateModal}
    onMenuItemUpdated={handleMenuItemUpdated}
  />
{/if}

<UpdateRawMaterialStock
  bind:isOpen={isStockModalOpen}
  onClose={handleCloseStockModal}
  onStockUpdated={handleStockUpdated}
/>

