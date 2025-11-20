<script lang="ts">
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import ClickableDiv from "../../../lib/shadcn/ClickableDiv.svelte";
  import {
    Dropdown,
    DropdownItem,
    DropdownSeparator,
  } from "../../../lib/shadcn/Dropdown";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../../lib/shadcn/Card/index";
  import AddMenuItemToOrderModal from "./AddMenuItemToOrderModal.svelte";
  import { trpc } from "../../../lib/trpc";

  let {
    order,
    onOrderUpdated,
    onMarkAsPaid,
  }: {
    order: any;
    onOrderUpdated?: () => void | Promise<void>;
    onMarkAsPaid?: () => void | Promise<void>;
  } = $props();

  let isDropdownOpen = $state(false);
  let isLocked = $state(true);
  let isViewDetailsModalOpen = $state(false);
  let isAddMenuItemModalOpen = $state(false);
  let isSubmitting = $state(false);
  let error = $state("");

  // Track menu item order changes
  let menuItemChanges = $state<
    Map<string, { quantity: number; price: number; toDelete: boolean }>
  >(new Map());

  function toggleLock() {
    if (!isLocked) {
      // Locking - clear any unsaved changes
      menuItemChanges.clear();
      error = "";
    } else {
      // Unlocking - initialize changes map
      menuItemChanges.clear();
      if (order.menuItemOrders) {
        order.menuItemOrders.forEach((mio: any) => {
          menuItemChanges.set(mio.id, {
            quantity: mio.quantity,
            price: mio.price,
            toDelete: false,
          });
        });
      }
    }
    isLocked = !isLocked;
  }

  function handleCancelEdit() {
    menuItemChanges.clear();
    error = "";
    isLocked = true;
  }

  function handleViewDetails() {
    isViewDetailsModalOpen = true;
  }

  async function handleMarkAsPaid() {
    if (onMarkAsPaid) {
      await onMarkAsPaid();
    }
  }

  function updateQuantity(menuItemOrderId: string, newQuantity: number) {
    const current = menuItemChanges.get(menuItemOrderId);
    if (current && newQuantity > 0) {
      menuItemChanges.set(menuItemOrderId, {
        ...current,
        quantity: newQuantity,
      });
      // Force reactivity in Svelte 5
      menuItemChanges = new Map(menuItemChanges);
    }
  }

  function markForDeletion(menuItemOrderId: string) {
    const current = menuItemChanges.get(menuItemOrderId);
    if (current) {
      menuItemChanges.set(menuItemOrderId, {
        ...current,
        toDelete: true,
      });
      // Force reactivity in Svelte 5
      menuItemChanges = new Map(menuItemChanges);
    }
  }

  function undoDelete(menuItemOrderId: string) {
    const current = menuItemChanges.get(menuItemOrderId);
    if (current) {
      menuItemChanges.set(menuItemOrderId, {
        ...current,
        toDelete: false,
      });
      // Force reactivity in Svelte 5
      menuItemChanges = new Map(menuItemChanges);
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

      if (result.success && onOrderUpdated) {
        await onOrderUpdated();
      }
    } catch (err: any) {
      error = err.message || "Failed to add menu item";
    }
  }

  async function handleSaveEdit() {
    error = "";
    isSubmitting = true;

    try {
      // Process all changes
      const promises: Promise<any>[] = [];

      menuItemChanges.forEach((change, menuItemOrderId) => {
        const original = order.menuItemOrders.find(
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

      if (onOrderUpdated) {
        await onOrderUpdated();
      }

      isLocked = true;
      menuItemChanges.clear();
    } catch (err: any) {
      error = err.message || "Failed to update order";
    } finally {
      isSubmitting = false;
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      INITIALIZED: "bg-blue-100 text-blue-700",
      CONFIRMED: "bg-green-100 text-green-700",
      WAITING_TO_BE_PRINTED: "bg-yellow-100 text-yellow-700",
      PRINTED: "bg-purple-100 text-purple-700",
      SERVED: "bg-indigo-100 text-indigo-700",
      PAID: "bg-emerald-100 text-emerald-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  }

  function formatStatus(status: string) {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  function formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function calculateTotal(order: any): number {
    if (!order.menuItemOrders || order.menuItemOrders.length === 0) {
      return 0;
    }
    return order.menuItemOrders.reduce(
      (sum: number, mio: any) => sum + mio.price * mio.quantity,
      0
    );
  }

  function calculateEditTotal(): number {
    if (!order.menuItemOrders) return 0;

    return order.menuItemOrders.reduce((sum: number, mio: any) => {
      const change = menuItemChanges.get(mio.id);
      if (change?.toDelete) return sum;
      const quantity = change?.quantity ?? mio.quantity;
      const price = change?.price ?? mio.price;
      return sum + quantity * price;
    }, 0);
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
</script>

<Card useAvailableHeight={false} class="m-4">
  <CardHeader>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
        <span
          class="px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(
            order.status
          )}"
        >
          {formatStatus(order.status)}
        </span>
        {#if !isLocked}
          <span
            class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
          >
            Unlocked
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        {#if isLocked}
          <Button size="sm" onclick={toggleLock} variant="outline" iconName="lock">
            Unlock
          </Button>
        {:else}
          <Button size="sm" onclick={toggleLock} variant="outline" iconName="lock_open">
            Lock
          </Button>
        {/if}
      </div>
    </div>
  </CardHeader>

  <CardContent class="p-4 flex flex-col">
    {#if error}
      <div
        class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
      >
        {error}
      </div>
    {/if}
    <div class="space-y-2 text-sm mb-4">
      <div class="flex items-center gap-2">
        <Icon iconName="schedule" class="text-gray-400 text-sm" />
        <span class="text-gray-600">Created:</span>
        <span class="font-medium text-gray-900">
          {formatDate(order.createdAt)}
        </span>
      </div>
    </div>

    <!-- Add Item Button -->
    <div class="mb-4">
      <Button
        size="sm"
        onclick={() => {
          isAddMenuItemModalOpen = true;
        }}
        disabled={isLocked}
        iconName="add"
      >
        Add Item
      </Button>
    </div>

    <!-- Menu Items List -->
    <div class="space-y-3 mb-4">
      {#if order.menuItemOrders && order.menuItemOrders.length > 0}
        {#each order.menuItemOrders as menuItemOrder (menuItemOrder.id)}
          {@const change = menuItemChanges.get(menuItemOrder.id)}
          {@const isDeleted = change?.toDelete ?? false}

          <div
            class="bg-gray-50 border border-gray-200 rounded-lg p-3 {isDeleted
              ? 'opacity-50'
              : ''}"
          >
            <div class="flex items-start gap-3">
              {#if menuItemOrder.menuItem?.images && menuItemOrder.menuItem.images.length > 0}
                <img
                  src={menuItemOrder.menuItem.images[0].url}
                  alt={menuItemOrder.menuItem.name}
                  class="w-12 h-12 rounded-md object-cover"
                />
              {:else}
                <div
                  class="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center"
                >
                  <Icon iconName="restaurant" class="text-gray-400 text-sm" />
                </div>
              {/if}

              <div class="flex-1 min-w-0">
                <h5
                  class="font-medium text-gray-900 text-sm {isDeleted
                    ? 'line-through'
                    : ''}"
                >
                  {menuItemOrder.menuItem?.name || "Unknown Item"}
                </h5>
                
                <p class="text-sm text-gray-600 mt-1">
                  {formatCurrency(change?.price ?? menuItemOrder.price)} each
                </p>

                {#if !isDeleted}
                  <div class="mt-2 flex items-center gap-2">
                    <button
                      onclick={() =>
                        updateQuantity(
                          menuItemOrder.id,
                          (change?.quantity ?? menuItemOrder.quantity) - 1
                        )}
                      disabled={isLocked || isSubmitting ||
                        (change?.quantity ?? menuItemOrder.quantity) <= 1}
                      class="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon iconName="remove" class="text-sm" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={change?.quantity ?? menuItemOrder.quantity}
                      oninput={(e) => {
                        const val = parseInt(e.currentTarget.value);
                        if (val > 0) updateQuantity(menuItemOrder.id, val);
                      }}
                      disabled={isLocked || isSubmitting}
                      class="w-14 px-2 py-1 text-center border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      onclick={() =>
                        updateQuantity(
                          menuItemOrder.id,
                          (change?.quantity ?? menuItemOrder.quantity) + 1
                        )}
                      disabled={isLocked || isSubmitting}
                      class="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon iconName="add" class="text-sm" />
                    </button>
                    <span class="text-sm text-gray-600 ml-2">
                      = {formatCurrency(
                        (change?.price ?? menuItemOrder.price) *
                          (change?.quantity ?? menuItemOrder.quantity)
                      )}
                    </span>
                  </div>
                {/if}
              </div>

              <div class="text-right">
                <div class="flex flex-col gap-1">
                  <div class="font-semibold text-gray-900 text-sm mb-2">
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
                      disabled={isLocked || isSubmitting}
                      iconName="undo"
                    >
                      Undo
                    </Button>
                  {:else}
                    <Button
                      size="sm"
                      variant="outline"
                      onclick={() => markForDeletion(menuItemOrder.id)}
                      disabled={isLocked || isSubmitting}
                      iconName="delete"
                    />
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center py-4 bg-gray-50 rounded-lg">
          <p class="text-gray-500">No items in this order</p>
        </div>
      {/if}
    </div>

    <!-- Total -->
    <div class="pt-3 border-t border-gray-200 mb-4">
      <div class="flex justify-between items-center">
        <span class="font-semibold text-gray-900">Order Total:</span>
        <span class="font-bold text-lg text-indigo-600">
          {formatCurrency(calculateEditTotal())}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onclick={handleCancelEdit}
        disabled={isLocked || isSubmitting}
      >
        Cancel
      </Button>
      <Button size="sm" onclick={handleSaveEdit} disabled={isLocked || isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
      <Button size="sm" onclick={handleMarkAsPaid} disabled={isSubmitting} iconName="check_circle">
        Mark as Paid
      </Button>
    </div>
  </CardContent>
</Card>

{#if isAddMenuItemModalOpen}
  <AddMenuItemToOrderModal
    bind:isOpen={isAddMenuItemModalOpen}
    orderId={order.id}
    onClose={() => {
      isAddMenuItemModalOpen = false;
    }}
    onItemAdded={async () => {
      if (onOrderUpdated) {
        await onOrderUpdated();
      }
    }}
  />
{/if}
