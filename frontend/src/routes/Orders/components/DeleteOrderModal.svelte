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
    onOrderDeleted,
  }: {
    isOpen: boolean;
    order: any;
    onClose: () => void;
    onOrderDeleted: () => void | Promise<void>;
  } = $props();

  let isSubmitting = $state(false);
  let error = $state("");

  function handleClose() {
    error = "";
    onClose();
  }

  function formatStatus(status: string) {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  async function handleDelete() {
    error = "";

    if (!order?.id) {
      error = "Order ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.deleteOrder.mutate({
        id: order.id,
      });

      if (result.success) {
        onOrderDeleted();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to delete order";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) handleClose();
  }}
>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Delete Order</DialogTitle>
      <DialogDescription>This action cannot be undone</DialogDescription>
    </DialogHeader>

    <div class="space-y-4 px-6 py-4">
      {#if error}
        <div
          class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </div>
      {/if}

      <div class="flex items-start gap-4">
        <div
          class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"
        >
          <Icon iconName="warning" class="text-red-600" size={24} />
        </div>

        <div class="flex-1">
          <h3 class="text-lg font-medium text-gray-900 mb-2">Are you sure?</h3>
          <p class="text-sm text-gray-600 mb-4">
            You are about to delete order <strong
              class="font-semibold text-gray-900"
              >#{order?.id.slice(0, 8) || "Unknown"}</strong
            >. This action cannot be undone.
          </p>

          {#if order}
            <div class="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Order ID:</span>
                <span class="font-medium text-gray-900 truncate ml-2">
                  {order.id}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span class="font-medium text-gray-900">
                  {formatStatus(order.status)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Table ID:</span>
                <span class="font-medium text-gray-900 truncate ml-2">
                  {order.eatingTableId.slice(0, 8)}...
                </span>
              </div>
              {#if order.createdAt}
                <div class="flex justify-between">
                  <span class="text-gray-600">Created:</span>
                  <span class="font-medium text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        onclick={handleDelete}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Deleting..." : "Delete Order"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
