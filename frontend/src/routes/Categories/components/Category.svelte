<script lang="ts">
  import type { getCategoryById } from "../../../../../backend/src/router.types";
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import ClickableDiv from "../../../lib/shadcn/ClickableDiv.svelte";
  import {
    Dropdown,
    DropdownItem,
    DropdownSeparator,
  } from "../../../lib/shadcn/Dropdown";
  import DeleteCategoryModal from "./DeleteCategoryModal.svelte";
  import UpdateCategoryModal from "./UpdateCategoryModal.svelte";

  let {
    category,
  }: {
    category: getCategoryById["category"];
  } = $props();

  let isDropdownOpen = $state(false);
  let isUpdateCategoryModalOpen = $state(false);
  let isDeleteCategoryModalOpen = $state(false);

  function handleEdit() {
    isUpdateCategoryModalOpen = true;
  }

  function handleDelete() {
    isDeleteCategoryModalOpen = true;
  }

  function loadCategories() {
    // Placeholder - this should trigger a refresh in parent component
    // You may need to pass this as a prop or use a store
  }
</script>

<ClickableDiv
  customOnClick={handleEdit}
  class="bg-white border {category.isUnlisted
    ? 'border-gray-100 opacity-60'
    : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-all relative cursor-pointer"
>
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <h3 class="font-semibold text-gray-900 truncate mb-2">
        {category.name}
      </h3>
      <div class="space-y-1 text-sm">
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Status:</span>
          {#if category.isUnlisted}
            <span class="font-medium text-gray-500">Unlisted</span>
          {:else}
            <span class="font-medium text-green-600">Listed</span>
          {/if}
        </div>
        {#if category.iconname}
          <div class="flex items-center gap-1">
            <span class="text-gray-600">Icon:</span>
            <Icon iconName={category.iconname} size="4" class="fill-gray-900" />
          </div>
        {/if}
        {#if category.index !== null}
          <div class="flex items-center gap-1">
            <span class="text-gray-600">Index:</span>
            <span class="font-medium text-gray-900">{category.index}</span>
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

<UpdateCategoryModal
  bind:isOpen={isUpdateCategoryModalOpen}
  {category}
  onCategoryUpdated={loadCategories}
  onClose={() => (isUpdateCategoryModalOpen = false)}
/>

<DeleteCategoryModal
  bind:isOpen={isDeleteCategoryModalOpen}
  {category}
  onCategoryDeleted={loadCategories}
  onClose={() => (isDeleteCategoryModalOpen = false)}
/>
