<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "../../../lib/shadcn/Dialog/index";
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";
  import type { listItemPricesByMenuItem } from "../../../../../backend/src/router.types";

  let {
    isOpen = $bindable(false),
    menuItemId,
    menuItemName,
    onClose,
  }: {
    isOpen: boolean;
    menuItemId: string;
    menuItemName: string;
    onClose: () => void;
  } = $props();

  let buyingPrices = $state<listItemPricesByMenuItem["itemPrices"]>([]);
  let isLoading = $state(false);
  let error = $state("");

  $effect(() => {
    if (isOpen) {
      loadPrices();
    }
  });

  async function loadPrices() {
    isLoading = true;
    error = "";
    try {
      const result = await trpc.listItemPricesByMenuItem.query({
        menuItemId,
        priceType: "buying",
      });
      if (result.success) {
        buyingPrices = result.itemPrices;
      }
    } catch (err: any) {
      error = err.message || "Failed to load buying prices";
    }
    isLoading = false;
  }

  function handleClose() {
    onClose();
  }

  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleDelete(priceId: string) {
    if (!confirm("Are you sure you want to delete this buying price?")) {
      return;
    }

    try {
      const result = await trpc.deleteItemPrice.mutate({ id: priceId });
      if (result.success) {
        await loadPrices();
      }
    } catch (err: any) {
      error = err.message || "Failed to delete price";
    }
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) handleClose();
  }}
>
  <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
    <DialogHeader>
      <DialogTitle>Buying Prices History - {menuItemName}</DialogTitle>
      <DialogDescription>
        View all buying prices for this item
      </DialogDescription>
    </DialogHeader>

    {#if error}
      <div
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
      >
        {error}
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-4">
      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="text-gray-500">Loading buying prices...</div>
        </div>
      {:else if buyingPrices.length === 0}
        <div class="flex flex-col items-center justify-center py-12">
          <Icon iconName="money" size="12" class="fill-gray-300 mb-4" />
          <p class="text-gray-500">No buying prices found</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each buyingPrices as price}
            <div
              class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 space-y-2">
                  <div class="flex items-center gap-4">
                    <div>
                      <span class="text-sm text-gray-600">Price Value:</span>
                      <span class="ml-2 font-semibold text-lg text-gray-900">
                        ${price.priceValue.toFixed(2)}
                      </span>
                    </div>
                    {#if price.unitValue}
                      <div>
                        <span class="text-sm text-gray-600">Unit Value:</span>
                        <span class="ml-2 font-medium text-gray-900">
                          {price.unitValue}
                        </span>
                      </div>
                    {/if}
                    {#if price.multiplier && price.multiplier !== 1}
                      <div>
                        <span class="text-sm text-gray-600">Multiplier:</span>
                        <span class="ml-2 font-medium text-gray-900">
                          ×{price.multiplier}
                        </span>
                      </div>
                    {/if}
                  </div>

                  {#if price.description}
                    <div>
                      <span class="text-sm text-gray-600">Description:</span>
                      <span class="ml-2 text-sm text-gray-900">
                        {price.description}
                      </span>
                    </div>
                  {/if}

                  <div class="text-xs text-gray-500">
                    Created: {formatDate(price.createdAt)}
                  </div>
                </div>

                <button
                  onclick={() => handleDelete(price.id)}
                  class="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete price"
                >
                  <Icon iconName="trash" size="4" class="fill-red-600" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="border-t pt-4 px-4 pb-4">
      <Button variant="outline" fullWidth onclick={handleClose}>Close</Button>
    </div>
  </DialogContent>
</Dialog>
