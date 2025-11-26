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
  import { typeEnum } from "../../../../../backend/src/db/schema";
  import { onMount } from "svelte";
  import type { listCategories } from "../../../../../backend/src/router.types";
  import ImageUpload from "./ImageUpload.svelte";

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
  let subName = $state("");
  let type = $state<
    Array<"MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION">
  >(["MENU_ITEM"]);
  let description = $state("");
  let isAvailable = $state(true);
  let categoryId = $state<string>("");
  let isSubmitting = $state(false);
  let error = $state("");
  let categories = $state<listCategories["categories"]>([]);
  let loadingCategories = $state(false);
  let latestSellingPrice = $state<number | null>(null);
  let latestBuyingPrice = $state<number | null>(null);
  let loadingPrices = $state(false);
  let designVersion = $state<number | null>(null);
  let imageSourceMenuItemId = $state<string | null>(null);
  let availableMenuItems = $state<Array<{id: string, name: string}>>([]);
  let loadingMenuItems = $state(false);

  onMount(async () => {
    await loadCategories();
    await loadMenuItems();
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

  async function loadMenuItems() {
    loadingMenuItems = true;
    try {
      const result = await trpc.listMenuItems.query({
        type: ["MENU_ITEM"],
        isAvailable: true,
      });
        console.log(result)

      if (result.success) {
        availableMenuItems = result.menuItems.map((item: any) => ({
          id: item.id,
          name: item.subName ? `${item.name} (${item.subName})` : item.name,
        }));
        console.log(availableMenuItems)
      }
    } catch (err) {
      console.error("Failed to load menu items:", err);
    }
    loadingMenuItems = false;
  }

  async function loadItemPrices(menuItemId: string) {
    loadingPrices = true;
    latestSellingPrice = null;
    latestBuyingPrice = null;
    try {
      // Fetch selling prices
      const sellingResult = await trpc.listItemPricesByMenuItem.query({
        menuItemId,
        priceType: "selling",
      });
      if (sellingResult.success && sellingResult.itemPrices.length > 0) {
        // Get the most recent price (assuming they're ordered by createdAt)
        const sortedSelling = [...sellingResult.itemPrices].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        latestSellingPrice = sortedSelling[0].priceValue;
      }

      // Fetch buying prices
      const buyingResult = await trpc.listItemPricesByMenuItem.query({
        menuItemId,
        priceType: "buying",
      });
      if (buyingResult.success && buyingResult.itemPrices.length > 0) {
        // Get the most recent price
        const sortedBuying = [...buyingResult.itemPrices].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        latestBuyingPrice = sortedBuying[0].priceValue;
      }
    } catch (err) {
      console.error("Failed to load item prices:", err);
    }
    loadingPrices = false;
  }

  $effect(() => {
    // Clear categoryId when type is not MENU_ITEM
    if (!type.includes("MENU_ITEM")) {
      categoryId = "";
    }
  });

  // Track previous state to prevent infinite loops
  let prevIsOpen = $state(false);
  let prevMenuItemId = $state<string | null>(null);

  $effect(() => {
    // Only run when modal is newly opened or menu item changes
    if (isOpen && menuItem && (isOpen !== prevIsOpen || menuItem.id !== prevMenuItemId)) {
      prevIsOpen = isOpen;
      prevMenuItemId = menuItem.id;
      
      name = menuItem.name || "";
      subName = menuItem.subName || "";
      type = menuItem.type || ["MENU_ITEM"];
      description = menuItem.description || "";
      isAvailable = menuItem.isAvailable ?? true;
      categoryId = menuItem.categoryId || "";
      designVersion = menuItem.designVersion ?? null;
      imageSourceMenuItemId = menuItem.imageSourceMenuItemId ?? null;
      
      // Load item prices
      if (menuItem.id) {
        loadItemPrices(menuItem.id);
      }
    } else if (!isOpen) {
      prevIsOpen = false;
      prevMenuItemId = null;
    }
  });

  function resetForm() {
    name = "";
    subName = "";
    type = ["MENU_ITEM"];
    description = "";
    isAvailable = true;
    categoryId = "";
    error = "";
    latestSellingPrice = null;
    latestBuyingPrice = null;
    designVersion = null;
    imageSourceMenuItemId = null;
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
      const result = await trpc.updateMenuItem.mutate({
        id: menuItem.id,
        name,
        subName: subName || undefined,
        type,
        description: description || undefined,
        isAvailable,
        categoryId: categoryId || undefined,
        designVersion: designVersion ?? undefined,
        imageSourceMenuItemId: imageSourceMenuItemId || null,
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
  <DialogContent class="max-w-6xl">
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

      <Input
        label="Sub Name"
        type="text"
        bind:value={subName}
        placeholder="e.g., Additional name or variant"
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
              <input
                type="text"
                placeholder="Search categories..."
                class="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                oninput={(e) => {
                  const searchTerm = e.currentTarget.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  const options = e.currentTarget.parentElement?.querySelectorAll('[role="option"]');
                  options?.forEach((option) => {
                    const text = (option.textContent?.toLowerCase() || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    option.classList.toggle('hidden', !text.includes(searchTerm));
                  });
                }}
                onclick={(e) => e.stopPropagation()}
              />
              <SelectItem value="">No Category</SelectItem>
              {#each categories as category}
                <SelectItem value={category.id}>{category.name}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
      {/if}

      <!-- Price Information (Read-only) -->
      <div class="border-t border-gray-200 pt-4">
        <span class="block text-sm font-medium text-gray-700 mb-3">
          Latest Prices
        </span>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="block text-xs font-medium text-gray-500 mb-1">
              Selling Price
            </span>
            <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              {#if loadingPrices}
                <span class="text-gray-400">Loading...</span>
              {:else if latestSellingPrice !== null}
                ${latestSellingPrice.toFixed(2)}
              {:else}
                <span class="text-gray-400">Not set</span>
              {/if}
            </div>
          </div>
          <div>
            <span class="block text-xs font-medium text-gray-500 mb-1">
              Buying Price
            </span>
            <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              {#if loadingPrices}
                <span class="text-gray-400">Loading...</span>
              {:else if latestBuyingPrice !== null}
                ${latestBuyingPrice.toFixed(2)}
              {:else}
                <span class="text-gray-400">Not set</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Image Source Selection -->
      <div class="border-t border-gray-200 pt-4">
        <div>
          <span class="block text-sm font-medium text-gray-700 mb-2">
            Image Source
          </span>
          <Select 
            value={imageSourceMenuItemId || ""}
            onValueChange={(value) => {
              const val = Array.isArray(value) ? value[0] : value;
              imageSourceMenuItemId = val === "" ? null : val;
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Use this item's own images" />
            </SelectTrigger>
            <SelectContent>
              <input
                type="text"
                placeholder="Search menu items..."
                class="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                oninput={(e) => {
                  const searchTerm = e.currentTarget.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  const options = e.currentTarget.parentElement?.querySelectorAll('[role="option"]');
                  options?.forEach((option) => {
                    const text = (option.textContent?.toLowerCase() || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    option.classList.toggle('hidden', !text.includes(searchTerm));
                  });
                }}
                onclick={(e) => e.stopPropagation()}
                onkeydown={(e) => e.stopPropagation()}
              />
              <SelectItem value="">Use this item's own images</SelectItem>
              {#each availableMenuItems.filter(item => item.id !== menuItem?.id) as item}
                <SelectItem value={item.id}>{item.name}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
          <p class="text-xs text-gray-500 mt-1">
            Select another menu item to use its images. Leave empty to use this item's own images.
          </p>
        </div>
      </div>

      {#if !imageSourceMenuItemId}
        <ImageUpload menuItemId={menuItem.id} maxImages={5} disabled={isSubmitting} />
      {:else}
        <div class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          <p class="text-sm">
            This item is using images from: <strong>{availableMenuItems.find(i => i.id === imageSourceMenuItemId)?.name || 'Selected item'}</strong>
          </p>
          <p class="text-xs mt-1">
            Clear the image source selection above to manage this item's own images.
          </p>
        </div>
      {/if}

      <div>
        <label for="designVersion" class="block text-sm font-medium text-gray-700 mb-2">
          Design Version
        </label>
        <input
          id="designVersion"
          type="number"
          bind:value={designVersion}
          placeholder="e.g., 1, 2, 3..."
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

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
