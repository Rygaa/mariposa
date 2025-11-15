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
  import Input from "../../../lib/components/Input.svelte";
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

  let eatingTableId = $state("");
  let status = $state("INITIALIZED");
  let isSubmitting = $state(false);
  let error = $state("");

  const statusOptions = [
    { value: "INITIALIZED", label: "Initialized" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "WAITING_TO_BE_PRINTED", label: "Waiting to Print" },
    { value: "PRINTED", label: "Printed" },
    { value: "SERVED", label: "Served" },
    { value: "PAID", label: "Paid" },
  ];

  $effect(() => {
    if (order) {
      eatingTableId = order.eatingTableId || "";
      status = order.status || "INITIALIZED";
    }
  });

  function resetForm() {
    eatingTableId = "";
    status = "INITIALIZED";
    error = "";
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!eatingTableId.trim()) {
      error = "Eating table ID is required";
      return;
    }

    if (!order?.id) {
      error = "Order ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.updateOrder.mutate({
        id: order.id,
        eatingTableId,
        status: status as any,
      });

      if (result.success) {
        onOrderUpdated();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to update order";
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
      <DialogTitle>Update Order</DialogTitle>
      <DialogDescription>Edit the order details</DialogDescription>
    </DialogHeader>

    <div class="space-y-4 px-6 py-4">
      {#if error}
        <div
          class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </div>
      {/if}

      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Order ID
        </label>
        <div
          class="block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
        >
          {order?.id || "N/A"}
        </div>
      </div>

      <Input
        label="Eating Table ID"
        type="text"
        bind:value={eatingTableId}
        placeholder="Enter eating table UUID"
        required={true}
      />

      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          bind:value={status}
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      {#if order?.createdAt}
        <div class="text-xs text-gray-500">
          Created: {new Date(order.createdAt).toLocaleString()}
        </div>
      {/if}
      {#if order?.updatedAt}
        <div class="text-xs text-gray-500">
          Last updated: {new Date(order.updatedAt).toLocaleString()}
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Order"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
