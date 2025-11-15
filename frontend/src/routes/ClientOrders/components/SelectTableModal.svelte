<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "../../../lib/shadcn/Dialog/index";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "../../../lib/shadcn/Select/index";
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

  function handleSelect(value: string) {
    selectedTableId = value;
    onTableSelect?.(value);
    open = false;
  }
</script>

<Dialog bind:open>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Sélectionner une table</DialogTitle>
      <DialogDescription>
        Choisissez une table pour commencer votre commande
      </DialogDescription>
    </DialogHeader>

    <div class="px-6 py-4">
      <Select value={selectedTableId} onValueChange={handleSelect}>
        <SelectTrigger class="w-full">
          <SelectValue placeholder="-- Choisissez une table --" />
        </SelectTrigger>
        <SelectContent>
          {#each eatingTables as table (table.id)}
            <SelectItem value={table.id}>{table.name}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>
  </DialogContent>
</Dialog>
