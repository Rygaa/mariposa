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
  <DialogContent class="max-w-7xl w-full">
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
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each orderDetails.menuItemOrders.filter((mio: any) => !mio.parentMenuItemOrderId) as menuItemOrder (menuItemOrder.id)}
                  <div
                    class="bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <div class="flex items-center justify-between">
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
                    <div class="mt-2 pt-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                      <div>
                        <span class="font-medium">Updated:</span>
                        <span class="ml-1">{new Date(menuItemOrder.updatedAt).toLocaleString()}</span>
                      </div>
                      {#if menuItemOrder.deletedAt}
                        <div>
                          <span class="font-medium">Deleted:</span>
                          <span class="ml-1">{new Date(menuItemOrder.deletedAt).toLocaleString()}</span>
                        </div>
                      {/if}
                    </div>
                    
                    <!-- Supplements -->
                    {#if menuItemOrder.childMenuItemOrders && menuItemOrder.childMenuItemOrders.length > 0}
                      <div class="mt-3 ml-4 space-y-2 border-l-2 border-indigo-200 pl-3">
                        {#each menuItemOrder.childMenuItemOrders as supplement (supplement.id)}
                          <div class="bg-indigo-50 border border-indigo-100 rounded p-2">
                            <div class="flex items-center justify-between">
                              <div class="flex-1">
                                <p class="text-sm font-medium text-indigo-900">
                                  + {supplement.menuItem?.name || "Unknown Supplement"}
                                </p>
                                <p class="text-xs text-indigo-600">
                                  Quantity: {supplement.quantity}
                                </p>
                              </div>
                              <div class="text-right">
                                <p class="text-sm font-semibold text-indigo-900">
                                  {(supplement.price * supplement.quantity).toFixed(2)} DZD
                                </p>
                                <p class="text-xs text-indigo-600">
                                  @ {supplement.price.toFixed(2)} DZD
                                </p>
                              </div>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>

              <!-- Total -->
              <div
                class="mt-4 pt-4 border-t border-gray-200"
              >
                <div class="space-y-2 mb-3 text-sm text-gray-600">
                  {#each orderDetails.menuItemOrders.filter((mio: any) => !mio.parentMenuItemOrderId) as menuItemOrder}
                    <div class="flex justify-between">
                      <span>
                        {menuItemOrder.menuItem?.name || "Unknown"} ({menuItemOrder.quantity} × {menuItemOrder.price.toFixed(2)} DZD)
                        {#if menuItemOrder.childMenuItemOrders && menuItemOrder.childMenuItemOrders.length > 0}
                          {#each menuItemOrder.childMenuItemOrders as supplement}
                            + {supplement.menuItem?.name || "Unknown"} ({supplement.quantity} × {supplement.price.toFixed(2)} DZD)
                          {/each}
                        {/if}
                      </span>
                      <span class="font-medium">
                        {(
                          menuItemOrder.price * menuItemOrder.quantity +
                          (menuItemOrder.childMenuItemOrders?.reduce(
                            (sum: number, s: any) => sum + s.price * s.quantity,
                            0
                          ) || 0)
                        ).toFixed(2)} DZD
                      </span>
                    </div>
                  {/each}
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-gray-300">
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
