<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "../../../lib/shadcn/Dialog/index";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "../../../lib/shadcn/Select/index";
  import Button from "../../../lib/components/Button.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";

  let {
    onOrderCreated,
  }: {
    onOrderCreated?: () => void | Promise<void>;
  } = $props();

  let eatingTableId = $state("");
  let status = $state("INITIALIZED");
  let isSubmitting = $state(false);
  let error = $state("");
  let isOpen = $state(false);
  let eatingTables = $state<any[]>([]);
  let isLoadingTables = $state(false);

  const selectedTableName = $derived(() => {
    const table = eatingTables.find(t => t.id === eatingTableId);
    return table ? (table.name || `Table ${table.tableNumber || table.id}`) : "";
  });

  const statusOptions = [
    { value: "INITIALIZED", label: "Initialized" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "WAITING_TO_BE_PRINTED", label: "Waiting to Print" },
    { value: "PRINTED", label: "Printed" },
    { value: "SERVED", label: "Served" },
    { value: "PAID", label: "Paid" },
  ];

  function resetForm() {
    eatingTableId = "";
    status = "INITIALIZED";
    error = "";
  }

  function handleClose() {
    resetForm();
    isOpen = false;
  }

  async function handleOnOpen() {
    isOpen = true;
    await loadEatingTables();
  }

  async function loadEatingTables() {
    isLoadingTables = true;
    try {
      const result = await trpc.listEatingTables.query({});
      if (result.success) {
        eatingTables = result.eatingTables || [];
      }
    } catch (err: any) {
      console.error("Failed to load eating tables:", err);
    } finally {
      isLoadingTables = false;
    }
  }

  async function handleSubmit() {
    error = "";

    if (!eatingTableId.trim()) {
      error = "Eating table ID is required";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.createOrder.mutate({
        eatingTableId,
        status: status as any,
      });

      if (result.success) {
        onOrderCreated?.();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to create order";
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
  <Button onclick={handleOnOpen} iconName="add">Create Order</Button>

  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Create Order</DialogTitle>
      <DialogDescription>Add a new order to your system</DialogDescription>
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
        <span class="block text-sm font-medium text-gray-700">
          Eating Table
        </span>
        {#if isLoadingTables}
          <div class="text-sm text-gray-500">Loading tables...</div>
        {:else}
          <Select bind:value={eatingTableId}>
            <SelectTrigger class="w-full">
              <span class="block truncate">
                {selectedTableName() || "Select a table"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {#each eatingTables as table}
                <SelectItem value={table.id}>
                  {table.name || `Table ${table.tableNumber || table.id}`}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        {/if}
      </div>

      <div class="space-y-2">
        <label for="status-select" class="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status-select"
          bind:value={status}
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Order"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
