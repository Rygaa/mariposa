<script lang="ts">
  import type { getEatingTableById } from "../../../../../backend/src/router.types";
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import ClickableDiv from "../../../lib/shadcn/ClickableDiv.svelte";
  import {
    Dropdown,
    DropdownItem,
    DropdownSeparator,
  } from "../../../lib/shadcn/Dropdown";
  import DeleteEatingTableModal from "./DeleteEatingTableModal.svelte";
  import UpdateEatingTableModal from "./UpdateEatingTableModal.svelte";

  let {
    table,
    onEatingTablesChanged,
  }: {
    table: getEatingTableById["eatingTable"];
    onEatingTablesChanged?: () => void | Promise<void>;
  } = $props();

  let isDropdownOpen = $state(false);
  let isUpdateEatingTableModalOpen = $state(false);
  let isDeleteEatingTableModalOpen = $state(false);

  function handleEdit() {
    isUpdateEatingTableModalOpen = true;
  }

  function handleDelete() {
    isDeleteEatingTableModalOpen = true;
  }

  function loadEatingTables() {
    onEatingTablesChanged?.();
  }
</script>

<ClickableDiv
  customOnClick={handleEdit}
  class="bg-white border {table.isActive
    ? 'border-gray-200'
    : 'border-gray-100 opacity-60'} rounded-lg p-4 hover:shadow-md transition-all relative cursor-pointer"
>
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <h3 class="font-semibold text-gray-900 truncate mb-2">
        {table.name || "Unnamed Table"}
      </h3>
      <div class="space-y-1 text-sm">
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Status:</span>
          {#if table.isActive}
            <span class="font-medium text-green-600">Active</span>
          {:else}
            <span class="font-medium text-gray-500">Inactive</span>
          {/if}
        </div>
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Type:</span>
          <span class="font-medium text-gray-900">{table.type}</span>
        </div>
      </div>
    </div>

    <div class="ml-2">
      <Dropdown bind:open={isDropdownOpen} align="end">
        {#snippet trigger()}
          <Button
            variant="ghost"
            iconName="more"
            iconOnly={true}
            tooltip="Actions"
          />
        {/snippet}

        <DropdownItem onclick={handleEdit}>
          <Icon iconName="edit" size="4" class="fill-gray-600" />
          <span class="ml-2">Edit</span>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onclick={handleDelete} class="text-red-600">
          <Icon iconName="trash" size="4" class="fill-red-600" />
          <span class="ml-2">Delete</span>
        </DropdownItem>
      </Dropdown>
    </div>
  </div>
</ClickableDiv>

<UpdateEatingTableModal
  bind:isOpen={isUpdateEatingTableModalOpen}
  {table}
  onClose={() => (isUpdateEatingTableModalOpen = false)}
  onTableUpdated={loadEatingTables}
/>

<DeleteEatingTableModal
  bind:isOpen={isDeleteEatingTableModalOpen}
  {table}
  onClose={() => (isDeleteEatingTableModalOpen = false)}
  onTableDeleted={loadEatingTables}
/>
