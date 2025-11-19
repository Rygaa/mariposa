<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "../../../lib/shadcn/Dialog/index";
  import type { listEatingTables } from "../../../../../backend/src/router.types";

  let {
    open = $bindable(false),
    eatingTables = [],
    selectedTableId = $bindable(""),
    onTableSelect,
  }: {
    open?: boolean;
    eatingTables: listEatingTables["eatingTables"];
    selectedTableId?: string;
    onTableSelect?: (tableId: string) => void;
  } = $props();

  function handleSelect(tableId: string) {
    selectedTableId = tableId;
    onTableSelect?.(tableId);
    open = false;
  }
</script>

<Dialog bind:open>
  <DialogContent class="max-w-2xl max-h-[80vh] overflow-hidden">
    <DialogHeader>
      <DialogTitle class="text-2xl">Sélectionner votre table</DialogTitle>
      <DialogDescription class="text-base">
        Choisissez la table où vous êtes installé
      </DialogDescription>
    </DialogHeader>

    <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {#each eatingTables as table (table.id)}
          <button
            onclick={() => handleSelect(table.id)}
            class="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 {selectedTableId === table.id
              ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-pink-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'}"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12 mb-3 {selectedTableId === table.id
                ? 'text-orange-500'
                : 'text-gray-400 group-hover:text-orange-400'}"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span
              class="font-bold text-lg {selectedTableId === table.id
                ? 'text-orange-600'
                : 'text-gray-700 group-hover:text-orange-500'}"
            >
              {table.name}
            </span>
            {#if table.isDefault}
              <span
                class="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full"
              >
                Défaut
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </DialogContent>
</Dialog>
