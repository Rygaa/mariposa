<script lang="ts">
  import {
    Dialog,
    DialogContent,
  } from "../../../lib/shadcn/Dialog/index";
  import ClientOrders from "../../ClientOrders_version3/ClientOrders.svelte";
  import { trpc } from "../../../lib/trpc";
  import { _cartsStore } from "../../../store/carts.svelte";

  interface Props {
    isOpen: boolean;
    orderId: string;
    onClose: () => void;
  }

  let {
    isOpen = $bindable(false),
    orderId,
    onClose,
  }: Props = $props();

  let existingOrder = $state<any>(null);

  $effect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  });

  async function loadOrder() {
    try {
      const result = await trpc.getOrderByIdWithRelations.query({
        id: orderId,
      });
      if (result.success) {
        existingOrder = result.order;
      }
    } catch (error) {
      console.error("Error loading order:", error);
    }
  }

  async function handleItemAdded() {
    try {
      // Fetch the updated order
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
      }
    } catch (error) {
      console.error("Error updating order:", error);
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
  <DialogContent class="w-[95vw] h-[95vh] p-0">
    {#if existingOrder}
      <ClientOrders 
        existingOrder={existingOrder} 
        onConfirm={async () => {
          await handleItemAdded();
          handleClose();
        }}
      />
    {/if}
  </DialogContent>
</Dialog>
