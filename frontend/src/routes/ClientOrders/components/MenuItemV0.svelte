<script lang="ts">
  import SupplementsModal from "./SupplementsModal.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import Button from "../../../lib/components/Button.svelte";
  import testImage from "../../../assets/test.png";

  let {
    menuItem,
    count = 0,
    onAdd,
    onRemove,
    onAddSupplement,
    fromColor = "#FBFFFF",
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
  let imageLoaded = $state(false);
  
  // React to menuItem.imageUrl changes (for preview mode)
  $effect(() => {
    if (menuItem.imageUrl && menuItem.id === 'preview') {
      imageUrl = menuItem.imageUrl;
      imageLoaded = true;
    }
  });

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
    // If imageUrl is already provided (e.g., for preview), skip loading
    if (menuItem.imageUrl && menuItem.id === 'preview') {
      imageUrl = menuItem.imageUrl;
      imageLoaded = true;
      return;
    }
    
    if (!menuItem.id || menuItem.id === 'preview') {
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
          // Preload the image
          const img = new Image();
          img.onload = () => {
            imageLoaded = true;
          };
          img.src = urlResult.url;
        }
      }
    } catch (error) {
      console.error("Failed to load image:", error);
    }
  }

  onMount(() => {
    loadImageUrl();
  });

  function formatPrice(price: number | null | undefined): string {
    if (!price) return "$0";
    return `$${price}`;
  }

  // Calculate discounted price if applicable
  const priceInfo = $derived(() => {
    const originalPrice = menuItem.price || 0;
    
    // Get the most recent selling price with discount
    const sellingPrice = menuItem.sellingPrices?.[0];
    
    if (!sellingPrice) {
      return { originalPrice, discountedPrice: null, hasDiscount: false };
    }

    let discountedPrice = originalPrice;
    let hasDiscount = false;

    // Apply discount in percent
    if (sellingPrice.discountInPercent && sellingPrice.discountInPercent > 0) {
      discountedPrice = originalPrice * (1 - sellingPrice.discountInPercent / 100);
      hasDiscount = true;
    }
    // Apply discount in value (takes precedence over percent if both exist)
    else if (sellingPrice.discountInValue && sellingPrice.discountInValue > 0) {
      discountedPrice = originalPrice - sellingPrice.discountInValue;
      hasDiscount = true;
    }

    // Ensure price doesn't go negative
    discountedPrice = Math.max(0, discountedPrice);

    return { originalPrice, discountedPrice, hasDiscount };
  });

  // Use placeholder image as fallback or while loading
  const displayImage = $derived(
    imageLoaded && imageUrl ? imageUrl : "/placeholder-image.jpg"
  );
</script>

<div class="relative w-full">
  <div
    class="relative rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl h-full flex flex-col"
  >
    <div class="flex-1 relative overflow-hidden rounded-3xl shadow-md" style="margin: 1rem; margin-bottom: -20%; aspect-ratio: 386 / 384;">
      <img
        src={displayImage}
        alt={menuItem.name}
        class="w-full h-full object-cover transition-transform duration-300"
      />

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
      class="w-full py-4 flex items-center justify-between backdrop-blur-xs rounded-3xl border border-black/20 shadow-lg"
      style="background-color: rgba(255, 255, 255, 0.25); background-blend-mode: lighten; background-image: linear-gradient({fromColor}B3, {fromColor}B3);"
    >
      <div
        class="flex flex-col items-start justify-between w-full px-4 gap-y-4"
      >
        <div class="flex flex-col gap-y-2 w-full">
          <div class="flex items-center justify-between w-full">
            <span class="text-3xl font-bold text-gray-900">
              {menuItem.name}
            </span>

            <div class="flex flex-col items-end">
              {#if priceInfo().hasDiscount}
                <span class="text-lg font-bold text-gray-600 line-through">
                  {formatPrice(priceInfo().originalPrice)}
                </span>
                <span class="text-2xl font-bold text-red-600">
                  {formatPrice(priceInfo().discountedPrice)}
                </span>
              {:else}
                <span class="text-2xl font-bold text-gray-900">
                  {formatPrice(menuItem.price)}
                </span>
              {/if}
            </div>
          </div>

          <span
            class="font-bold text-gray-900 text-1xl bg-white/70 backdrop-blur-sm px-6 py-1.25 rounded-full inline-block w-fit"
          >
            {menuItem.subName}
          </span>
        </div>
        {#if menuItem.isAvailable}
          <Button
            onclick={handleAdd}
            variant="secondary"
            size="lg"
            fullWidth
            iconOnly={true}
            iconName="add"
            rounded="full"
            tooltip="Ajouter un article"
          />
        {/if}
      </div>
    </div>
  </div>
</div>
