<script lang="ts">
  import Icon from "../../../lib/components/Icon.svelte";
  import SupplementsModal from "./SupplementsModal.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";

  let {
    menuItem,
    count = 0,
    onAdd,
    onRemove,
    onAddSupplement,
  }: {
    menuItem: any;
    count?: number;
    onAdd?: () => void | Promise<void>;
    onRemove?: () => void | Promise<void>;
    onAddSupplement?: (supplementId: string) => void | Promise<void>;
  } = $props();

  let isSupplementModalOpen = $state(false);
  let imageUrl = $state<string | null>(null);
  let loadingImage = $state(true);

  // Get supplements from subMenuItems that are of type SUPPLEMENT
  const hasSupplements = $derived(
    menuItem.subMenuItems?.some((subMenuItem: any) => subMenuItem.type?.includes("SUPPLEMENT")) || false
  );

  async function handleAdd() {
    await onAdd?.();
    console.log(menuItem)
    // If item has supplements, open modal after adding
    if (hasSupplements) {
      isSupplementModalOpen = true;
    }
  }

  function openSupplementsModal() {
    if (count > 0) {
      isSupplementModalOpen = true;
    }
  }

  async function loadImageUrl() {
    if (!menuItem.id) {
      loadingImage = false;
      return;
    }

    try {
      const result = await trpc.listMenuItemImages.query({
        menuItemId: menuItem.id,
      });

      if (result.success && result.images.length > 0) {
        const mainImage = result.images.find((img: any) => img.shouldBeUsedInMenuItemsPage) || result.images[0];

        const urlResult = await trpc.getMenuItemImageViewUrl.query({
          fileId: mainImage.fileId,
        });

        if (urlResult.success) {
          imageUrl = urlResult.url;
        }
      }
    } catch (error) {
      console.error("Failed to load image:", error);
    } finally {
      loadingImage = false;
    }
  }

  onMount(() => {
    loadImageUrl();
  });
</script>

<div
  class="relative flex mx-4 mb-4 rounded-xl h-[175px] sm:h-[200px] shadow-md bg-white border border-gray-200 py-2 px-2"
>
  {#if loadingImage}
    <div class="box-border rounded-xl bg-gray-200 z-10 w-[120px] sm:w-[180px] flex items-center justify-center">
      <span class="text-xs text-gray-400">Loading...</span>
    </div>
  {:else if imageUrl}
    <img
      src={imageUrl}
      alt={menuItem.name}
      class="box-border rounded-xl bg-gray-200 z-10 w-[120px] sm:w-[180px] object-cover"
      onerror={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  {/if}

  <div class="flex flex-col justify-between pr-2 flex-1">
    <div>
      <p class="font-semibold self-start text-left text-black px-2 sm:px-4 text-base lg:text-lg">
        {menuItem.name}
      </p>
      <p class="font-normal self-start text-left text-gray-600 px-2 sm:px-4 text-sm sm:text-base">
        {menuItem.description || "Aucune description disponible."}
      </p>
    </div>

    <div class="flex justify-between items-center w-full">
      <p class="font-bold self-end px-2 sm:px-4 text-black text-base lg:text-lg gap-x-1 flex">
        {menuItem.price || 0}
        <span>DZD</span>
      </p>

      <div class="flex flex-col gap-2">
        {#if menuItem.isAvailable}
          {#if hasSupplements}
            <button
              onclick={openSupplementsModal}
              disabled={count === 0}
              class="text-xs px-3 py-1 rounded-lg transition-colors duration-200 font-medium {count > 0
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
            >
              + Suppléments
            </button>
          {/if}

          <div class="flex items-center">
            {#if count > 0}
              <button
                onclick={onRemove}
              class="flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-md bg-red-500 hover:bg-red-600 transition-colors"
              >
                <Icon iconName="minus" class="fill-white" />
              </button>
            {/if}

            <p class="font-bold self-center px-2 sm:px-4 text-black text-sm sm:text-base lg:text-lg">
              {count}
            </p>

            <button
              onclick={handleAdd}
              class="flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-md bg-green-500 hover:bg-green-600 transition-colors"
            >
              <Icon iconName="add" class="fill-white" />
            </button>
          </div>
        {:else}
          <p class="text-red-500 text-sm sm:text-base lg:text-lg font-medium">Épuisé</p>
        {/if}
      </div>
    </div>
  </div>
</div>

<SupplementsModal
  bind:open={isSupplementModalOpen}
  {menuItem}
  onAddSupplement={onAddSupplement}
/>
