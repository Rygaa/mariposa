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
    category,
    onClose,
    onCategoryDeleted,
  }: {
    isOpen: boolean;
    category: any;
    onClose: () => void;
    onCategoryDeleted: () => void | Promise<void>;
  } = $props();

  let isSubmitting = $state(false);
  let error = $state("");

  function handleClose() {
    error = "";
    onClose();
  }

  async function handleDelete() {
    error = "";

    if (!category?.id) {
      error = "Category ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.deleteCategory.mutate({
        id: category.id,
      });

      if (result.success) {
        onCategoryDeleted();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to delete category";
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
      <DialogTitle>Delete Category</DialogTitle>
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
            You are about to delete the category <strong
              class="font-semibold text-gray-900"
              >{category?.name || "Unnamed"}</strong
            >. This action cannot be undone.
          </p>

          {#if category}
            <div class="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Category Name:</span>
                <span class="font-medium text-gray-900">{category.name}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span
                  class="font-medium {category.isUnlisted
                    ? 'text-gray-500'
                    : 'text-green-600'}"
                >
                  {category.isUnlisted ? "Unlisted" : "Listed"}
                </span>
              </div>
              {#if category.iconname}
                <div class="flex justify-between">
                  <span class="text-gray-600">Icon:</span>
                  <span class="font-medium text-gray-900">{category.iconname}</span>
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
      <Button variant="danger" onclick={handleDelete} loading={isSubmitting}>
        {isSubmitting ? "Deleting..." : "Delete Category"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
