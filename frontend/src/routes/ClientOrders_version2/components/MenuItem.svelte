<script lang="ts">
  import SupplementsModal from "./SupplementsModal.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";
  import Icon from "../../../lib/components/Icon.svelte";

  let {
    menuItem,
    count = 0,
    onAdd,
    onRemove,
    onAddSupplement,
    fromColor = "#DFA1CD",
    toColor = "#C77DB5",
  }: {
    menuItem: any;
    count?: number;
    onAdd?: () => void | Promise<void>;
    onRemove?: () => void | Promise<void>;
    onAddSupplement?: (supplementId: string) => void | Promise<void>;
    fromColor?: string;
    toColor?: string;
  } = $props();

  let isSupplementModalOpen = $state(false);
  let imageUrl = $state<string | null>(null);
  let loadingImage = $state(true);

  // Get supplements from subMenuItems that are of type SUPPLEMENT
  const hasSupplements = $derived(
    menuItem.subMenuItems?.some((subMenuItem: any) =>
      subMenuItem.type?.includes("SUPPLEMENT")
    ) || false
  );

  async function handleAdd() {
    await onAdd?.();
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
        const mainImage =
          result.images.find((img: any) => img.shouldBeUsedInMenuItemsPage) ||
          result.images[0];

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

  function formatPrice(price: number | null | undefined): string {
    if (!price) return "0 DZD";
    return `${price} DZD`;
  }
</script>

<div
  class="group relative flex flex-col bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-orange-200 h-full"
>
  <!-- Image Section -->
  <div
    class="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200"
  >
    {#if loadingImage}
      <div class="w-full h-full flex items-center justify-center">
        <div
          class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"
        ></div>
      </div>
    {:else if imageUrl}
      <img
        src={imageUrl}
        alt={menuItem.name}
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        onerror={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    {:else}
      <div
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-pink-100"
      >
        <Icon iconName="image" class="text-orange-300" size="16" />
      </div>
    {/if}

    {#if !menuItem.isAvailable}
      <div
        class="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"
      >
        <span
          class="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-lg"
        >
          Épuisé
        </span>
      </div>
    {/if}
  </div>

  <!-- Content Section -->
  <div class="flex-1 flex flex-col p-4">
    <h3 class="font-bold text-gray-900 text-lg mb-2 line-clamp-2">
      {menuItem.name}
    </h3>
    <p class="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
      {menuItem.description || "Découvrez ce délicieux plat."}
    </p>

    <!-- Price and Actions -->
    <div class="flex items-end justify-between mt-auto gap-3">
      <span
        class="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent leading-tight"
        style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
      >
        {formatPrice(menuItem.price)}
      </span>

      {#if menuItem.isAvailable}
        <button
          onclick={handleAdd}
          class="flex justify-center items-center w-10 h-10 rounded-full text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
          style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
          aria-label="Ajouter un article"
        >
          <Icon iconName="add" class="fill-white" size={5} />
        </button>
      {/if}
    </div>
  </div>
</div>

<SupplementsModal
  bind:open={isSupplementModalOpen}
  {menuItem}
  {onAddSupplement}
  {fromColor}
  {toColor}
/>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
