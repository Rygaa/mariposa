<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "../../../lib/shadcn/Dialog/index";
  import Button from "../../../lib/components/Button.svelte";
  import Input from "../../../lib/components/Input.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import { trpc } from "../../../lib/trpc";
  import type { getMenuItemById } from "../../../../../backend/src/router.types";
  import { onMount } from "svelte";

  type LinkData = {
    quantity: string;
    producedQuantity: string;
  };

  type NewItemSelection = LinkData & {
    selected: boolean;
  };

  type MenuItemType =
    | "MENU_ITEM"
    | "RECIPE"
    | "RAW_MATERIAL"
    | "SUPPLEMENT"
    | "MENU_ITEM_OPTION";

  let {
    menuItem,
    isOpen = $bindable(false),
    onLinkCreated,
    filterByType = "MENU_ITEM_OPTION",
    title,
    description,
  }: {
    menuItem: getMenuItemById["menuItem"];
    isOpen?: boolean;
    onLinkCreated?: () => void | Promise<void>;
    filterByType?: MenuItemType;
    title?: string;
    description?: string;
  } = $props();

  // State for new item selections
  let newItemSelections = $state<Record<string, NewItemSelection>>({});

  // State for existing link updates
  let linkUpdates = $state<Record<string, LinkData>>({});

  // Available items and existing links
  let availableMenuItems = $state<getMenuItemById["menuItem"][]>([]);
  let existingLinks = $state<any[]>([]);
  let searchQuery = $state("");
  let categories = $state<Array<{ id: string; name: string }>>([]);
  let selectedCategoryId = $state<string>("all");

  // Helper function to normalize text for search (removes accents and converts to lowercase)
  function normalizeText(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  // Computed: Filter items by specified type, search query, and category
  const filteredMenuItems = $derived(
    availableMenuItems
      .filter((item) => item.type?.includes(filterByType))
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const normalizedQuery = normalizeText(searchQuery);
        const normalizedName = normalizeText(item.name || "");
        return normalizedName.includes(normalizedQuery);
      })
      .filter((item) => {
        if (selectedCategoryId === "all") return true;
        return item.categoryId === selectedCategoryId;
      })
  );

  // Computed: Display texts with defaults
  const modalTitle = $derived(
    title ??
      `Manage ${filterByType.replace(/_/g, " ").toLowerCase()}s for ${menuItem.name}`
  );

  const modalDescription = $derived(
    description ??
      `Connect ${filterByType.replace(/_/g, " ").toLowerCase()}s to build your menu structure`
  );

  // Computed: Check if there are unsaved changes
  const hasUnsavedChanges = $derived(
    Object.values(newItemSelections).some((item) => item.selected) ||
      Object.keys(linkUpdates).length > 0
  );

  // Load data only when modal is opened
  $effect(() => {
    if (isOpen) {
      loadExistingLinks();
      loadAvailableMenuItems();
      loadCategories();
    }
  });

  async function loadExistingLinks() {
    const result = await trpc.listMenuItemSubMenuItems.query({
      parentMenuItemId: menuItem.id,
    });

    if (result.success) {
      existingLinks = result.subMenuItems.map((link: any) => ({
        ...link,
        linkType: "subMenuItem",
      }));
    }

    // For SUPPLEMENT and MENU_ITEM_OPTION types, also load reverse relationships (where this item is the child)
    // This happens when MENU_ITEMs link TO this supplement/option
    if ((menuItem.type?.includes("SUPPLEMENT") || menuItem.type?.includes("MENU_ITEM_OPTION")) && filterByType === "MENU_ITEM") {
      const reverseResult = await trpc.listMenuItemSubMenuItems.query({
        subMenuItemId: menuItem.id,
      });
      
      if (reverseResult.success) {
        existingLinks.push(...reverseResult.subMenuItems.map((link: any) => ({
          ...link,
          linkType: "subMenuItem",
        })));
      }
    }
  }

  async function loadAvailableMenuItems() {
    const result = await trpc.listAllMenuItems.query({
      excludeIds: [menuItem.id],
      type: [filterByType],
    });


    if (result.success) {
      availableMenuItems = result.menuItems;
    }
  }

  async function loadCategories() {
    const result = await trpc.listCategories.query({});
    if (result.success) {
      categories = result.categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
      }));
    }
  }

  function resetAndClose() {
    newItemSelections = {};
    linkUpdates = {};
    isOpen = false;
  }

  function toggleItemSelection(itemId: string) {
    const currentSelection = newItemSelections[itemId];

    if (!currentSelection) {
      newItemSelections[itemId] = {
        selected: true,
        quantity: "1",
        producedQuantity: "1",
      };
    } else {
      newItemSelections[itemId].selected = !currentSelection.selected;
    }
  }

  function isValidQuantity(value: string): boolean {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }

  function parseProducedQuantity(value: string): number | undefined {
    const num = parseFloat(value);
    return num > 0 ? num : undefined;
  }

  async function createNewLinks() {
    const selectedItems = Object.entries(newItemSelections).filter(
      ([_, data]) => data.selected && isValidQuantity(data.quantity)
    );

    for (const [itemId, data] of selectedItems) {
      // When linking from a SUPPLEMENT to MENU_ITEMs, swap parent/child
      // MENU_ITEM should always be the parent, SUPPLEMENT should be the child
      const isSupplementLinkingToMenuItem = 
        menuItem.type?.includes("SUPPLEMENT") && filterByType === "MENU_ITEM";

      await trpc.createMenuItemSubMenuItem.mutate({
        parentMenuItemId: isSupplementLinkingToMenuItem ? itemId : menuItem.id,
        subMenuItemId: isSupplementLinkingToMenuItem ? menuItem.id : itemId,
        quantity: parseFloat(data.quantity),
        producedMenuItemsQuantity: parseProducedQuantity(data.producedQuantity),
      });
    }
  }

  async function updateExistingLinks() {
    for (const [linkId, data] of Object.entries(linkUpdates)) {
      if (!isValidQuantity(data.quantity)) continue;

      await trpc.updateMenuItemSubMenuItem.mutate({
        id: linkId,
        quantity: parseFloat(data.quantity),
        producedMenuItemsQuantity: parseProducedQuantity(data.producedQuantity),
      });
    }
  }

  async function handleSaveAll() {
    await createNewLinks();
    await updateExistingLinks();
    await loadExistingLinks();

    newItemSelections = {};
    linkUpdates = {};
    await onLinkCreated?.();
    isOpen = false;
  }

  async function handleDeleteLink(linkId: string) {
    await trpc.deleteMenuItemSubMenuItem.mutate({ id: linkId });
    await loadExistingLinks();
    await onLinkCreated?.();
  }

  function updateLinkQuantity(
    linkId: string,
    quantity: string,
    producedQuantity?: string
  ) {
    const currentUpdate = linkUpdates[linkId];

    linkUpdates[linkId] = {
      quantity,
      producedQuantity:
        producedQuantity ?? currentUpdate?.producedQuantity ?? "1",
    };
  }

  function updateLinkProducedQuantity(
    linkId: string,
    producedQuantity: string,
    quantity?: string
  ) {
    const currentUpdate = linkUpdates[linkId];

    linkUpdates[linkId] = {
      quantity: quantity ?? currentUpdate?.quantity ?? "1",
      producedQuantity,
    };
  }

  // Helper functions to determine which fields to show based on what we're linking
  // Only show quantity fields when linking RAW_MATERIAL or RECIPE
  function shouldShowQuantity(): boolean {
    // Show quantity ONLY when linking RAW_MATERIAL or RECIPE
    return filterByType === "RAW_MATERIAL" || filterByType === "RECIPE";
  }

  function shouldShowProducedQuantity(): boolean {
    // Show produced quantity ONLY when linking RECIPE
    return filterByType === "RECIPE";
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) resetAndClose();
  }}
