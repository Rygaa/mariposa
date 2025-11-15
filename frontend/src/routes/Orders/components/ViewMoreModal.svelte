<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "../../../lib/shadcn/Dialog/index";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";

  let {
    isOpen = $bindable(false),
    order,
    onClose,
  }: {
    isOpen: boolean;
    order: any;
    onClose: () => void;
  } = $props();

  let orderDetails = $state<any>(null);
  let isLoading = $state(false);

  $effect(() => {
    if (isOpen && order) {
      loadOrderDetails();
    }
  });

  async function loadOrderDetails() {
    isLoading = true;
    try {
      const result = await trpc.getOrderByIdWithRelations.query({
        id: order.id,
      });
      if (result.success) {
        orderDetails = result.order;
      }
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    onClose();
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
      <DialogTitle>Order Details</DialogTitle>
    </DialogHeader>

    <div class="px-6 py-4">
      {#if isLoading}
        <div class="text-center py-8">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"
          ></div>
          <p class="mt-2 text-gray-600">Loading...</p>
        </div>
      {:else if orderDetails}
        <div class="space-y-4">
          <!-- Order Info -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2">
              Order #{orderDetails.id.slice(0, 8)}
            </h3>
            <div class="space-y-1 text-sm">
              <p>
                <span class="text-gray-600">Status:</span>
                <span class="font-medium ml-1">{orderDetails.status}</span>
              </p>
              <p>
                <span class="text-gray-600">Created:</span>
                <span class="font-medium ml-1"
                  >{new Date(orderDetails.createdAt).toLocaleString()}</span
                >
              </p>
            </div>
          </div>

          <!-- Menu Items -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-3">Menu Items</h4>
            {#if orderDetails.menuItemOrders && orderDetails.menuItemOrders.length > 0}
              <div class="space-y-2">
                {#each orderDetails.menuItemOrders as menuItemOrder (menuItemOrder.id)}
                  <div
                    class="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">
                        {menuItemOrder.menuItem?.name || "Unknown Item"}
                      </p>
                      <p class="text-sm text-gray-600">
                        Quantity: {menuItemOrder.quantity}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="font-semibold text-gray-900">
                        {(menuItemOrder.price * menuItemOrder.quantity).toFixed(
                          2
                        )} DZD
                      </p>
                      <p class="text-sm text-gray-600">
                        @ {menuItemOrder.price.toFixed(2)} DZD
                      </p>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Total -->
              <div
                class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center"
              >
                <span class="font-semibold text-gray-900">Total:</span>
                <span class="text-xl font-bold text-gray-900">
                  {orderDetails.menuItemOrders
                    .reduce(
                      (sum: number, mio: any) =>
                        sum + mio.price * mio.quantity,
                      0
                    )
                    .toFixed(2)} DZD
                </span>
              </div>
            {:else}
              <p class="text-gray-500 text-center py-4">
                No items in this order
              </p>
            {/if}
          </div>
        </div>
      {:else}
        <p class="text-gray-500 text-center py-4">No order details available</p>
      {/if}
    </div>
  </DialogContent>
</Dialog>
