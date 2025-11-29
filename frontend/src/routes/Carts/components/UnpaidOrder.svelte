<script lang="ts">
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../../lib/shadcn/Card/index";
  import AddMenuItemToOrderModal from "./AddMenuItemToOrderModal.svelte";
  import { trpc } from "../../../lib/trpc";
  import { downloadOrderPDF } from "../../../utils/printOrder";

  let {
    order,
    onOrderUpdated,
    onMarkAsPaid,
    onPrintOrder,
  }: {
    order: any;
    onOrderUpdated?: () => Promise<boolean>;
    onMarkAsPaid?: () => void | Promise<void>;
    onPrintOrder?: () => void | Promise<void>;
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

  // Group menu items with their supplements and options (no merging)
  const groupedMenuItemOrders = $derived(() => {
    if (!order.menuItemOrders) return [];
    
    // Sort by creation date first
    const sorted = [...order.menuItemOrders].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });
    
    // Filter out items that have a parent (supplements and options)
    const mainItems = sorted.filter((mio: any) => !mio.parentMenuItemOrderId);
    
    // For each main item, find its children (supplements and options)
    const grouped = mainItems.map((mainItem: any) => {
      const children = sorted.filter(
        (mio: any) => mio.parentMenuItemOrderId === mainItem.id
      );
      
      // Separate supplements and options
      const supplements = children.filter((child: any) =>
        child.menuItem?.type?.includes("SUPPLEMENT")
      );
      const options = children.filter((child: any) =>
        child.menuItem?.type?.includes("MENU_ITEM_OPTION")
      );
      
      return {
        ...mainItem,
        supplements,
        options,
      };
    });
    
    return grouped;
  });
  
  const sortedMenuItemOrders = $derived(groupedMenuItemOrders());

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
    // Revert all changes by re-initializing from original order data
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
    // Force reactivity
    menuItemChanges = new Map(menuItemChanges);
    error = "";
    isLocked = true;
  }

  

  async function handleMarkAsPaid() {
    if (onMarkAsPaid) {
      await onMarkAsPaid();
    }
  }

  async function handlePrintOrder() {
    if (onPrintOrder) {
      await onPrintOrder();
    }
  }

  async function handlePrintOrderV2() {
    try {
      await downloadOrderPDF(order);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      error = "Failed to download PDF";
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
          <Button
            size="sm"
            onclick={toggleLock}
            variant="outline"
            iconName="lock"
          >
            Unlock
          </Button>
        {:else}
          <Button
            size="sm"
            onclick={handleCancelEdit}
            variant="outline"
            iconName="close"
          >
            Cancel
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

    <!-- Action Buttons -->
    <div class="flex gap-2 mb-4 flex-wrap">
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
      <Button
        size="sm"
        onclick={handleSaveEdit}
        disabled={isLocked || isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
      <Button
        size="sm"
        onclick={handlePrintOrder}
        disabled={isSubmitting}
        iconName="print"
        variant="secondary"
      >
        Print Order
      </Button>
      <Button
        size="sm"
        onclick={handlePrintOrderV2}
        disabled={isSubmitting}
        iconName="download"
        variant="secondary"
      >
        Print Order (v2)
      </Button>
      <Button
        size="sm"
        onclick={handleMarkAsPaid}
        disabled={isSubmitting}
        iconName="check_circle"
      >
        Mark as Paid
      </Button>
    </div>

    <!-- Menu Items List -->
    <div class="space-y-2 mb-4">
      {#if sortedMenuItemOrders && sortedMenuItemOrders.length > 0}
        {#each sortedMenuItemOrders as menuItemOrder (menuItemOrder.ids ? menuItemOrder.ids.join('-') : menuItemOrder.id)}
          {@const itemIds = menuItemOrder.ids || [menuItemOrder.id]}
          {@const change = menuItemChanges.get(itemIds[0])}
          {@const isDeleted = change?.toDelete ?? false}
          {@const displayQuantity = menuItemOrder.ids ? menuItemOrder.quantity : (change?.quantity ?? menuItemOrder.quantity)}
          {@const mainItemTotal = (change?.price ?? menuItemOrder.price) * displayQuantity}
          {@const supplementsTotal = (menuItemOrder.supplements || []).reduce((sum: number, supp: any) => {
            const suppChange = menuItemChanges.get(supp.id);
            if (suppChange?.toDelete) return sum;
            const suppQty = suppChange?.quantity ?? supp.quantity;
            return sum + (supp.price * suppQty);
          }, 0)}

          <div
            class="flex items-center gap-3 py-2 px-3 border-b border-gray-200 {isDeleted
              ? 'opacity-50'
              : ''}"
          >
            <div class="flex-1 min-w-0">
              <div>
                <span
                  class="font-medium text-gray-900 text-sm {isDeleted
                    ? 'line-through'
                    : ''}"
                >
                  {menuItemOrder.menuItem?.name || "Unknown Item"}
                  {#if menuItemOrder.menuItem?.subName}
                    <span class="font-normal">({menuItemOrder.menuItem.subName})</span>
                  {/if}
                </span>
                <span class="text-xs text-gray-500 ml-2">
                  {formatCurrency(change?.price ?? menuItemOrder.price)}
                </span>
              </div>
              {#if menuItemOrder.options && menuItemOrder.options.length > 0}
                <div class="mt-1 ml-4 text-xs text-gray-500">
                  {#each menuItemOrder.options as option}
                    <div class="italic underline">
                      {option.menuItem?.name || "Unknown"}
                      {#if option.menuItem?.subName}
                        ({option.menuItem.subName})
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
              {#if menuItemOrder.supplements && menuItemOrder.supplements.length > 0}
                <div class="mt-1 ml-4 text-xs text-gray-500">
                  {#each menuItemOrder.supplements as supplement}
                    {@const suppChange = menuItemChanges.get(supplement.id)}
                    {@const suppQuantity = suppChange?.quantity ?? supplement.quantity}
                    <div class="{suppChange?.toDelete ? 'line-through opacity-50' : ''}">
                      + {supplement.menuItem?.name || "Unknown"}
                      {#if supplement.menuItem?.subName}
                        ({supplement.menuItem.subName})
                      {/if}
                      × {suppQuantity}
                      <span class="ml-1">({formatCurrency(supplement.price)})</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            {#if !isDeleted && !menuItemOrder.ids}
              <div class="flex items-center gap-1">
                <Button
                  variant="outline"
                  iconOnly={true}
                  iconName="minus"
                  size="sm"
                  onclick={() =>
                    updateQuantity(
                      menuItemOrder.id,
                      (change?.quantity ?? menuItemOrder.quantity) - 1
                    )}
                  disabled={isLocked ||
                    isSubmitting ||
                    (change?.quantity ?? menuItemOrder.quantity) <= 1}
                />
                <input
                  type="number"
                  min="1"
                  value={change?.quantity ?? menuItemOrder.quantity}
                  oninput={(e) => {
                    const val = parseInt(e.currentTarget.value);
                    if (val > 0) updateQuantity(menuItemOrder.id, val);
                  }}
                  disabled={isLocked || isSubmitting}
                  class="w-12 px-1 py-1 text-center text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <Button
                  variant="outline"
                  iconOnly={true}
                  iconName="add"
                  size="sm"
                  onclick={() =>
                    updateQuantity(
                      menuItemOrder.id,
                      (change?.quantity ?? menuItemOrder.quantity) + 1
                    )}
                  disabled={isLocked || isSubmitting}
                />
              </div>
            {:else if menuItemOrder.ids}
              <div class="text-sm text-gray-600">
                × {displayQuantity}
              </div>
            {/if}

            <div class="text-right min-w-[80px]">
              <div class="font-semibold text-gray-900 text-sm">
                {formatCurrency(mainItemTotal + supplementsTotal)}
              </div>
            </div>

            {#if !menuItemOrder.ids}
              <div>
                {#if isDeleted}
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={() => undoDelete(menuItemOrder.id)}
                    disabled={isLocked || isSubmitting}
                    iconOnly={true}
                    iconName="undo"
                  />
                {:else}
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={() => markForDeletion(menuItemOrder.id)}
                    disabled={isLocked || isSubmitting}
                    iconOnly={true}
                    iconName="delete"
                  />
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {:else}
        <div class="text-center py-4 bg-gray-50 rounded-lg">
          <p class="text-gray-500">No items in this order</p>
        </div>
      {/if}
    </div>

    <!-- Total -->
    <div class="pt-3 border-t border-gray-200">
      <div class="flex justify-between items-center">
        <span class="font-semibold text-gray-900">Order Total:</span>
        <span class="font-bold text-lg text-indigo-600">
          {formatCurrency(calculateEditTotal())}
        </span>
      </div>
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
  />
{/if}
