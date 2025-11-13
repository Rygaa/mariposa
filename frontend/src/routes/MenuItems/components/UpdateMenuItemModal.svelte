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
  import { itemTypeEnum } from "../../../../../backend/src/db/schema";

  let {
    isOpen = $bindable(false),
    menuItem,
    onClose,
    onMenuItemUpdated,
  }: {
    isOpen: boolean;
    menuItem: any;
    onClose: () => void;
    onMenuItemUpdated: () => void | Promise<void>;
  } = $props();

  let name = $state("");
  let itemType = $state<
    "MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION"
  >("MENU_ITEM");
  let price = $state<number | undefined>(undefined);
  let priceString = $state("");
  let description = $state("");
  let isAvailable = $state(true);
  let isSubmitting = $state(false);
  let error = $state("");

  $effect(() => {
    if (menuItem) {
      name = menuItem.name || "";
      itemType = menuItem.itemType || "MENU_ITEM";
      price = menuItem.price ?? undefined;
      priceString =
        menuItem.price !== null && menuItem.price !== undefined
          ? String(menuItem.price)
          : "";
      description = menuItem.description || "";
      isAvailable = menuItem.isAvailable ?? true;
    }
  });

  function resetForm() {
    name = "";
    itemType = "MENU_ITEM";
    price = undefined;
    priceString = "";
    description = "";
    isAvailable = true;
    error = "";
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!name.trim()) {
      error = "Item name is required";
      return;
    }

    if (!menuItem?.id) {
      error = "Menu item ID is missing";
      return;
    }

    isSubmitting = true;

    try {
      const priceValue = priceString ? parseFloat(priceString) : undefined;
      const result = await trpc.updateMenuItem.mutate({
        id: menuItem.id,
        name,
        itemType,
        price: priceValue,
        description: description || undefined,
        isAvailable,
      });

      if (result.success) {
        onMenuItemUpdated();
        handleClose();
      }
    } catch (err: any) {
      error = err.message || "Failed to update menu item";
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
      <DialogTitle>Update Menu Item</DialogTitle>
      <DialogDescription>Edit the menu item details</DialogDescription>
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
          Item Type *
        </span>
        <Select bind:value={itemType}>
          <SelectTrigger>
            <SelectValue placeholder="Select item type" />
          </SelectTrigger>
          <SelectContent>
            {#each itemTypeEnum.enumValues as type}
              <SelectItem value={type}>{type}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <Input
        label="Price"
        type="number"
        bind:value={priceString}
        placeholder="0.00"
      />

      <div>
        <label
          for="descriptionUpdate"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Description
        </label>
        <textarea
          id="descriptionUpdate"
          bind:value={description}
          placeholder="Enter item description..."
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          rows="3"
        ></textarea>
      </div>

      <div class="flex items-center">
        <input
          type="checkbox"
          id="isAvailableUpdate"
          bind:checked={isAvailable}
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label for="isAvailableUpdate" class="ml-2 block text-sm text-gray-900">
          Available (item is available for order)
        </label>
      </div>

      {#if menuItem}
        <div class="pt-4 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            Last updated: {new Date(menuItem.updatedAt).toLocaleString()}
          </p>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} loading={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Item"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
