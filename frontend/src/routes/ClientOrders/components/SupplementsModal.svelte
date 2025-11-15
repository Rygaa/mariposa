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

  let {
    open = $bindable(false),
    menuItem,
    onAddSupplement,
  }: {
    open?: boolean;
    menuItem: any;
    onAddSupplement?: (supplementId: string) => void | Promise<void>;
  } = $props();

  let selectedSupplements = $state<string[]>([]);

  function toggleSupplement(supplementId: string) {
    if (selectedSupplements.includes(supplementId)) {
      selectedSupplements = selectedSupplements.filter((id) => id !== supplementId);
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
  <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Ajouter des suppléments</DialogTitle>
      <DialogDescription>
        Sélectionnez les suppléments pour {menuItem.name}
      </DialogDescription>
    </DialogHeader>

    <div class="px-6 py-4">
      {#if supplements.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each supplements as supplement (supplement.id)}
            {@const isSelected = selectedSupplements.includes(supplement.id)}
            <button
              onclick={() => toggleSupplement(supplement.id)}
              class="flex items-center justify-between p-4 border rounded-lg transition-all duration-200 {isSelected
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'}"
            >
              <div class="text-left">
                <h4 class="font-medium text-gray-900">{supplement.name}</h4>
                {#if supplement.price}
                  <p class="text-sm text-orange-600 font-semibold">
                    +{supplement.price} DZD
                  </p>
                {/if}
              </div>
              <div
                class="w-5 h-5 rounded border-2 flex items-center justify-center {isSelected
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-300'}"
              >
                {#if isSelected}
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="text-center py-8">
          <p class="text-gray-500">Aucun supplément disponible pour cet article</p>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleClose}>Annuler</Button>
      <Button onclick={handleConfirm} disabled={selectedSupplements.length === 0}>
        Confirmer ({selectedSupplements.length})
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
