<script lang="ts">
  import { onMount } from "svelte";
  import Dialog from "../../../lib/shadcn/Dialog/Dialog.svelte";
  import DialogContent from "../../../lib/shadcn/Dialog/DialogContent.svelte";
  import DialogHeader from "../../../lib/shadcn/Dialog/DialogHeader.svelte";
  import DialogTitle from "../../../lib/shadcn/Dialog/DialogTitle.svelte";
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import UnpaidOrder from "./UnpaidOrder.svelte";
  import { trpc } from "../../../lib/trpc";
  import { _cartsStore } from "../../../store/carts.svelte";
  import { generateReciptPdf } from "../../../utils/printReceipt";
  import { generateOrderPDF } from "../../../utils/printOrder";

  interface Props {
    isOpen: boolean;
    table: any;
  }

  let { isOpen = $bindable(), table }: Props = $props();

  let isLoading = $state(false);
  let zoomLevel = $state(1.2);

  // Derived state for this table's orders
  const orders = $derived(
    _cartsStore.orders.filter(
      (order: any) =>
        order.eatingTableId === table.id && order.status === "CONFIRMED"
    )
  );

  async function handleMarkAllAsPaid() {
    try {
      await Promise.all(
        orders.map((order) =>
          trpc.updateOrder.mutate({
            id: order.id,
            status: "PAID",
          })
        )
      );
      // Reload orders from the store
      await _cartsStore.loadOrders();
      isOpen = false;
    } catch (error) {
      console.error("Error marking orders as paid:", error);
    }
  }

  async function handleMarkAsPaid(orderId: string) {
    try {
      const result = await trpc.updateOrder.mutate({
        id: orderId,
        status: "PAID",
      });
      if (result.success) {
        // Reload orders from the store
        await _cartsStore.loadOrders();
      }
    } catch (error) {
      console.error("Error marking order as paid:", error);
    }
  }

  async function handleOrderUpdated(orderId: string) {
    try {
      // Fetch only the specific updated order
      const result = await trpc.getOrderByIdWithRelations.query({
        id: orderId,
      });
      if (result.success && result.order) {
        // Only keep it if it's still CONFIRMED status
        if (result.order.status === "CONFIRMED") {
          // Update the specific order in the global store
          const index = _cartsStore.orders.findIndex(
            (order) => order.id === orderId
          );
          if (index !== -1) {
            _cartsStore.orders[index] = result.order;
            _cartsStore.orders = [..._cartsStore.orders]; // Trigger reactivity
          }
        } else {
          // Order status changed, remove it from the global store
          _cartsStore.orders = _cartsStore.orders.filter(
            (order) => order.id !== orderId
          );
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating order:", error);
      return false;
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

  import { calculateMultipleOrdersTotal } from "../../../utils/calcule";
  import DialogFooter from "../../../lib/shadcn/Dialog/DialogFooter.svelte";

  const tableTotal = $derived(calculateMultipleOrdersTotal(orders));

  async function handlePrintOrder(orderId: string) {
    try {
      // Fetch full order details with relations
      const result = await trpc.getOrderByIdWithRelations.query({
        id: orderId,
      });

      if (result.success && result.order) {
        await generateOrderPDF(result.order);
      }
    } catch (error) {
      console.error("Error printing order:", error);
      alert("Erreur lors de l'impression de la commande");
    }
  }

  async function handlePrintTableReceipt() {
    try {
      // Collect all menu item orders from all orders for this table
      const allMenuItemOrders = orders.flatMap(
        (order) => order.menuItemOrders || []
      );

      if (allMenuItemOrders.length > 0) {
        await generateReciptPdf(allMenuItemOrders, table.name);
      }
    } catch (error) {
      console.error("Error printing table receipt:", error);
      alert("Erreur lors de l'impression du reçu de table");
    }
  }
</script>

<Dialog bind:open={isOpen}>
  <DialogContent class="w-full h-full overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3 flex-1">
            <Icon iconName="zoom_in" class="text-gray-500" />
            <input
              type="range"
              min="0.8"
              max="2"
              step="0.1"
              bind:value={zoomLevel}
              class="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span class="text-sm text-gray-600 min-w-[3rem]"
              >{Math.round(zoomLevel * 100)}%</span
            >
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Icon
              iconName="table_restaurant"
              class="text-2xl text-orange-500"
            />
            <div>
              <h2 class="text-xl font-bold">
                {table.name ||
                  `Table ${table.tableNumber || table.id.slice(0, 8)}`}
              </h2>
              <p class="text-sm text-gray-500 font-normal">
                {orders.length} confirmed {orders.length === 1
                  ? "order"
                  : "orders"}
              </p>
            </div>
          </div>
          {#if orders.length > 0}
            <div class="flex gap-2">
              <Button
                onclick={handlePrintTableReceipt}
                iconName="print"
                variant="secondary"
                size="sm"
              >
                Imprimer le reçu
              </Button>
              <Button
                onclick={handleMarkAllAsPaid}
                iconName="check_circle"
                variant="danger"
                size="sm"
              >
                Marquer tout comme payé
              </Button>
            </div>
          {/if}
        </div>
      </DialogTitle>
    </DialogHeader>
    <div class="mt-6 h-full overflow-y-auto">
      <div style="zoom: {zoomLevel};">
        {#if isLoading}
          <div class="flex items-center justify-center py-12">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
            ></div>
          </div>
        {:else if orders.length === 0}
          <div class="text-center py-12">
            <Icon
              iconName="shopping_cart"
              class="text-gray-300 text-6xl mx-auto mb-4"
            />
            <p class="text-gray-500 text-lg">
              No confirmed orders for this table
            </p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each orders as order (order.id)}
              <UnpaidOrder
                {order}
                onOrderUpdated={() => handleOrderUpdated(order.id)}
                onMarkAsPaid={() => handleMarkAsPaid(order.id)}
                onPrintOrder={() => handlePrintOrder(order.id)}
              />
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <DialogFooter>
      <div class="flex justify-between items-center">
        <span class="text-lg font-semibold text-gray-700"
          >Table Total: &nbsp;</span
        >
        <span class="text-2xl font-bold text-gray-900"
          >{formatCurrency(tableTotal)}</span
        >
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
