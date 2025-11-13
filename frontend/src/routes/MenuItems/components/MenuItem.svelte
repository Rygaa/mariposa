<script lang="ts">
  import type { getMenuItemById } from "../../../../../backend/src/router.types";
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import ClickableDiv from "../../../lib/shadcn/ClickableDiv.svelte";
  import {
    Dropdown,
    DropdownItem,
    DropdownSeparator,
  } from "../../../lib/shadcn/Dropdown";
  import DeleteMenuItemModal from "./DeleteMenuItemModal.svelte";
  import UpdateMenuItemModal from "./UpdateMenuItemModal.svelte";

  let {
    menuItem,
  }: {
    menuItem: getMenuItemById["menuItem"];
  } = $props();

  let isDropdownOpen = $state(false);
  let isUpdateMenuItemModalOpen = $state(false);
  let isDeleteMenuItemModalOpen = $state(false);

  function handleEdit() {
    isDropdownOpen = false;
    isUpdateMenuItemModalOpen = true;
  }

  function handleDelete() {
    isDropdownOpen = false;
    isDeleteMenuItemModalOpen = true;
  }

  function loadMenuItems() {
    // Placeholder - this should trigger a refresh in parent component
    // You may need to pass this as a prop or use a store
  }
</script>

<ClickableDiv
  customOnClick={handleEdit}
  class="bg-white border {menuItem.isAvailable
    ? 'border-gray-200'
    : 'border-gray-100 opacity-60'} rounded-lg p-4 hover:shadow-md transition-all relative cursor-pointer"
>
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <h3 class="font-semibold text-gray-900 truncate mb-2">
        {menuItem.name}
      </h3>
      <div class="space-y-1 text-sm">
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Status:</span>
          {#if menuItem.isAvailable}
            <span class="font-medium text-green-600">Available</span>
          {:else}
            <span class="font-medium text-gray-500">Unavailable</span>
          {/if}
        </div>
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Type:</span>
          <span class="font-medium text-gray-900">{menuItem.itemType}</span>
        </div>
        {#if menuItem.price}
          <div class="flex items-center gap-1">
            <span class="text-gray-600">Price:</span>
            <span class="font-medium text-gray-900"
              >${menuItem.price.toFixed(2)}</span
            >
          </div>
        {/if}
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

<UpdateMenuItemModal
  bind:isOpen={isUpdateMenuItemModalOpen}
  {menuItem}
  onMenuItemUpdated={loadMenuItems}
  onClose={() => (isUpdateMenuItemModalOpen = false)}
/>

<DeleteMenuItemModal
  bind:isOpen={isDeleteMenuItemModalOpen}
  {menuItem}
  onMenuItemDeleted={loadMenuItems}
  onClose={() => (isDeleteMenuItemModalOpen = false)}
/>
