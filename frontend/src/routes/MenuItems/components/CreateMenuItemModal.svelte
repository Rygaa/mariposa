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
  import { typeEnum, unitEnum } from "../../../../../backend/src/db/schema";
  import { onMount } from "svelte";
  import type { listCategories } from "../../../../../backend/src/router.types";

  let {
    onMenuItemCreated,
  }: {
    onMenuItemCreated?: () => void | Promise<void>;
  } = $props();

  let name = $state("");
  let type = $state<Array<"MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION">>(["MENU_ITEM"]);
  let price = $state<number | undefined>(undefined);
  let priceString = $state("");
  let description = $state("");
  let isAvailable = $state(true);
  let categoryId = $state<string>("");
  let isSubmitting = $state(false);
  let error = $state("");
  let isOpen = $state(false);
  let categories = $state<listCategories["categories"]>([]);
  let loadingCategories = $state(false);

  onMount(async () => {
    await loadCategories();
  });

  async function loadCategories() {
    loadingCategories = true;
    try {
      const result = await trpc.listCategories.query();
      if (result.success) {
        categories = result.categories;
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
    loadingCategories = false;
  }

  $effect(() => {
    // Clear categoryId when type is not MENU_ITEM
    if (!type.includes("MENU_ITEM")) {
      categoryId = "";
    }
  });

  function resetForm() {
    name = "";
    type = ["MENU_ITEM"];
    price = undefined;
    priceString = "";
    description = "";
    isAvailable = true;
    categoryId = "";
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
      error = "Menu item name is required";
      return;
    }

    isSubmitting = true;

    try {
      const priceValue = priceString ? parseFloat(priceString) : undefined;
      const result = await trpc.createMenuItem.mutate({
        name,
        type,
        price: priceValue,
        description: description || undefined,
        isAvailable,
        categoryId: categoryId || undefined,
      });

      if (result.success) {
        onMenuItemCreated?.();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to create menu item";
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
  <Button onclick={handleOnOpen} iconName="add">Create Menu Item</Button>

  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Create Menu Item</DialogTitle>
      <DialogDescription
        >Add a new menu item to your system</DialogDescription
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
        label="Item Name *"
        type="text"
        bind:value={name}
        placeholder="e.g., Margherita Pizza"
        required
      />

      <div>
        <span class="block text-sm font-medium text-gray-700 mb-2">
          Item Types *
        </span>
        <div class="space-y-2">
          {#each typeEnum.enumValues as itemType}
            <label class="flex items-center">
              <input
                type="checkbox"
                checked={type.includes(itemType)}
                onchange={(e) => {
                  if (e.currentTarget.checked) {
                    type = [...type, itemType];
                  } else {
                    type = type.filter(t => t !== itemType);
                  }
                }}
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">{itemType}</span>
            </label>
          {/each}
        </div>
      </div>

      {#if type.includes("MENU_ITEM")}
        <div>
          <span class="block text-sm font-medium text-gray-700 mb-2">
            Category
          </span>
          <Select bind:value={categoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Category</SelectItem>
              {#each categories as category}
                <SelectItem value={category.id}>{category.name}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
      {/if}

      <Input
        label="Price"
        type="number"
        bind:value={priceString}
        placeholder="0.00"
      />

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          bind:value={description}
          placeholder="Enter item description..."
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          rows="3"
        ></textarea>
      </div>

      <div class="flex items-center">
        <input
          type="checkbox"
          id="isAvailable"
          bind:checked={isAvailable}
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label for="isAvailable" class="ml-2 block text-sm text-gray-900">
          Available (item is available for order)
        </label>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} loading={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Item"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
