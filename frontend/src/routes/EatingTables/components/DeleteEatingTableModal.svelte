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
    table,
    onClose,
    onTableDeleted,
  }: {
    isOpen: boolean;
    table: any;
    onClose: () => void;
    onTableDeleted: () => void | Promise<void>;
  } = $props();

  let isSubmitting = $state(false);
  let error = $state("");

  function handleClose() {
    error = "";
    onClose();
  }

  async function handleDelete() {
    error = "";

    if (!table?.id) {
      error = "Table ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.deleteEatingTable.mutate({
        id: table.id,
      });

      if (result.success) {
        onTableDeleted();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to delete table";
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
      <DialogTitle>Delete Table</DialogTitle>
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
            You are about to delete the table <strong
              class="font-semibold text-gray-900"
              >{table?.name || "Unnamed"}</strong
            >. This action cannot be undone.
          </p>

          {#if table}
            <div class="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Table Name:</span>
                <span class="font-medium text-gray-900">{table.name || "Unnamed"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Type:</span>
                <span class="font-medium text-gray-900">{table.type}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span
                  class="font-medium {table.isActive
                    ? 'text-green-600'
                    : 'text-gray-500'}"
                >
                  {table.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button variant="danger" onclick={handleDelete} loading={isSubmitting}>
        {isSubmitting ? "Deleting..." : "Delete Table"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
