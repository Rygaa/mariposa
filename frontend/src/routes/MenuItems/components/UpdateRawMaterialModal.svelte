<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "../../../lib/shadcn/Dialog/index";
  import Button from "../../../lib/components/Button.svelte";
  import Input from "../../../lib/components/Input.svelte";
  import { trpc } from "../../../lib/trpc";
  import { typeEnum } from "../../../../../backend/src/db/schema";

  let {
    isOpen = $bindable(false),
    menuItem,
    onClose,
    onMenuItemUpdated,
  }: {
    isOpen: boolean;
    menuItem: any;
    onClose: () => void;
    onMenuItemUpdated: () => void | Promise<void>;
  } = $props();

  let name = $state("");
  let type = $state<
    Array<"MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION">
  >(["RAW_MATERIAL"]);
  let unit = $state<"gramme" | "Kg" | "portion" | "liter" | "milliliter">("gramme");
  let inHouseStockQuantity = $state<number | null>(null);
  let inShopStockQuantity = $state<number | null>(null);
  let stockConversionRatio = $state<number>(1);
  let isSubmitting = $state(false);
  let error = $state("");
  let latestBuyingPrice = $state<number | null>(null);
  let loadingPrices = $state(false);
  let allBuyingPrices = $state<any[]>([]);
  let showAllPrices = $state(false);
  let newBuyingPrice = $state<number | null>(null);
  let newBuyingDescription = $state("");
  let newBuyingUnitValue = $state<number | null>(null);
  let newBuyingMultiplier = $state<number>(1);
  let isAddingBuyingPrice = $state(false);

  async function loadItemPrices(menuItemId: string) {
    loadingPrices = true;
    latestBuyingPrice = null;
    allBuyingPrices = [];
    try {
      // Fetch buying prices - only show templates
      const buyingResult = await trpc.listItemPricesByMenuItem.query({
        menuItemId,
        priceType: "buying",
      });
      if (buyingResult.success && buyingResult.itemPrices.length > 0) {
        // Filter to only show template prices (isTemplate = true)
        const templates = buyingResult.itemPrices.filter((p: any) => p.isTemplate === true);
        const sortedBuying = [...templates].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        allBuyingPrices = sortedBuying;
        if (sortedBuying.length > 0) {
          latestBuyingPrice = sortedBuying[0].priceValue;
        }
      }
    } catch (err) {
      console.error("Failed to load item prices:", err);
    }
    loadingPrices = false;
  }

  async function handleAddBuyingPrice() {
    if (!newBuyingPrice || !newBuyingUnitValue || !menuItem?.id) return;
    
    isAddingBuyingPrice = true;
    try {
      const result = await trpc.createItemPrice.mutate({
        menuItemId: menuItem.id,
        priceValue: newBuyingPrice,
        priceType: "buying",
        unitValue: newBuyingUnitValue,
        multiplier: newBuyingMultiplier || 1,
        description: newBuyingDescription || undefined,
        isTemplate: true, // This is a price template for reuse
      });
      
      if (result.success) {
        newBuyingPrice = null;
        newBuyingUnitValue = null;
        newBuyingMultiplier = 1;
        newBuyingDescription = "";
        await loadItemPrices(menuItem.id);
      }
    } catch (err: any) {
      console.error("Failed to add buying price:", err);
      error = err.message || "Failed to add buying price";
    } finally {
      isAddingBuyingPrice = false;
    }
  }

  async function handleDeletePrice(priceId: string) {
    if (!menuItem?.id || !confirm("Are you sure you want to delete this price?")) return;
    
    try {
      const result = await trpc.deleteItemPrice.mutate({ id: priceId });
      
      if (result.success) {
        await loadItemPrices(menuItem.id);
      }
    } catch (err: any) {
      console.error("Failed to delete price:", err);
      error = err.message || "Failed to delete price";
    }
  }

  // Track previous state to prevent infinite loops
  let prevIsOpen = $state(false);
  let prevMenuItemId = $state<string | null>(null);

  $effect(() => {
    // Only run when modal is newly opened or menu item changes
    if (isOpen && menuItem && (isOpen !== prevIsOpen || menuItem.id !== prevMenuItemId)) {
      prevIsOpen = isOpen;
      prevMenuItemId = menuItem.id;
      
      name = menuItem.name || "";
      type = menuItem.type || ["RAW_MATERIAL"];
      unit = menuItem.unit || "gramme";
      inHouseStockQuantity = menuItem.inHouseStockQuantity ?? null;
      inShopStockQuantity = menuItem.inShopStockQuantity ?? null;
      stockConversionRatio = menuItem.stockConversionRatio ?? 1;
      
      // Load item prices
      if (menuItem.id) {
        loadItemPrices(menuItem.id);
      }
    } else if (!isOpen) {
      prevIsOpen = false;
      prevMenuItemId = null;
    }
  });

  function resetForm() {
    name = "";
    type = ["RAW_MATERIAL"];
    unit = "gramme";
    inHouseStockQuantity = null;
    inShopStockQuantity = null;
    stockConversionRatio = 1;
    error = "";
    latestBuyingPrice = null;
    allBuyingPrices = [];
    showAllPrices = false;
    newBuyingPrice = null;
    newBuyingDescription = "";
    newBuyingUnitValue = null;
    newBuyingMultiplier = 1;
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!name.trim()) {
      error = "Item name is required";
      return;
    }

    if (!menuItem?.id) {
      error = "Menu item ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.updateMenuItem.mutate({
        id: menuItem.id,
        name,
        type,
        unit,
        inHouseStockQuantity: inHouseStockQuantity ?? undefined,
        inShopStockQuantity: inShopStockQuantity ?? undefined,
        stockConversionRatio: stockConversionRatio ?? undefined,
      });

      if (result.success) {
        onMenuItemUpdated();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to update raw material";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) handleClose();
  }}
