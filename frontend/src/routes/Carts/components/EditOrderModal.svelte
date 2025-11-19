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
    order,
    onClose,
    onOrderUpdated,
  }: {
    isOpen: boolean;
    order: any;
    onClose: () => void;
    onOrderUpdated: () => void | Promise<void>;
  } = $props();

  let orderDetails = $state<any>(null);
  let isLoading = $state(false);
  let isSubmitting = $state(false);
  let error = $state("");
  let isAddMenuItemModalOpen = $state(false);

  // Track menu item order changes
  let menuItemChanges = $state<
    Map<string, { quantity: number; price: number; toDelete: boolean }>
  >(new Map());

  $effect(() => {
    if (isOpen && order) {
      loadOrderDetails();
    }
  });

  async function loadOrderDetails() {
    isLoading = true;
    menuItemChanges.clear();
    try {
      const result = await trpc.getOrderByIdWithRelations.query({
        id: order.id,
      });
      if (result.success) {
        orderDetails = result.order;
        // Initialize changes map
        if (orderDetails.menuItemOrders) {
          orderDetails.menuItemOrders.forEach((mio: any) => {
            menuItemChanges.set(mio.id, {
              quantity: mio.quantity,
              price: mio.price,
              toDelete: false,
            });
          });
        }
      }
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    menuItemChanges.clear();
    error = "";
    onClose();
  }

  function updateQuantity(menuItemOrderId: string, newQuantity: number) {
    const current = menuItemChanges.get(menuItemOrderId);
    if (current && newQuantity > 0) {
      menuItemChanges.set(menuItemOrderId, {
        ...current,
        quantity: newQuantity,
      });
    }
  }

  function markForDeletion(menuItemOrderId: string) {
    const current = menuItemChanges.get(menuItemOrderId);
    if (current) {
      menuItemChanges.set(menuItemOrderId, {
        ...current,
        toDelete: true,
      });
    }
  }

  function undoDelete(menuItemOrderId: string) {
    const current = menuItemChanges.get(menuItemOrderId);
    if (current) {
      menuItemChanges.set(menuItemOrderId, {
        ...current,
        toDelete: false,
      });
    }
  }

  async function handleAddMenuItem(
    menuItemId: string,
    quantity: number,
    price: number
  ) {
    try {
      // Add menu item to order
      const result = await trpc.createMenuItemOrder.mutate({
        orderId: order.id,
        menuItemId,
        quantity,
        price,
      });

      if (result.success) {
        await loadOrderDetails();
      }
    } catch (err: any) {
      error = err.message || "Failed to add menu item";
    }
  }

  async function handleSubmit() {
    error = "";
    isSubmitting = true;

    try {
      // Process all changes
      const promises: Promise<any>[] = [];

      menuItemChanges.forEach((change, menuItemOrderId) => {
        const original = orderDetails.menuItemOrders.find(
          (mio: any) => mio.id === menuItemOrderId
        );

        if (!original) return;

        if (change.toDelete) {
          // Delete menu item order
          promises.push(
            trpc.deleteMenuItemOrder.mutate({
              id: menuItemOrderId,
            })
          );
        } else if (change.quantity !== original.quantity) {
          // Update quantity
          promises.push(
            trpc.updateMenuItemOrder.mutate({
              id: menuItemOrderId,
              quantity: change.quantity,
            })
          );
        }
      });

      await Promise.all(promises);
      await onOrderUpdated();
      handleClose();
    } catch (err: any) {
      error = err.message || "Failed to update order";
    } finally {
      isSubmitting = false;
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function calculateTotal(): number {
    if (!orderDetails?.menuItemOrders) return 0;

    return orderDetails.menuItemOrders.reduce((sum: number, mio: any) => {
      const change = menuItemChanges.get(mio.id);
      if (change?.toDelete) return sum;
      const quantity = change?.quantity ?? mio.quantity;
      const price = change?.price ?? mio.price;
      return sum + quantity * price;
    }, 0);
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) handleClose();
  }}
>
  <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Order</DialogTitle>
      <DialogDescription>
        Add, remove, or update menu items in this order
      </DialogDescription>
    </DialogHeader>

    <div class="px-6 py-4 space-y-4">
      {#if error}
        <div
          class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </div>
      {/if}

      {#if isLoading}
        <div class="text-center py-8">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"
          ></div>
          <p class="mt-2 text-gray-600">Loading order details...</p>
        </div>
      {:else if orderDetails}
        <div class="space-y-4">
          <!-- Order Info -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">
                  Order #{orderDetails.id.slice(0, 8)}
                </h3>
                <p class="text-sm text-gray-600 mt-1">
                  Table: {orderDetails.eatingTable?.name ||
                    orderDetails.eatingTableId?.slice(0, 8) ||
                    "N/A"}
                </p>
              </div>
              <Button
                size="sm"
                onclick={() => {
                  isAddMenuItemModalOpen = true;
                }}
              >
                <Icon iconName="add" class="mr-1" />
                Add Item
              </Button>
            </div>
          </div>

          <!-- Menu Items List -->
          <div class="space-y-3">
            <h4 class="font-semibold text-gray-900">Menu Items</h4>

            {#if orderDetails.menuItemOrders && orderDetails.menuItemOrders.length > 0}
              {#each orderDetails.menuItemOrders as menuItemOrder (menuItemOrder.id)}
                {@const change = menuItemChanges.get(menuItemOrder.id)}
                {@const isDeleted = change?.toDelete ?? false}

                <div
                  class="bg-white border border-gray-200 rounded-lg p-4 {isDeleted
                    ? 'opacity-50'
                    : ''}"
                >
                  <div class="flex items-start gap-4">
                    {#if menuItemOrder.menuItem?.images && menuItemOrder.menuItem.images.length > 0}
                      <img
                        src={menuItemOrder.menuItem.images[0].url}
                        alt={menuItemOrder.menuItem.name}
                        class="w-20 h-20 rounded-md object-cover"
                      />
                    {:else}
                      <div
                        class="w-20 h-20 rounded-md bg-gray-100 flex items-center justify-center"
                      >
                        <Icon iconName="restaurant" class="text-gray-400" />
                      </div>
                    {/if}

                    <div class="flex-1 min-w-0">
                      <h5
                        class="font-medium text-gray-900 {isDeleted
                          ? 'line-through'
                          : ''}"
                      >
                        {menuItemOrder.menuItem?.name || "Unknown Item"}
                      </h5>
                      <p class="text-sm text-gray-600 mt-1">
                        {formatCurrency(change?.price ?? menuItemOrder.price)} each
                      </p>

                      {#if !isDeleted}
                        <div class="mt-3 flex items-center gap-3">
                          <span class="text-sm text-gray-600">Quantity:</span>
                          <div class="flex items-center gap-2">
                            <button
                              onclick={() =>
                                updateQuantity(
                                  menuItemOrder.id,
                                  (change?.quantity ?? menuItemOrder.quantity) -
                                    1
                                )}
                              disabled={isSubmitting ||
                                (change?.quantity ?? menuItemOrder.quantity) <=
                                  1}
                              class="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Icon iconName="remove" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={change?.quantity ?? menuItemOrder.quantity}
                              oninput={(e) => {
                                const val = parseInt(e.currentTarget.value);
                                if (val > 0)
                                  updateQuantity(menuItemOrder.id, val);
                              }}
                              disabled={isSubmitting}
                              class="w-16 px-2 py-1 text-center border border-gray-300 rounded-md"
                            />
                            <button
                              onclick={() =>
                                updateQuantity(
                                  menuItemOrder.id,
                                  (change?.quantity ?? menuItemOrder.quantity) +
                                    1
                                )}
                              disabled={isSubmitting}
                              class="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Icon iconName="add" />
                            </button>
                          </div>
                        </div>
                      {/if}
                    </div>

                    <div class="text-right flex flex-col items-end gap-2">
                      <div class="font-bold text-gray-900">
                        {formatCurrency(
                          (change?.price ?? menuItemOrder.price) *
                            (change?.quantity ?? menuItemOrder.quantity)
                        )}
                      </div>

                      {#if isDeleted}
                        <Button
                          size="sm"
                          variant="outline"
                          onclick={() => undoDelete(menuItemOrder.id)}
                        >
                          <Icon iconName="undo" class="mr-1" />
                          Undo
                        </Button>
                      {:else}
                        <Button
                          size="sm"
                          variant="outline"
                          onclick={() => markForDeletion(menuItemOrder.id)}
                          disabled={isSubmitting}
                        >
                          <Icon iconName="delete" class="mr-1" />
                          Remove
                        </Button>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            {:else}
              <div class="text-center py-8 bg-gray-50 rounded-lg">
                <Icon
                  iconName="shopping_cart"
                  class="text-gray-300 text-4xl mx-auto mb-2"
                />
                <p class="text-gray-500 mb-3">No items in this order</p>
                <Button
                  size="sm"
                  onclick={() => {
                    isAddMenuItemModalOpen = true;
                  }}
                >
                  <Icon iconName="add" class="mr-1" />
                  Add First Item
                </Button>
              </div>
            {/if}
          </div>

          <!-- Total -->
          <div class="pt-4 border-t-2 border-gray-200">
            <div class="flex justify-between items-center">
              <span class="text-lg font-semibold text-gray-900">Total:</span>
              <span class="text-2xl font-bold text-indigo-600">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} disabled={isSubmitting || isLoading}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- TODO: Add AddMenuItemModal
{#if isAddMenuItemModalOpen}
  <AddMenuItemModal
    bind:isOpen={isAddMenuItemModalOpen}
    onClose={() => { isAddMenuItemModalOpen = false; }}
    onAddMenuItem={handleAddMenuItem}
  />
{/if}
-->
