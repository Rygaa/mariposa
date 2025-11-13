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
    category,
    onClose,
    onCategoryUpdated,
  }: {
    isOpen: boolean;
    category: any;
    onClose: () => void;
    onCategoryUpdated: () => void | Promise<void>;
  } = $props();

  let name = $state("");
  let isUnlisted = $state(false);
  let iconname = $state("");
  let index = $state<number | null>(null);
  let isSubmitting = $state(false);
  let error = $state("");

  $effect(() => {
    if (category) {
      name = category.name || "";
      isUnlisted = category.isUnlisted ?? false;
      iconname = category.iconname || "";
      index = category.index ?? null;
    }
  });

  function resetForm() {
    name = "";
    isUnlisted = false;
    iconname = "";
    index = null;
    error = "";
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!name.trim()) {
      error = "Category name is required";
      return;
    }

    if (!category?.id) {
      error = "Category ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.updateCategory.mutate({
        id: category.id,
        name,
        isUnlisted,
        iconname: iconname || undefined,
        index: index ?? undefined,
      });

      if (result.success) {
        onCategoryUpdated();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to update category";
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
      <DialogTitle>Update Category</DialogTitle>
      <DialogDescription>Edit the category details</DialogDescription>
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
        label="Category Name *"
        type="text"
        bind:value={name}
        placeholder="e.g., Appetizers, Main Courses"
        required
      />

      <Input
        label="Icon Name"
        type="text"
        bind:value={iconname}
        placeholder="e.g., food, drink"
      />

      <div>
        <label for="categoryIndexUpdate" class="block text-sm font-medium text-gray-700 mb-2">
          Index
        </label>
        <input
          id="categoryIndexUpdate"
          type="number"
          bind:value={index}
          placeholder="e.g., 1, 2, 3"
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div class="flex items-center">
        <input
          type="checkbox"
          id="isUnlistedUpdate"
          bind:checked={isUnlisted}
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label for="isUnlistedUpdate" class="ml-2 block text-sm text-gray-900">
          Unlisted (category is hidden)
        </label>
      </div>

      {#if category}
        <div class="pt-4 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            Last updated: {new Date(category.updatedAt).toLocaleString()}
          </p>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} loading={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Category"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
