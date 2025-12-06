<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "../../../lib/shadcn/Dialog/index";
  import {
    Dropdown,
    DropdownItem,
  } from "../../../lib/shadcn/Dropdown";
  import Button from "../../../lib/components/Button.svelte";
  import { trpc } from "../../../lib/trpc";

  let {
    isOpen = $bindable(false),
    menuItems = [],
    onClose,
    onStockUpdated,
  }: {
    isOpen: boolean;
    menuItems?: any[];
    onClose: () => void;
    onStockUpdated: () => void | Promise<void>;
  } = $props();

  let selectedMenuItem = $state<any>(null);
  let isUpdating = $state(false);
  let error = $state("");
  let transferQuantity = $state<number | null>(null);
  let searchQuery = $state("");
  let dropdownOpen = $state(false);
  let transferDirection = $state<"toShop" | "toHouse">("toShop");

  // Track previous state to prevent infinite loops
  let prevIsOpen = $state(false);

  $effect(() => {
    if (isOpen && !prevIsOpen) {
      prevIsOpen = true;
    } else if (!isOpen) {
      prevIsOpen = false;
      selectedMenuItem = null;
      transferQuantity = null;
      searchQuery = "";
      dropdownOpen = false;
      transferDirection = "toShop";
      error = "";
    }
  });

  async function handleTransfer() {
    if (!selectedMenuItem?.id || !transferQuantity || transferQuantity <= 0) {
      error = "Please select a material and enter a valid quantity";
      return;
    }
    
    isUpdating = true;
    error = "";
    
    try {
      const fromStock = transferDirection === "toShop" 
        ? (selectedMenuItem.inHouseStockQuantity || 0)
        : (selectedMenuItem.inShopStockQuantity || 0);
      
      if (fromStock < transferQuantity) {
        error = `Not enough stock. Available: ${fromStock} ${selectedMenuItem.unit || 'units'}`;
        isUpdating = false;
        return;
      }

      const newInHouseStock = transferDirection === "toShop"
        ? (selectedMenuItem.inHouseStockQuantity || 0) - transferQuantity
        : (selectedMenuItem.inHouseStockQuantity || 0) + transferQuantity;
        
      const newInShopStock = transferDirection === "toShop"
        ? (selectedMenuItem.inShopStockQuantity || 0) + transferQuantity
        : (selectedMenuItem.inShopStockQuantity || 0) - transferQuantity;

      const result = await trpc.updateMenuItem.mutate({
        id: selectedMenuItem.id,
        inHouseStockQuantity: newInHouseStock,
        inShopStockQuantity: newInShopStock,
      });

      if (result.success) {
        await onStockUpdated();
        // Update local state
        selectedMenuItem = {
          ...selectedMenuItem,
          inHouseStockQuantity: newInHouseStock,
          inShopStockQuantity: newInShopStock,
        };
        // Reset inputs
        transferQuantity = null;
        error = "";
      }
    } catch (err: any) {
      console.error("Failed to transfer stock:", err);
      error = err.message || "Failed to transfer stock";
    } finally {
      isUpdating = false;
    }
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) onClose();
  }}
>
  <DialogContent class="max-w-md overflow-visible">
    <DialogHeader>
      <DialogTitle>Transfer Stock</DialogTitle>
      <DialogDescription>
        Transfer stock between In-House and In-Shop
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-4 px-6 py-4">
      {#if menuItems && menuItems.length > 0}
        <div class="relative">
          <label for="material-search" class="block text-sm font-medium text-gray-700 mb-2">
            Select Material *
          </label>
          <Dropdown bind:open={dropdownOpen} align="start" class="w-full">
            {#snippet trigger()}
              <input
                id="material-search"
                type="text"
                bind:value={searchQuery}
                onfocus={() => dropdownOpen = true}
                placeholder="Search for a material..."
                class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700"
              />
            {/snippet}
            {#snippet children()}
              <div class="max-h-60 overflow-y-auto">
                {#each menuItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) as item}
                  <DropdownItem
                    onclick={() => {
                      selectedMenuItem = item;
                      searchQuery = item.name;
                      dropdownOpen = false;
                    }}
                  >
                    <div class="flex flex-col">
                      <div class="font-medium text-start">{item.name}</div>
                      <div class="text-xs text-gray-500">
                        In-House: {item.inHouseStockQuantity || 0} | In-Shop: {item.inShopStockQuantity || 0} {item.unit || 'units'}
                      </div>
                    </div>
                  </DropdownItem>
                {:else}
                  <div class="px-2 py-1.5 text-sm text-gray-500">No materials found</div>
                {/each}
              </div>
            {/snippet}
          </Dropdown>

          {#if selectedMenuItem}
            <div class="mt-3 space-y-2">
              <div>
                <div class="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Direction *
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    onclick={() => transferDirection = "toShop"}
                    class="flex-1 px-4 py-2 text-sm rounded-lg transition-colors {transferDirection === 'toShop' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                  >
                    In-House → In-Shop
                  </button>
                  <button
                    type="button"
                    onclick={() => transferDirection = "toHouse"}
                    class="flex-1 px-4 py-2 text-sm rounded-lg transition-colors {transferDirection === 'toHouse' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                  >
                    In-Shop → In-House
                  </button>
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg text-sm">
                <p class="text-gray-700">
                  <span class="font-medium">In-House Stock:</span> {selectedMenuItem.inHouseStockQuantity || 0} {selectedMenuItem.unit || 'units'}
                </p>
                <p class="text-gray-700 mt-1">
                  <span class="font-medium">In-Shop Stock:</span> {selectedMenuItem.inShopStockQuantity || 0} {selectedMenuItem.unit || 'units'}
                </p>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      {#if !selectedMenuItem}
        <div class="text-center py-8 text-gray-500">
          Please select a material to transfer
        </div>
      {:else}
        {#if error}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        {/if}

        <div>
          <label for="transfer-quantity" class="block text-sm font-medium text-gray-700 mb-2">
            Quantity to Transfer *
          </label>
          <input
            id="transfer-quantity"
            type="number"
            step="0.01"
            bind:value={transferQuantity}
            placeholder={`Enter quantity (${selectedMenuItem?.unit || 'units'})`}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <button
          type="button"
          onclick={handleTransfer}
          disabled={!transferQuantity || transferQuantity <= 0 || isUpdating}
          class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isUpdating ? "Transferring..." : "Transfer Stock"}
        </button>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={onClose} disabled={isUpdating}>
        Cancel
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
