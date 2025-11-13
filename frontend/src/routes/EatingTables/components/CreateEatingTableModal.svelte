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
    onTableCreated,
  }: {
    onTableCreated?: () => void | Promise<void>;
  } = $props();

  let name = $state("");
  let type = $state<"TAKEAWAY" | "EMPLOYEES" | "WAST" | "GIFT">("TAKEAWAY");
  let isActive = $state(true);
  let isSubmitting = $state(false);
  let error = $state("");
  let isOpen = $state(false);

  function resetForm() {
    name = "";
    type = "TAKEAWAY";
    isActive = true;
    error = "";
  }

  function handleClose() {
    resetForm();
    isOpen = false;
  }

  function handleOnOpen() {
    isOpen = true;
  }

  async function handleSubmit() {
    error = "";

    if (!name.trim()) {
      error = "Table name is required";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.createEatingTable.mutate({
        name,
        type,
        isActive,
      });

      if (result.success) {
        onTableCreated?.();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to create table";
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
  <Button onclick={handleOnOpen} iconName="add">Create Table</Button>

  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Create Eating Table</DialogTitle>
      <DialogDescription
        >Add a new eating table to your system</DialogDescription
      >
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
          id="isActive"
          bind:checked={isActive}
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label for="isActive" class="ml-2 block text-sm text-gray-900">
          Active (table is available for use)
        </label>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} loading={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Table"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
