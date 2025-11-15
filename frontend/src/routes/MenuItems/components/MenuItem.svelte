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
  import CreateBuyingPrices from "./CreateBuyingPrices.svelte";
  import CreateSellingPrices from "./CreateSellingPrices.svelte";
  import ViewBuyingPricesModal from "./ViewBuyingPricesModal.svelte";
  import ViewSellingPricesModal from "./ViewSellingPricesModal.svelte";
  import MenuItemLinkerModal from "./MenuItemLinkerModal.svelte";

  let {
    menuItem,
  }: {
    menuItem: getMenuItemById["menuItem"];
  } = $props();

  let isDropdownOpen = $state(false);
  let isUpdateMenuItemModalOpen = $state(false);
  let isDeleteMenuItemModalOpen = $state(false);
  let isCreateBuyingPricesModalOpen = $state(false);
  let isCreateSellingPricesModalOpen = $state(false);
  let isViewBuyingPricesModalOpen = $state(false);
  let isViewSellingPricesModalOpen = $state(false);
  let isLinkMenuItemsModalOpen = $state(false);
  let isLinkMenuItemOptionModalOpen = $state(false);
  let isLinkRecipeModalOpen = $state(false);
  let isLinkRawMaterialModalOpen = $state(false);
  let isLinkSupplementModalOpen = $state(false);
  let isLinkMenuItemOptionTypeModalOpen = $state(false);

  function handleEdit() {
    isDropdownOpen = false;
    isUpdateMenuItemModalOpen = true;
  }

  function handleDelete() {
    isDropdownOpen = false;
    isDeleteMenuItemModalOpen = true;
  }

  function handleManagePrices() {
    isDropdownOpen = false;
    isCreateBuyingPricesModalOpen = true;
  }

  function handleManageSellingPrices() {
    isDropdownOpen = false;
    isCreateSellingPricesModalOpen = true;
  }

  function handleViewBuyingPrices() {
    isDropdownOpen = false;
    isViewBuyingPricesModalOpen = true;
  }

  function handleViewSellingPrices() {
    isDropdownOpen = false;
    isViewSellingPricesModalOpen = true;
  }

  function handleLinkMenuItems() {
    isDropdownOpen = false;
    isLinkMenuItemsModalOpen = true;
  }

  function handleLinkRecipe() {
    isDropdownOpen = false;
    isLinkRecipeModalOpen = true;
  }

  function handleLinkRawMaterial() {
    isDropdownOpen = false;
    isLinkRawMaterialModalOpen = true;
  }

  function handleLinkSupplement() {
    isDropdownOpen = false;
    isLinkSupplementModalOpen = true;
  }

  function handleLinkMenuItemOptionType() {
    isDropdownOpen = false;
    isLinkMenuItemOptionTypeModalOpen = true;
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
          <span class="font-medium text-gray-900">{menuItem.type?.join(', ')}</span>
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

    <ClickableDiv class="ml-2" onclick={(e) => e.stopPropagation()}>
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
        <DropdownItem onclick={handleManageSellingPrices}>
          <Icon iconName="money" size="4" class="fill-gray-600" />
          <span class="ml-2">Create Selling Prices</span>
        </DropdownItem>
        <DropdownItem onclick={handleViewSellingPrices}>
          <Icon iconName="money" size="4" class="fill-gray-600" />
          <span class="ml-2">View Selling Prices</span>
        </DropdownItem>
        <DropdownItem onclick={handleManagePrices}>
          <Icon iconName="money" size="4" class="fill-gray-600" />
          <span class="ml-2">Create Buying Prices</span>
        </DropdownItem>
        <DropdownItem onclick={handleViewBuyingPrices}>
          <Icon iconName="money" size="4" class="fill-gray-600" />
          <span class="ml-2">View Buying Prices</span>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem 
          onclick={handleLinkMenuItems}
        >
          <Icon iconName="link" size="4" class="fill-gray-600" />
          <span class="ml-2">Link Menu Items</span>
        </DropdownItem>
        <DropdownItem 
          onclick={handleLinkRecipe}
        >
          <Icon iconName="link" size="4" class="fill-gray-600" />
          <span class="ml-2">Link Recipe</span>
        </DropdownItem>
        <DropdownItem 
          onclick={handleLinkRawMaterial}
          isDisabled={menuItem.type?.includes("RAW_MATERIAL")}
        >
          <Icon iconName="link" size="4" class="fill-gray-600" />
          <span class="ml-2">Link Raw Material</span>
        </DropdownItem>
        <DropdownItem 
          onclick={handleLinkSupplement}
          isDisabled={menuItem.type?.includes("RAW_MATERIAL")}
        >
          <Icon iconName="link" size="4" class="fill-gray-600" />
          <span class="ml-2">Link Supplement</span>
        </DropdownItem>
        <DropdownItem 
          onclick={handleLinkMenuItemOptionType}
          isDisabled={menuItem.type?.includes("RAW_MATERIAL")}
        >
          <Icon iconName="link" size="4" class="fill-gray-600" />
          <span class="ml-2">Link Menu Item Option</span>
        </DropdownItem>
   
        <DropdownSeparator />
        <DropdownItem onclick={handleDelete} class="text-red-600">
          <Icon iconName="trash" size="4" class="fill-red-600" />
          <span class="ml-2">Delete</span>
        </DropdownItem>
      </Dropdown>
    </ClickableDiv>
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

<CreateBuyingPrices
  bind:isOpen={isCreateBuyingPricesModalOpen}
  menuItemId={menuItem.id}
  menuItemName={menuItem.name}
  onClose={() => (isCreateBuyingPricesModalOpen = false)}
/>

<CreateSellingPrices
  bind:isOpen={isCreateSellingPricesModalOpen}
  menuItemId={menuItem.id}
  menuItemName={menuItem.name}
  onClose={() => (isCreateSellingPricesModalOpen = false)}
/>

<ViewBuyingPricesModal
  bind:isOpen={isViewBuyingPricesModalOpen}
  menuItemId={menuItem.id}
  menuItemName={menuItem.name}
  onClose={() => (isViewBuyingPricesModalOpen = false)}
/>

<ViewSellingPricesModal
  bind:isOpen={isViewSellingPricesModalOpen}
  menuItemId={menuItem.id}
  menuItemName={menuItem.name}
  onClose={() => (isViewSellingPricesModalOpen = false)}
/>

<MenuItemLinkerModal
  {menuItem}
  bind:isOpen={isLinkMenuItemsModalOpen}
  filterByType="MENU_ITEM"
  onLinkCreated={loadMenuItems}
/>

<MenuItemLinkerModal
  {menuItem}
  bind:isOpen={isLinkRecipeModalOpen}
  filterByType="RECIPE"
  onLinkCreated={loadMenuItems}
/>

<MenuItemLinkerModal
  {menuItem}
  bind:isOpen={isLinkRawMaterialModalOpen}
  filterByType="RAW_MATERIAL"
  onLinkCreated={loadMenuItems}
/>

<MenuItemLinkerModal
  {menuItem}
  bind:isOpen={isLinkSupplementModalOpen}
  filterByType="SUPPLEMENT"
  onLinkCreated={loadMenuItems}
/>

<MenuItemLinkerModal
  {menuItem}
  bind:isOpen={isLinkMenuItemOptionTypeModalOpen}
  filterByType="MENU_ITEM_OPTION"
  onLinkCreated={loadMenuItems}
/>


