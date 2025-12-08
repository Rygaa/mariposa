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
    location?: "in-house" | "in-shop";
    createdAt?: Date;
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
        buyingPrices = result.itemPrices
          .map((p: any) => ({
            id: p.id,
            priceValue: p.priceValue,
            unitValue: p.unitValue,
            description: p.description,
            isTemplate: p.isTemplate,
            location: p.description?.includes("[in-shop]") ? "in-shop" : "in-house",
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          }))
          .sort((a: any, b: any) => a.createdAt!.getTime() - b.createdAt!.getTime()); // Sort by creation date
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
        description: stockLocation === "in-shop" ? `[in-shop]` : `[in-house]`,
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

  async function handleAddPricePerUnit(priceValue: number, unitValue: number) {
    if (!selectedMaterial) return;
    
    isSubmitting = true;
    error = "";
    
    try {
      // Calculate price for a single unit
      const pricePerUnit = priceValue / unitValue;
      
      const result = await trpc.createItemPrice.mutate({
        menuItemId: selectedMaterial.id,
        priceValue: pricePerUnit,
        unitValue: 1,
        multiplier: 1,
        priceType: "buying",
        isTemplate: false,
        description: stockLocation === "in-shop" ? `[in-shop]` : `[in-house]`,
      });
      
      if (result.success) {
        await loadBuyingPrices();
      }
    } catch (err: any) {
      error = err.message || "Failed to add price per unit";
      console.error("Failed to add price per unit:", err);
    }
    
    isSubmitting = false;
  }

  async function handleRemovePrice(priceValue: number, unitValue: number) {
    if (!selectedMaterial) return;
    
    // Find any non-template price in the selected location with enough units
    const priceToUpdate = buyingPrices.find(
      (p) => 
        !p.isTemplate && 
        p.location === stockLocation &&
        (p.unitValue || 0) >= unitValue
    );
    
    if (!priceToUpdate) {
      error = "No purchase record found with enough units";
      return;
    }
    
    isSubmitting = true;
    error = "";
    
    try {
      const newUnitValue = (priceToUpdate.unitValue || 0) - unitValue;
      
      if (newUnitValue <= 0) {
        // Delete the record if units would be 0 or less
        const result = await trpc.deleteItemPrice.mutate({
          id: priceToUpdate.id,
        });
        
        if (result.success) {
          await loadBuyingPrices();
        }
      } else {
        // Delete old record and create new one with updated units
        const pricePerUnit = (priceToUpdate.priceValue || 0) / (priceToUpdate.unitValue || 1);
        const newPriceValue = pricePerUnit * newUnitValue;
        
        const deleteResult = await trpc.deleteItemPrice.mutate({
          id: priceToUpdate.id,
        });
        
        if (deleteResult.success) {
          const createResult = await trpc.createItemPrice.mutate({
            menuItemId: selectedMaterial.id,
            priceValue: newPriceValue,
            unitValue: newUnitValue,
            multiplier: 1,
            priceType: "buying",
            isTemplate: false,
            description: stockLocation === "in-shop" ? `[in-shop]` : `[in-house]`,
          });
          
          if (createResult.success) {
            await loadBuyingPrices();
          }
        }
      }
    } catch (err: any) {
      error = err.message || "Failed to remove units";
      console.error("Failed to remove units:", err);
    }
    
    isSubmitting = false;
  }

  async function handleRemovePricePerUnit(priceValue: number, unitValue: number) {
    if (!selectedMaterial) return;
    
    // Find any non-template price in the selected location with at least 1 unit
    const priceToUpdate = buyingPrices.find(
      (p) => 
        !p.isTemplate && 
        p.location === stockLocation &&
        (p.unitValue || 0) >= 1
    );
    
    if (!priceToUpdate) {
      error = "No purchase record found with units to remove";
      return;
    }
    
    isSubmitting = true;
    error = "";
    
    try {
      const newUnitValue = (priceToUpdate.unitValue || 0) - 1;
      
      if (newUnitValue <= 0) {
        // Delete the record if units would be 0 or less
        const result = await trpc.deleteItemPrice.mutate({
          id: priceToUpdate.id,
        });
        
        if (result.success) {
          await loadBuyingPrices();
        }
      } else {
        // Delete old record and create new one with updated units
        const pricePerUnit = (priceToUpdate.priceValue || 0) / (priceToUpdate.unitValue || 1);
        const newPriceValue = pricePerUnit * newUnitValue;
        
        const deleteResult = await trpc.deleteItemPrice.mutate({
          id: priceToUpdate.id,
        });
        
        if (deleteResult.success) {
          const createResult = await trpc.createItemPrice.mutate({
            menuItemId: selectedMaterial.id,
            priceValue: newPriceValue,
            unitValue: newUnitValue,
            multiplier: 1,
            priceType: "buying",
            isTemplate: false,
            description: stockLocation === "in-shop" ? `[in-shop]` : `[in-house]`,
          });
          
          if (createResult.success) {
            await loadBuyingPrices();
          }
        }
      }
    } catch (err: any) {
      error = err.message || "Failed to remove per-unit";
      console.error("Failed to remove per-unit:", err);
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
        p.unitValue === unitValue &&
        p.location === stockLocation
    ).length;
  }

  // Calculate totals by location
  let totalInHouse = $derived.by(() => {
    return buyingPrices
      .filter(p => !p.isTemplate && p.location === "in-house")
      .reduce((sum, p) => sum + (p.priceValue || 0), 0);
  });

  let totalInShop = $derived.by(() => {
    return buyingPrices
      .filter(p => !p.isTemplate && p.location === "in-shop")
      .reduce((sum, p) => sum + (p.priceValue || 0), 0);
  });

  let unitsInHouse = $derived.by(() => {
    return buyingPrices
      .filter(p => !p.isTemplate && p.location === "in-house")
      .reduce((sum, p) => sum + (p.unitValue || 0), 0);
  });

  let unitsInShop = $derived.by(() => {
    return buyingPrices
      .filter(p => !p.isTemplate && p.location === "in-shop")
      .reduce((sum, p) => sum + (p.unitValue || 0), 0);
  });