>
  <DialogContent class="w-screen h-screen max-w-full max-h-full flex flex-col">
    <DialogHeader>
      <DialogTitle class="text-lg">{modalTitle}</DialogTitle>
      <p class="text-sm text-gray-500 mt-1">{modalDescription}</p>
    </DialogHeader>

    <div class="px-4 py-3 border-b space-y-3">
      <div class="relative">
        <Input
          type="text"
          bind:value={searchQuery}
          placeholder="Search items..."
        />
        {#if searchQuery}
          <button
            onclick={() => (searchQuery = "")}
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            title="Clear search"
          >
            <Icon iconName="close" class="w-4 h-4 text-gray-500" />
          </button>
        {/if}
      </div>
      
      <div class="flex items-center gap-2">
        <label for="category-filter" class="text-sm font-medium text-gray-700 whitespace-nowrap">Category:</label>
        <select
          id="category-filter"
          bind:value={selectedCategoryId}
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {#each categories as category}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto space-y-2 px-4 py-2">
      {#each filteredMenuItems as item}
        {@const existingLink = existingLinks.find(
          (link) =>
            link.linkType === "subMenuItem" && 
            (link.subMenuItemId === item.id || link.parentMenuItemId === item.id)
        )}
        {@const isLinked = !!existingLink}
        {@const itemSelection = newItemSelections[item.id]}
        {@const isSelected = itemSelection?.selected || false}
        {@const shouldHighlight = isLinked || isSelected}

        <div
          class="w-full p-3 rounded-lg border-2 transition-all {shouldHighlight
            ? 'border-purple-400 bg-purple-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300'}"
        >
          <div class="flex items-start gap-3">
            {#if !isLinked}
              <input
                type="checkbox"
                checked={isSelected}
                onchange={() => toggleItemSelection(item.id)}
                class="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            {/if}

            <div class="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>

            <div class="flex-1 min-w-0">
              <div
                class="font-medium text-sm {shouldHighlight
                  ? 'text-purple-700'
                  : 'text-gray-900'} truncate"
              >
                {item.name}
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                {item.type?.join(", ")}
              </div>

              {#if isLinked && existingLink}
                {@const linkUpdate = linkUpdates[existingLink.id]}
                {@const showQuantity = shouldShowQuantity()}
                {@const showProducedQuantity = shouldShowProducedQuantity()}
                {#if showQuantity || showProducedQuantity}
                  <div class="mt-2 space-y-2">
                    {#if showQuantity}
                      <Input
                        label="Quantity"
                        type="number"
                        value={linkUpdate?.quantity ?? existingLink.quantity}
                        oninput={(e) => {
                          const target = e.target as HTMLInputElement;
                          updateLinkQuantity(
                            existingLink.id,
                            target.value,
                            linkUpdate?.producedQuantity ??
                              existingLink.producedMenuItemsQuantity
                          );
                        }}
                        placeholder="1"
                      />
                    {/if}
                    {#if showProducedQuantity}
                      <Input
                        label="Produced Quantity"
                        type="number"
                        value={linkUpdate?.producedQuantity ??
                          existingLink.producedMenuItemsQuantity ??
                          "1"}
                        oninput={(e) => {
                          const target = e.target as HTMLInputElement;
                          updateLinkProducedQuantity(
                            existingLink.id,
                            target.value,
                            linkUpdate?.quantity ?? existingLink.quantity
                          );
                        }}
                        placeholder="1"
                      />
                    {/if}
                  </div>
                {/if}
              {/if}

              {#if isSelected && !isLinked}
                {@const showQuantity = shouldShowQuantity()}
                {@const showProducedQuantity = shouldShowProducedQuantity()}
                {#if showQuantity || showProducedQuantity}
                  <div class="mt-2 space-y-2">
                    {#if showQuantity}
                      <Input
                        label="Quantity"
                        type="number"
                        bind:value={itemSelection.quantity}
                        placeholder="1"
                      />
                    {/if}
                    {#if showProducedQuantity}
                      <Input
                        label="Produced Quantity"
                        type="number"
                        bind:value={itemSelection.producedQuantity}
                        placeholder="1"
                      />
                    {/if}
                  </div>
                {/if}
              {/if}
            </div>

            {#if isLinked && existingLink}
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  handleDeleteLink(existingLink.id);
                }}
                class="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-all flex-shrink-0"
                title="Remove link"
              >
                <Icon iconName="close" class="w-4 h-4" />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <DialogFooter>
      <Button onclick={handleSaveAll}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
