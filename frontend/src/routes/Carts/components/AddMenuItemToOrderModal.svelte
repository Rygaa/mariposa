<script lang="ts">
  import {
    Dialog,
    DialogContent,
  } from "../../../lib/shadcn/Dialog/index";
  import ClientOrders from "../../ClientOrders_version2/ClientOrders.svelte";
  import { trpc } from "../../../lib/trpc";

  interface Props {
    isOpen: boolean;
    orderId: string;
    onClose: () => void;
    onItemAdded: () => void | Promise<void>;
  }

  let {
    isOpen = $bindable(false),
    orderId,
    onClose,
    onItemAdded,
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
          await onItemAdded();
          handleClose();
        }}
      />
    {/if}
  </DialogContent>
</Dialog>