</script>

<Dialog bind:open={isOpen}>
  <DialogContent class="w-full h-full !overflow-visible">
    <DialogHeader>
      <DialogTitle>Update Raw Material Stock</DialogTitle>
    </DialogHeader>

    <div class="space-y-6 py-4 h-full overflow-y-auto overflow-x-visible p-4">
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
              <div class="flex flex-col items-start">
                <span class="font-medium">In-House</span>
                <span class="text-xs">{unitsInHouse.toFixed(2)} units | Total: {totalInHouse.toFixed(2)}</span>
              </div>
            </Button>
            <Button
              variant={stockLocation === "in-shop" ? "primary" : "outline"}
              onclick={() => { stockLocation = "in-shop"; }}
            >
              <div class="flex flex-col items-start">
                <span class="font-medium">In-Shop</span>
                <span class="text-xs">{unitsInShop.toFixed(2)} units | Total: {totalInShop.toFixed(2)}</span>
              </div>
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
                {@const perUnitPrice = template.unitValue ? (template.priceValue! / template.unitValue).toFixed(2) : 'N/A'}
                <div class="flex flex-col gap-3 p-4 border border-gray-300 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex-1">
                    <div class="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span class="text-gray-500 text-xs font-medium">Price</span>
                        <div class="text-gray-900 font-semibold">{template.priceValue}</div>
                      </div>
                      <div>
                        <span class="text-gray-500 text-xs font-medium">Units</span>
                        <div class="text-gray-900 font-semibold">{template.unitValue}</div>
                      </div>
                      <div>
                        <span class="text-gray-500 text-xs font-medium">Per Unit</span>
                        <div class="text-gray-900 font-semibold">{perUnitPrice}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onclick={() => handleAddPrice(template.priceValue!, template.unitValue!)}
                      disabled={isSubmitting}
                      class="flex-1 px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
                      title="Add purchase (whole units)"
                    >
                      + Whole ({template.unitValue} units)
                    </button>
                    <button
                      type="button"
                      onclick={() => handleAddPricePerUnit(template.priceValue!, template.unitValue!)}
                      disabled={isSubmitting}
                      class="flex-1 px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
                      title="Add purchase (per unit)"
                    >
                      + Per Unit (1 unit)
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Non-Template Buying Prices -->
        <div class="space-y-2">
          <div class="text-sm font-medium">Purchase Records</div>
          
          {#if loadingPrices}
            <div class="text-sm text-gray-500">Loading...</div>
          {:else}
            {@const nonTemplatePrices = buyingPrices.filter(p => !p.isTemplate && p.location === stockLocation)}
            {#if nonTemplatePrices.length === 0}
              <div class="text-sm text-gray-500 p-4 border border-gray-200 rounded-lg bg-gray-50">No purchase records found</div>
            {:else}
              <div class="max-h-60 overflow-y-auto space-y-2">
                {#each nonTemplatePrices as price}
                  {@const perUnitPrice = price.unitValue ? (price.priceValue! / price.unitValue).toFixed(2) : 'N/A'}
                  <div class="flex flex-col gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                    <div class="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span class="text-gray-500 text-xs font-medium">Total Price</span>
                        <div class="text-gray-900 font-semibold">{price.priceValue}</div>
                      </div>
                      <div>
                        <span class="text-gray-500 text-xs font-medium">Units</span>
                        <div class="text-gray-900 font-semibold">{price.unitValue}</div>
                      </div>
                      <div>
                        <span class="text-gray-500 text-xs font-medium">Per Unit</span>
                        <div class="text-gray-900 font-semibold">{perUnitPrice}</div>
                      </div>
                    </div>
                    
                    <div class="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div class="text-xs text-gray-500">
                        {price.description || "Purchase"}
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          onclick={async () => {
                            isSubmitting = true;
                            error = "";
                            try {
                              const newUnitValue = (price.unitValue || 0) - 1;
                              
                              if (newUnitValue <= 0) {
                                const result = await trpc.deleteItemPrice.mutate({ id: price.id });
                                if (result.success) {
                                  await loadBuyingPrices();
                                }
                              } else {
                                const pricePerUnit = (price.priceValue || 0) / (price.unitValue || 1);
                                price.unitValue = newUnitValue;
                                price.priceValue = pricePerUnit * newUnitValue;
                                
                                const deleteResult = await trpc.deleteItemPrice.mutate({ id: price.id });
                                if (deleteResult.success) {
                                  const createResult = await trpc.createItemPrice.mutate({
                                    menuItemId: selectedMaterial!.id,
                                    priceValue: price.priceValue,
                                    unitValue: price.unitValue,
                                    multiplier: 1,
                                    priceType: "buying",
                                    isTemplate: false,
                                    description: price.description || (stockLocation === "in-shop" ? `[in-shop]` : `[in-house]`),
                                  });
                                  if (createResult.success) {
                                    price.id = createResult.itemPrice.id;
                                  }
                                }
                              }
                            } catch (err: any) {
                              error = err.message || "Failed to remove per unit";
                              await loadBuyingPrices();
                            }
                            isSubmitting = false;
                          }}
                          disabled={isSubmitting}
                          title="Remove 1 unit"
                          class="px-3 py-1.5 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                        >
                          - 1 Unit
                        </button>
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
                          title="Delete entire purchase record"
                          class="px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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
