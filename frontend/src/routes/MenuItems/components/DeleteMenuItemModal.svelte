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
    menuItem,
    onClose,
    onMenuItemDeleted,
  }: {
    isOpen: boolean;
    menuItem: any;
    onClose: () => void;
    onMenuItemDeleted: () => void | Promise<void>;
  } = $props();

  let isSubmitting = $state(false);
  let error = $state("");

  function handleClose() {
    error = "";
    onClose();
  }

  async function handleDelete() {
    error = "";

    if (!menuItem?.id) {
      error = "Menu item ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.deleteMenuItem.mutate({
        id: menuItem.id,
      });

      if (result.success) {
        onMenuItemDeleted();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to delete menu item";
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
      <DialogTitle>Delete Menu Item</DialogTitle>
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
            You are about to delete the menu item <strong
              class="font-semibold text-gray-900"
              >{menuItem?.name || "Unnamed"}</strong
            >. This action cannot be undone.
          </p>

          {#if menuItem}
            <div class="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Item Name:</span>
                <span class="font-medium text-gray-900">{menuItem.name}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Type:</span>
                <span class="font-medium text-gray-900">{menuItem.itemType}</span>
              </div>
              {#if menuItem.price}
                <div class="flex justify-between">
                  <span class="text-gray-600">Price:</span>
                  <span class="font-medium text-gray-900">${menuItem.price.toFixed(2)}</span>
                </div>
              {/if}
              <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span
                  class="font-medium {menuItem.isAvailable
                    ? 'text-green-600'
                    : 'text-gray-500'}"
                >
                  {menuItem.isAvailable ? "Available" : "Unavailable"}
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
        {isSubmitting ? "Deleting..." : "Delete Item"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
