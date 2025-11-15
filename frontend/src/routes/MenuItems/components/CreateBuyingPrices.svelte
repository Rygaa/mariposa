<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "../../../lib/shadcn/Dialog/index";
  import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
  } from "../../../lib/shadcn/Tabs/index";
  import DataDisplayer from "../../../lib/shadcn/DataDisplayer.svelte";
  import Button from "../../../lib/components/Button.svelte";
  import Input from "../../../lib/components/Input.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";
  import type { listItemPricesByMenuItem } from "../../../../../backend/src/router.types";
  import Card from "../../../lib/shadcn/Card/Card.svelte";
  import CardContent from "../../../lib/shadcn/Card/CardContent.svelte";
  import CardHeader from "../../../lib/shadcn/Card/CardHeader.svelte";
  import AvailableHeightContainer from "../../../lib/components/AvailableHeightContainer.svelte";

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

  let sellingPrices = $state<listItemPricesByMenuItem["itemPrices"]>([]);
  let buyingPrices = $state<listItemPricesByMenuItem["itemPrices"]>([]);
  let isLoading = $state(false);
  let error = $state("");
  let activeTab = $state<"selling" | "buying">("selling");

  // Form state
  let priceValue = $state("");
  let unitValue = $state("");
  let multiplier = $state("");
  let description = $state("");
  let isSubmitting = $state(false);

  $effect(() => {
    if (isOpen) {
      loadPrices();
    }
  });

  async function loadPrices() {
    isLoading = true;
    try {
      const sellingResult = await trpc.listItemPricesByMenuItem.query({
        menuItemId,
        priceType: "selling",
      });
      if (sellingResult.success) {
        sellingPrices = sellingResult.itemPrices;
      }

      const buyingResult = await trpc.listItemPricesByMenuItem.query({
        menuItemId,
        priceType: "buying",
      });
      if (buyingResult.success) {
        buyingPrices = buyingResult.itemPrices;
      }
    } catch (err: any) {
      error = err.message || "Failed to load prices";
    }
    isLoading = false;
  }

  function resetForm() {
    priceValue = "";
    unitValue = "";
    multiplier = "";
    description = "";
    error = "";
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    error = "";

    if (!priceValue.trim()) {
      error = "Price value is required";
      return;
    }

    const parsedPrice = parseFloat(priceValue);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      error = "Price must be a positive number";
      return;
    }

    isSubmitting = true;

    try {
      const result = await trpc.createItemPrice.mutate({
        menuItemId,
        priceValue: parsedPrice,
        unitValue: unitValue ? parseFloat(unitValue) : undefined,
        multiplier: multiplier ? parseFloat(multiplier) : 1,
        description: description || undefined,
        priceType: activeTab,
      });

      if (result.success) {
        resetForm();
        await loadPrices();
      }
    } catch (err: any) {
      error = err.message || "Failed to create price";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete(priceId: string) {
    if (!confirm("Are you sure you want to delete this price?")) {
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
  <DialogContent class="max-w-2xl overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Manage Buying Prices - {menuItemName}</DialogTitle>
      <DialogDescription>
        Create buying selling for this item
      </DialogDescription>
    </DialogHeader>

    {#if error}
      <div
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
      >
        {error}
      </div>
    {/if}
    <div class="flex h-full flex-col p-4 gap-4">
      <Input
        label="Price Value"
        type="number"
        bind:value={priceValue}
        placeholder="0.00"
        required
      />

      <Input
        label="Unit Value"
        type="number"
        bind:value={unitValue}
        placeholder="Optional"
      />

      <Input
        label="Multiplier"
        type="number"
        bind:value={multiplier}
        placeholder="Optional"
      />

      <Input
        label="Description"
        type="text"
        bind:value={description}
        placeholder="Optional description"
      />
    </div>

    <DialogFooter>
      <Button variant="outline" fullWidth onclick={handleClose}>Close</Button>

      <Button
        text={isSubmitting ? "Creating..." : "Create"}
        variant="primary"
        fullWidth
        loading={isSubmitting}
        onclick={handleSubmit}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