>
  <DialogContent class="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Update Raw Material</DialogTitle>
      <DialogDescription>Edit the raw material details</DialogDescription>
    </DialogHeader>

    <div class="space-y-4 px-6 py-4">
      {#if error}
        <div
          class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </div>
      {/if}

      <Input
        label="Item Name *"
        type="text"
        bind:value={name}
        placeholder="e.g., Flour, Sugar, etc."
        required
      />

      <div>
        <span class="block text-sm font-medium text-gray-700 mb-2">
          Item Types *
        </span>
        <div class="space-y-2">
          {#each typeEnum.enumValues as itemType}
            <label class="flex items-center">
              <input
                type="checkbox"
                checked={type.includes(itemType)}
                onchange={(e) => {
                  if (e.currentTarget.checked) {
                    type = [...type, itemType];
                  } else {
                    type = type.filter(t => t !== itemType);
                  }
                }}
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">{itemType}</span>
            </label>
          {/each}
        </div>
      </div>

      <div>
        <label for="unit" class="block text-sm font-medium text-gray-700 mb-2">
          Unit of Measurement *
        </label>
        <select
          id="unit"
          bind:value={unit}
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700"
        >
          <option value="gramme">gramme</option>
          <option value="Kg">Kg</option>
          <option value="portion">portion</option>
          <option value="liter">liter</option>
          <option value="milliliter">milliliter</option>
        </select>
      </div>

      <!-- Price Information -->
      <div class="border-t border-gray-200 pt-4">
        <div class="flex items-center justify-between mb-3">
          <span class="block text-sm font-medium text-gray-700">
            Price Management
          </span>
          <button
            type="button"
            onclick={() => showAllPrices = !showAllPrices}
            class="text-xs text-indigo-600 hover:text-indigo-700"
          >
            {showAllPrices ? 'Show Summary' : 'Show All Prices'}
          </button>
        </div>

        {#if !showAllPrices}
          <!-- Latest Buying Price Summary -->
          <div>
            <span class="block text-xs font-medium text-gray-500 mb-1">
              Latest Buying Price
            </span>
            <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              {#if loadingPrices}
                <span class="text-gray-400">Loading...</span>
              {:else if latestBuyingPrice !== null}
                ${latestBuyingPrice.toFixed(2)}
              {:else}
                <span class="text-gray-400">Not set</span>
              {/if}
            </div>
          </div>
        {:else}
          <!-- All Buying Prices with Add/Delete -->
          <div>
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">Buying Prices</h4>
              
              <!-- Add New Buying Price -->
              <div class="bg-gray-50 p-3 rounded-lg mb-3">
                <div class="flex flex-col gap-2">
                  <input
                    type="number"
                    step="0.01"
                    bind:value={newBuyingPrice}
                    placeholder="Price Value"
                    class="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    bind:value={newBuyingUnitValue}
                    placeholder="Unit Value"
                    class="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    bind:value={newBuyingMultiplier}
                    placeholder="Multiplier (default 1)"
                    class="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    bind:value={newBuyingDescription}
                    placeholder="Description (optional)"
                    class="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onclick={handleAddBuyingPrice}
                    disabled={!newBuyingPrice || !newBuyingUnitValue || isAddingBuyingPrice}
                    class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isAddingBuyingPrice ? 'Adding...' : 'Add Price'}
                  </button>
                </div>
              </div>

              <!-- List of Buying Prices -->
              <div class="space-y-2">
                {#each allBuyingPrices as price}
                  <div class="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                    <div class="flex-1">
                      <span class="font-medium">${price.priceValue.toFixed(2)}</span>
                      <span class="text-gray-700 ml-2">
                        per {price.unitValue} {menuItem?.unit || 'unit'}
                        {#if price.multiplier && price.multiplier !== 1}
                          × {price.multiplier}
                        {/if}
                      </span>
                      {#if price.description}
                        <span class="text-xs text-gray-500 ml-2">- {price.description}</span>
                      {/if}
                      <span class="text-xs text-gray-400 ml-2">
                        {new Date(price.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onclick={() => handleDeletePrice(price.id)}
                      class="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                {/each}
                {#if allBuyingPrices.length === 0}
                  <p class="text-sm text-gray-400 text-center py-2">No buying prices set</p>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="border-t border-gray-200 pt-4">
        <span class="block text-sm font-medium text-gray-700 mb-3">
          Stock Information
        </span>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label for="inHouseStock" class="block text-sm font-medium text-gray-700 mb-2">
              In-House Stock Quantity
            </label>
            <input
              id="inHouseStock"
              type="number"
              step="0.01"
              bind:value={inHouseStockQuantity}
              placeholder="0"
              class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label for="inShopStock" class="block text-sm font-medium text-gray-700 mb-2">
              In-Shop Stock Quantity
            </label>
            <input
              id="inShopStock"
              type="number"
              step="0.01"
              bind:value={inShopStockQuantity}
              placeholder="0"
              class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label for="conversionRatio" class="block text-sm font-medium text-gray-700 mb-2">
            Stock Conversion Ratio
          </label>
          <input
            id="conversionRatio"
            type="number"
            step="0.01"
            bind:value={stockConversionRatio}
            placeholder="1"
            class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Conversion ratio for stock calculations (default: 1)
          </p>
        </div>
      </div>

      {#if menuItem}
        <div class="pt-4 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            Last updated: {new Date(menuItem.updatedAt).toLocaleString()}
          </p>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} loading={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Raw Material"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
