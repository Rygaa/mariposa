<script lang="ts">
  import { trpc } from "../../../lib/trpc";
  import Button from "../../../lib/components/Button.svelte";
  import Input from "../../../lib/components/Input.svelte";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "../../../lib/shadcn/Dialog/index";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "../../../lib/shadcn/Select/index";
  import type { listMenuItems } from "../../../../../backend/src/router.types";
  import { onMount } from "svelte";

  let {
    isOpen = $bindable(false),
    onStockUpdated,
    onClose,
  }: {
    isOpen?: boolean;
    onStockUpdated?: () => void | Promise<void>;
    onClose?: () => void;
  } = $props();
  let isSubmitting = $state(false);
  let error = $state("");
  
  // Raw materials data
  let rawMaterials = $state<listMenuItems["menuItems"]>([]);
  let loadingMaterials = $state(false);
  
  // Selected material
  let selectedMaterial = $state<listMenuItems["menuItems"][0] | null>(null);
  let selectedMaterialId = $state("");
  
  // Stock location
  let stockLocation = $state<"in-house" | "in-shop">("in-house");
  
  // Buying prices
  let buyingPrices = $state<Array<{
    id: string;
    priceValue: number | null;
    unitValue: number | null;
    description: string | null;
    isTemplate: boolean;
  }>>([]);
  let loadingPrices = $state(false);

  // Update selected material when ID changes
  $effect(() => {
    if (selectedMaterialId) {
      const material = rawMaterials.find(m => m.id === selectedMaterialId);
      if (material && material !== selectedMaterial) {
        selectedMaterial = material;
        loadBuyingPrices();
      }
    }
  });

  onMount(() => {
    loadRawMaterials();
  });

  async function loadRawMaterials() {
    loadingMaterials = true;
    try {
      const result = await trpc.listAllMenuItems.query({
        type: ["RAW_MATERIAL"],
        limit: 1000,
      });
      if (result.success) {
        rawMaterials = result.menuItems;
      }
    } catch (err) {
      console.error("Failed to load raw materials:", err);
    }
    loadingMaterials = false;
  }

  async function loadBuyingPrices() {
    if (!selectedMaterial) return;
    
    loadingPrices = true;
    try {
      const result = await trpc.listItemPricesByMenuItem.query({
        menuItemId: selectedMaterial.id,
        priceType: "buying",
      });
      if (result.success) {
        buyingPrices = result.itemPrices.map((p: any) => ({
          id: p.id,
          priceValue: p.priceValue,
          unitValue: p.unitValue,
          description: p.description,
          isTemplate: p.isTemplate,
        }));
      }
    } catch (err) {
      console.error("Failed to load buying prices:", err);
    }
    loadingPrices = false;
  }



  async function handleAddPrice(priceValue: number, unitValue: number) {
    if (!selectedMaterial) return;
    
    isSubmitting = true;
    error = "";
    
    try {
      const result = await trpc.createItemPrice.mutate({
        menuItemId: selectedMaterial.id,
        priceValue,
        unitValue,
        multiplier: 1,
        priceType: "buying",
        isTemplate: false,
      });
      
      if (result.success) {
        await loadBuyingPrices();
      }
    } catch (err: any) {
      error = err.message || "Failed to add price";
      console.error("Failed to add price:", err);
    }
    
    isSubmitting = false;
  }

  async function handleRemovePrice(priceValue: number, unitValue: number) {
    if (!selectedMaterial) return;
    
    // Find the first non-template price that matches
    const priceToRemove = buyingPrices.find(
      (p) => 
        !p.isTemplate && 
        p.priceValue === priceValue && 
        p.unitValue === unitValue
    );
    
    if (!priceToRemove) {
      error = "No matching non-template price found";
      return;
    }
    
    isSubmitting = true;
    error = "";
    
    try {
      const result = await trpc.deleteItemPrice.mutate({
        id: priceToRemove.id,
      });
      
      if (result.success) {
        await loadBuyingPrices();
      }
    } catch (err: any) {
      error = err.message || "Failed to remove price";
      console.error("Failed to remove price:", err);
    }
    
    isSubmitting = false;
  }

  function resetForm() {
    selectedMaterial = null;
    selectedMaterialId = "";
    stockLocation = "in-house";
    buyingPrices = [];
    error = "";
  }

  function handleClose() {
    resetForm();
    isOpen = false;
    onClose?.();
  }

  export function open() {
    resetForm();
    isOpen = true;
  }

  // Get template prices (unique combinations)
  let templatePrices = $derived.by(() => {
    const templates = buyingPrices.filter((p) => p.isTemplate);
    // Group by priceValue and unitValue combination
    const uniqueMap = new Map<string, typeof templates[0]>();
    templates.forEach((t) => {
      const key = `${t.priceValue}-${t.unitValue}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, t);
      }
    });
    return Array.from(uniqueMap.values());
  });

  // Count non-template instances for each template
  function countNonTemplateInstances(priceValue: number | null, unitValue: number | null): number {
    return buyingPrices.filter(
      (p) => 
        !p.isTemplate && 
        p.priceValue === priceValue && 
        p.unitValue === unitValue
    ).length;
  }
</script>

<Dialog bind:open={isOpen}>
  <DialogContent class="max-w-2xl max-h-[90vh] !overflow-visible">
    <DialogHeader>
      <DialogTitle>Update Raw Material Stock</DialogTitle>
    </DialogHeader>

    <div class="space-y-6 py-4 max-h-[70vh] overflow-y-auto overflow-x-visible p-4">
      <!-- Material Selection -->
      <div class="space-y-2">
        <div class="text-sm font-medium">Select Material</div>
        <Select searchable bind:value={selectedMaterialId}>
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Choose a material..." />
          </SelectTrigger>
          <SelectContent class="max-h-60">
            {#each rawMaterials as material}
              <SelectItem value={material.id} searchLabel={material.name}>
                <div class="flex flex-col">
                  <span class="font-medium">{material.name}</span>
                  {#if material.unit}
                    <span class="text-xs text-gray-500">Unit: {material.unit}</span>
                  {/if}
                </div>
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
        
        {#if selectedMaterial}
          <div class="text-sm text-gray-600">
            Selected: <span class="font-medium">{selectedMaterial.name}</span>
            {#if selectedMaterial.unit}
              <span class="text-gray-500">({selectedMaterial.unit})</span>
            {/if}
          </div>
        {/if}
      </div>

      {#if selectedMaterial}
        <!-- Stock Location Selection -->
        <div class="space-y-2">
          <div class="text-sm font-medium">Stock Location</div>
          <div class="flex gap-2">
            <Button
              variant={stockLocation === "in-house" ? "primary" : "outline"}
              onclick={() => { stockLocation = "in-house"; }}
            >
              <span class="flex-1">In-House</span>
            </Button>
            <Button
              variant={stockLocation === "in-shop" ? "primary" : "outline"}
              onclick={() => { stockLocation = "in-shop"; }}
            >
              <span class="flex-1">In-Shop</span>
            </Button>
          </div>
        </div>

        <!-- Buying Prices -->
        <div class="space-y-2">
          <div class="text-sm font-medium">Buying Prices (Templates)</div>
          
          {#if loadingPrices}
            <div class="text-sm text-gray-500">Loading prices...</div>
          {:else if templatePrices.length === 0}
            <div class="text-sm text-gray-500">No template prices found for this material</div>
          {:else}
            <div class="space-y-3">
              {#each templatePrices as template}
                {@const count = countNonTemplateInstances(template.priceValue, template.unitValue)}
                <div class="flex items-center gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div class="flex-1">
                    <div class="font-medium">
                      {template.description || "Unnamed Price"}
                    </div>
                    <div class="text-sm text-gray-600">
                      Price: {template.priceValue} | Unit: {template.unitValue}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      Non-template instances: {count}
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onclick={() => handleRemovePrice(template.priceValue!, template.unitValue!)}
                      disabled={isSubmitting || count === 0}
                      class="w-8 h-8 p-0 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onclick={() => handleAddPrice(template.priceValue!, template.unitValue!)}
                      disabled={isSubmitting}
                      class="w-8 h-8 p-0 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Non-Template Buying Prices -->
        <div class="space-y-2">
          <div class="text-sm font-medium">Purchase Records (Non-Template)</div>
          
          {#if loadingPrices}
            <div class="text-sm text-gray-500">Loading...</div>
          {:else}
            {@const nonTemplatePrices = buyingPrices.filter(p => !p.isTemplate)}
            {#if nonTemplatePrices.length === 0}
              <div class="text-sm text-gray-500">No purchase records found</div>
            {:else}
              <div class="max-h-60 overflow-y-auto space-y-2">
                {#each nonTemplatePrices as price}
                  <div class="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white text-sm">
                    <div class="flex-1">
                      <span class="text-gray-700">{price.description || "Purchase"}</span>
                      <span class="text-gray-500 ml-2">
                        Price: {price.priceValue} | Unit: {price.unitValue}
                      </span>
                    </div>
                    <button
                      type="button"
                      onclick={async () => {
                        isSubmitting = true;
                        error = "";
                        try {
                          const result = await trpc.deleteItemPrice.mutate({ id: price.id });
                          if (result.success) {
                            await loadBuyingPrices();
                          }
                        } catch (err: any) {
                          error = err.message || "Failed to delete";
                        }
                        isSubmitting = false;
                      }}
                      disabled={isSubmitting}
                      aria-label="Delete purchase record"
                      class="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        {#if error}
          <div class="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        {/if}
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
