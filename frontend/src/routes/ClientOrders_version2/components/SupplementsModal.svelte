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

  let {
    open = $bindable(false),
    menuItem,
    onAddSupplement,
    fromColor = "#DFA1CD",
    toColor = "#C77DB5",
  }: {
    open?: boolean;
    menuItem: any;
    onAddSupplement?: (supplementId: string) => void | Promise<void>;
    fromColor?: string;
    toColor?: string;
  } = $props();

  let selectedSupplements = $state<string[]>([]);

  function toggleSupplement(supplementId: string) {
    if (selectedSupplements.includes(supplementId)) {
      selectedSupplements = selectedSupplements.filter(
        (id) => id !== supplementId
      );
    } else {
      selectedSupplements = [...selectedSupplements, supplementId];
    }
  }

  async function handleConfirm() {
    for (const supplementId of selectedSupplements) {
      await onAddSupplement?.(supplementId);
    }
    selectedSupplements = [];
    open = false;
  }

  function handleClose() {
    selectedSupplements = [];
    open = false;
  }

  // Get supplements from subMenuItems that are of type SUPPLEMENT
  const supplements = $derived(
    menuItem.subMenuItems
      ?.filter((subMenuItem: any) => subMenuItem?.type?.includes("SUPPLEMENT"))
      .map((subMenuItem: any) => subMenuItem) || []
  );
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
  <DialogContent class="max-w-3xl max-h-[85vh] overflow-hidden">
    <DialogHeader class="border-b border-gray-200 pb-4">
      <div
        class="text-2xl bg-gradient-to-r bg-clip-text text-transparent font-bold"
        style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
      >
        Ajouter un supplément pour {menuItem.name}
      </div>
    </DialogHeader>
    <div class="px-4 py-4 max-h-[55vh] overflow-y-auto">
      {#if supplements.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each supplements as supplement (supplement.id)}
            {@const isSelected = selectedSupplements.includes(supplement.id)}
            <button
              onclick={() => toggleSupplement(supplement.id)}
              class="group relative flex items-center gap-4 p-5 border-2 rounded-2xl transition-all duration-300 hover:scale-[1.02] {isSelected
                ? 'shadow-lg'
                : 'border-gray-200 bg-white hover:shadow-md'}"
              style={isSelected
                ? `border-color: ${fromColor}; background-image: linear-gradient(135deg, ${fromColor}15, ${toColor}15);`
                : ""}
            >
              <div class="text-left flex-1">
                <h4 class="font-bold text-gray-900 text-lg mb-1">
                  {supplement.name}
                </h4>
                {#if supplement.description}
                  <p class="text-sm text-gray-400 mb-2">
                    {supplement.description}
                  </p>
                {/if}
                {#if supplement.price}
                  <p
                    class="font-bold bg-gradient-to-r bg-clip-text text-transparent"
                    style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
                  >
                    +{supplement.price} DZD
                  </p>
                {/if}
              </div>
              <div
                class="w-8 h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center {isSelected
                  ? 'scale-110'
                  : 'border-gray-300 bg-white'}"
                style={isSelected
                  ? `border-color: ${fromColor}; background-image: linear-gradient(to right, ${fromColor}, ${toColor});`
                  : ""}
              >
                {#if isSelected}
                  <Icon iconName="check" class="fill-white" size="4" />
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="text-center py-12">
          <div class="flex justify-center mb-4">
            <Icon iconName="empty" class="text-gray-300" size="16" />
          </div>
          <p class="text-gray-500 text-lg">Aucune option disponible</p>
        </div>
      {/if}
    </div>

    <div class="mb-4 mx-4">
      <button 
        onclick={handleConfirm}
        disabled={selectedSupplements.length === 0}
        class="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
      >
        Ajouter ({selectedSupplements.length})
      </button>
    </div>
  </DialogContent>
</Dialog>
