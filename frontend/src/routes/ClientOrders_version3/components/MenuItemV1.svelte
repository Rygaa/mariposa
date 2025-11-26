<script lang="ts">
  import SupplementsModal from "./SupplementsModal.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import testImage from "../../../assets/test.png";

  let {
    menuItem,
    count = 0,
    onAdd,
    onRemove,
    onAddSupplement,
    fromColor = "#FFDCB5",
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
    if (!price) return "$0";
    return `$${price}`;
  }

  // Use placeholder image as fallback
  const displayImage = $derived(imageUrl || "/placeholder-image.jpg");
</script>

<div class="relative w-full h-full">
  <!-- Main Card -->
  <div
    class="relative rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl h-full flex flex-col max-h-[500px]"
    style="background-color: {fromColor};"
  >
    <!-- Header with name and rating -->
    <div class="p-6 pb-3">
      <div class="flex items-start justify-between mb-2">
        <div class="flex flex-col gap-y-2">
          <h3 class="font-bold text-gray-900 text-2xl pr-4">
            {menuItem.name}
          </h3>
          <h3
            class="font-bold text-gray-900 text-1xl pr-4 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-full text-center"
          >
            {menuItem.subName}
          </h3>
        </div>

        {#if menuItem.rating}
          <div
            class="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full"
          >
            <span class="text-sm font-semibold">{menuItem.rating}</span>
            <Icon iconName="star" class="text-yellow-500" size={4} />
          </div>
        {/if}
      </div>

      <!-- {#if menuItem.description}
        <p class="text-gray-700 text-sm line-clamp-1">
          {menuItem.description}
        </p>
      {/if} -->
    </div>

    <!-- Image Section - positioned to overlap -->
    <div class="flex-1 relative">
      {#if loadingImage}
        <div class="w-full h-full flex items-center justify-center bg-white/90">
          <div
            class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"
          ></div>
        </div>
      {:else}
        <img
          src={displayImage}
          alt={menuItem.name}
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
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

    <!-- Price and Add button positioned absolutely at bottom with background -->
    <div
      class="absolute bottom-4 left-4 right-4 px-6 py-4 flex items-center justify-between backdrop-blur-sm rounded-2xl"
      style="background-color: rgba(255, 255, 255, 0.25); background-blend-mode: lighten; background-image: linear-gradient({fromColor}B3, {fromColor}B3);"
    >
      <span class="text-3xl font-bold text-gray-900">
        {formatPrice(menuItem.price)}
      </span>

      {#if menuItem.isAvailable}
        <button
          onclick={handleAdd}
          class="flex justify-center items-center w-12 h-12 rounded-full bg-gray-900 text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 z-10"
          aria-label="Ajouter un article"
        >
          <Icon iconName="add" class="fill-white" size={6} />
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
