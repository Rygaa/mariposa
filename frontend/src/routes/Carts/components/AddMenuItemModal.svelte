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
  import Icon from "../../../lib/components/Icon.svelte";
  import { trpc } from "../../../lib/trpc";

  let {
    isOpen = $bindable(false),
    onClose,
    onAddMenuItem,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onAddMenuItem: (menuItemId: string, quantity: number, price: number) => void | Promise<void>;
  } = $props();

  let menuItems = $state<any[]>([]);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let selectedMenuItem = $state<any>(null);
  let quantity = $state(1);
  let isSubmitting = $state(false);
  let error = $state("");

  $effect(() => {
    if (isOpen) {
      loadMenuItems();
    }
  });

  async function loadMenuItems() {
    isLoading = true;
    try {
      const result = await trpc.listMenuItems.query({});
      if (result.success) {
        menuItems = result.menuItems || [];
      }
    } catch (err) {
      console.error("Error loading menu items:", err);
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    selectedMenuItem = null;
    quantity = 1;
    searchQuery = "";
    error = "";
    onClose();
  }

  function selectMenuItem(item: any) {
    selectedMenuItem = item;
  }

  async function handleAdd() {
    if (!selectedMenuItem) {
      error = "Please select a menu item";
      return;
    }

    if (quantity < 1) {
      error = "Quantity must be at least 1";
      return;
    }

    isSubmitting = true;
    error = "";

    try {
      // Get the current price from menu item
      const price = selectedMenuItem.currentPrice || selectedMenuItem.prices?.[0]?.price || 0;
      
      await onAddMenuItem(selectedMenuItem.id, quantity, price);
      handleClose();
    } catch (err: any) {
      error = err.message || "Failed to add menu item";
    } finally {
      isSubmitting = false;
    }
  }

  const filteredMenuItems = $derived(
    menuItems.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    })
  );

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function getMenuItemPrice(item: any): number {
    return item.currentPrice || item.prices?.[0]?.price || 0;
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) handleClose();
  }}
>
  <DialogContent class="max-w-3xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle>Add Menu Item</DialogTitle>
      <DialogDescription>Select a menu item to add to the order</DialogDescription>
    </DialogHeader>

    <div class="px-6 py-4 space-y-4">
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      {/if}

      <!-- Search -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon iconName="search" class="text-gray-400" />
        </div>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search menu items..."
          class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {#if isLoading}
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading menu items...</p>
        </div>
      {:else if filteredMenuItems.length === 0}
        <div class="text-center py-8">
          <Icon iconName="restaurant" class="text-gray-300 text-4xl mx-auto mb-2" />
          <p class="text-gray-500">
            {searchQuery ? "No menu items found" : "No menu items available"}
          </p>
        </div>
      {:else}
        <!-- Menu Items Grid -->
        <div class="max-h-96 overflow-y-auto space-y-2">
          {#each filteredMenuItems as item (item.id)}
            <button
              onclick={() => selectMenuItem(item)}
              class="w-full text-left p-3 rounded-lg border transition-all {selectedMenuItem?.id === item.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
            >
              <div class="flex items-center gap-3">
                {#if item.images && item.images.length > 0}
                  <img
                    src={item.images[0].url}
                    alt={item.name}
                    class="w-16 h-16 rounded-md object-cover"
                  />
                {:else}
                  <div class="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center">
                    <Icon iconName="restaurant" class="text-gray-400" />
                  </div>
                {/if}

                <div class="flex-1 min-w-0">
                  <h5 class="font-medium text-gray-900 truncate">{item.name}</h5>
                  {#if item.description}
                    <p class="text-sm text-gray-600 line-clamp-1">{item.description}</p>
                  {/if}
                  <p class="text-sm font-semibold text-indigo-600 mt-1">
                    {formatCurrency(getMenuItemPrice(item))}
                  </p>
                </div>

                {#if selectedMenuItem?.id === item.id}
                  <Icon iconName="check_circle" class="text-indigo-600" />
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}

      {#if selectedMenuItem}
        <!-- Quantity Selector -->
        <div class="border-t border-gray-200 pt-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900">Selected: {selectedMenuItem.name}</p>
              <p class="text-sm text-gray-600">
                {formatCurrency(getMenuItemPrice(selectedMenuItem))} each
              </p>
            </div>

            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-600">Quantity:</span>
              <div class="flex items-center gap-2">
                <button
                  onclick={() => quantity = Math.max(1, quantity - 1)}
                  disabled={isSubmitting || quantity <= 1}
                  class="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon iconName="remove" />
                </button>
                <input
                  type="number"
                  min="1"
                  bind:value={quantity}
                  disabled={isSubmitting}
                  class="w-16 px-2 py-1 text-center border border-gray-300 rounded-md"
                />
                <button
                  onclick={() => quantity++}
                  disabled={isSubmitting}
                  class="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                >
                  <Icon iconName="add" />
                </button>
              </div>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span class="text-sm text-gray-600">Subtotal:</span>
            <span class="text-lg font-bold text-gray-900">
              {formatCurrency(getMenuItemPrice(selectedMenuItem) * quantity)}
            </span>
          </div>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleAdd} disabled={!selectedMenuItem || isSubmitting}>
        {isSubmitting ? "Adding..." : "Add to Order"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
