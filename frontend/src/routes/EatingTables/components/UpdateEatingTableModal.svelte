<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "../../../lib/shadcn/Select/index";
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
  import { eatingTableTypeEnum } from "../../../../../backend/src/db/schema";

  let {
    isOpen = $bindable(false),
    table,
    onClose,
    onTableUpdated,
  }: {
    isOpen: boolean;
    table: any;
    onClose: () => void;
    onTableUpdated: () => void | Promise<void>;
  } = $props();

  let name = $state("");
  let type = $state<"TAKEAWAY" | "EMPLOYEES" | "WAST" | "GIFT">("TAKEAWAY");
  let isActive = $state(true);
  let isSubmitting = $state(false);
  let error = $state("");

  // Update form when table changes
  $effect(() => {
    if (table) {
      name = table.name || "";
      type = table.type || "TAKEAWAY";
      isActive = table.isActive ?? true;
    }
  });

  function resetForm() {
    name = "";
    type = "TAKEAWAY";
    isActive = true;
    error = "";
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!name.trim()) {
      error = "Table name is required";
      return;
    }

    if (!table?.id) {
      error = "Table ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.updateEatingTable.mutate({
        id: table.id,
        name,
        type,
        isActive,
      });

      if (result.success) {
        onTableUpdated();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to update table";
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
      <DialogTitle>Update Eating Table</DialogTitle>
      <DialogDescription>Edit the eating table details</DialogDescription>
    </DialogHeader>

    <div class="space-y-4 px-6 py-4">
      {#if error}
        <div
          class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </div>
      {/if}

      <Input
        label="Table Name *"
        type="text"
        bind:value={name}
        placeholder="e.g., Table 1, Takeaway Counter"
        required
      />

      <div>
        <span class="block text-sm font-medium text-gray-700 mb-2">
          Table Type *
        </span>
        <Select bind:value={type}>
          <SelectTrigger>
            <SelectValue placeholder="Select table type" />
          </SelectTrigger>
          <SelectContent>
            {#each eatingTableTypeEnum.enumValues as tableType}
              <SelectItem value={tableType}>{tableType}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center">
        <input
          type="checkbox"
          id="isActiveUpdate"
          bind:checked={isActive}
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label for="isActiveUpdate" class="ml-2 block text-sm text-gray-900">
          Active (table is available for use)
        </label>
      </div>

      {#if table}
        <div class="pt-4 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            Last updated: {new Date(table.updatedAt).toLocaleString()}
          </p>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} loading={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Table"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
