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

  interface Props {
    isOpen: boolean;
    table: any;
    onOrdersUpdated: () => void;
  }

  let { isOpen = $bindable(), table, onOrdersUpdated }: Props = $props();

  let orders = $state<any[]>([]);
  let isLoading = $state(false);

  $effect(() => {
    if (isOpen && table) {
      loadTableOrders();
    }
  });

  async function loadTableOrders() {
    isLoading = true;
    try {
      const result = await trpc.listOrdersWithRelations.query({
        eatingTableId: table.id,
      });
      if (result.success) {
        // Filter confirmed orders for this table
        orders = result.orders.filter(
          (order: any) =>
            order.eatingTableId === table.id && order.status === "CONFIRMED"
        );
      }
    } catch (error) {
      console.error("Error loading table orders:", error);
    }
    isLoading = false;
  }

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
      await onOrdersUpdated();
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
        await loadTableOrders();
        await onOrdersUpdated();
      }
    } catch (error) {
      console.error("Error marking order as paid:", error);
    }
  }

  async function handleOrderUpdated() {
    await loadTableOrders();
    await onOrdersUpdated();
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const tableTotal = $derived(() => {
    return orders.reduce((sum, order) => {
      if (!order.menuItemOrders) return sum;
      return (
        sum +
        order.menuItemOrders.reduce(
          (orderSum: number, mio: any) => orderSum + mio.price * mio.quantity,
          0
        )
      );
    }, 0);
  });
</script>

<Dialog bind:open={isOpen}>
  <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
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
            <Button
              onclick={handleMarkAllAsPaid}
              iconName="check_circle"
              variant="primary"
              size="sm"
            >
              Mark All Paid
            </Button>
          {/if}
        </div>
      </DialogTitle>
    </DialogHeader>

    <div class="mt-6">
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
              onOrderUpdated={handleOrderUpdated}
              onMarkAsPaid={() => handleMarkAsPaid(order.id)}
            />
          {/each}
        </div>

        <div class="mt-6 pt-4 border-t border-gray-200">
          <div class="flex justify-between items-center">
            <span class="text-lg font-semibold text-gray-700">Table Total:</span
            >
            <span class="text-2xl font-bold text-gray-900"
              >{formatCurrency(tableTotal())}</span
            >
          </div>
        </div>
      {/if}
    </div>
  </DialogContent>
</Dialog>
