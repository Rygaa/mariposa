<script lang="ts">
  import Button from "../../../lib/components/Button.svelte";
  import { trpc } from "../../../lib/trpc";
  import ImageCropModal from "./ImageCropModal.svelte";
  import { onMount } from "svelte";
  
  interface MenuItemImage {
    id: string;
    menuItemId: string;
    fileId: string;
    shouldBeUsedInMenuItemsPage: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  interface Props {
    menuItemId: string;
    maxImages?: number;
    disabled?: boolean;
  }
  
  let {
    menuItemId,
    maxImages = 5,
    disabled = false,
  }: Props = $props();

  let images = $state<MenuItemImage[]>([]);

  let uploading = $state(false);
  let uploadError = $state("");
  let fileInput: HTMLInputElement;
  let isCropModalOpen = $state(false);
  let cropImageUrl = $state("");
  let cropImageName = $state("");
  let cropImageIndex = $state<number | null>(null);

  async function loadImages() {
    try {
      const result = await trpc.listMenuItemImages.query({ menuItemId });
        console.log(result)

      if (result.success) {
        images = result.images;
      }
    } catch (err) {
      console.error("Failed to load images:", err);
      images = [];
    }
  }

  onMount(() => {
    loadImages();
  });

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) return;
    
    if (images.length + files.length > maxImages) {
      uploadError = `Maximum ${maxImages} images allowed`;
      return;
    }

    uploading = true;
    uploadError = "";
    
    try {
      for (const file of Array.from(files)) {
        // Convert file to base64
        const base64 = await fileToBase64(file);
        
        // Upload to gamma
        await trpc.uploadMenuItemImage.mutate({
          menuItemId,
          file: base64,
          filename: file.name,
          mimeType: file.type,
          shouldBeUsedInMenuItemsPage: false,
        });
      }
      
      // Reload images list
      await loadImages();
    } catch (err: any) {
      uploadError = err.message || "Failed to upload images";
      console.error("Upload error:", err);
    } finally {
      uploading = false;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function removeImage(index: number) {
    const image = images[index];
    
    try {
      await trpc.deleteMenuItemImage.mutate({ id: image.id });
      await loadImages();
    } catch (err) {
      console.error("Failed to delete image from server:", err);
    }
  }

  async function handleCropImage(index: number) {
    const image = images[index];
    const url = imageUrls[image.fileId];
    
    if (!url) {
      uploadError = "Image URL not available for cropping";
      return;
    }
    
    cropImageUrl = url;
    cropImageName = `image-${index + 1}`;
    cropImageIndex = index;
    isCropModalOpen = true;
  }

  async function toggleShouldBeUsedInMenuItemsPage(index: number) {
    const image = images[index];
    
    try {
      await trpc.updateMenuItemImage.mutate({
        id: image.id,
        shouldBeUsedInMenuItemsPage: !image.shouldBeUsedInMenuItemsPage,
      });
      await loadImages();
    } catch (err) {
      console.error("Failed to update image:", err);
    }
  }

  async function handleCropSave(croppedImageBase64: string) {
    if (cropImageIndex === null) {
      console.log("cropImageIndex is null, aborting");
      return;
    }
    
    uploading = true;
    uploadError = "";
    
    try {
      // Upload cropped image as a new image (keeping the original)
      await trpc.uploadMenuItemImage.mutate({
        menuItemId,
        file: croppedImageBase64,
        filename: `${cropImageName}-cropped.jpg`,
        mimeType: "image/jpeg",
        shouldBeUsedInMenuItemsPage: false,
      });
      
      // Reload images list
      await loadImages();
    } catch (err: any) {
      uploadError = err.message || "Failed to save cropped image";
      console.error("Crop save error:", err);
    } finally {
      uploading = false;
      cropImageIndex = null;
    }
  }

  function handleCropClose() {
    cropImageIndex = null;
    cropImageUrl = "";
    cropImageName = "";
  }

  async function getImageUrl(fileId: string): Promise<string> {
    if (!fileId) {
      console.error("getImageUrl called with empty fileId");
      return "";
    }
    
    try {
      const result = await trpc.getMenuItemImageViewUrl.query({ fileId });
      return result.url;
    } catch (err) {
      console.error("Failed to get image URL:", err);
      return "";
    }
  }

  // Cache for image URLs
  let imageUrls = $state<Record<string, string>>({});
  let loadingUrls = $state(false);
  
  // Load image URL on demand when component becomes visible
  async function loadImageUrl(fileId: string) {
    if (!fileId || imageUrls[fileId]) {
      return; // Already loaded or invalid fileId
    }
    
    try {
      const url = await getImageUrl(fileId);
      imageUrls = { ...imageUrls, [fileId]: url };
    } catch (err) {
      // Silently fail - server might not be configured yet
      console.error("Failed to load image URL for fileId:", fileId, err);
      imageUrls = { ...imageUrls, [fileId]: "" };
    }
  }
  
  // Load all image URLs when images array changes
  let prevImagesLength = $state(0);
  $effect(() => {
    // Only load if we have new images
    if (images.length > 0 && images.length !== prevImagesLength) {
      prevImagesLength = images.length;
      
      // Load URLs for new images only
      images.forEach((image) => {
        if (image.fileId && !imageUrls[image.fileId]) {
          loadImageUrl(image.fileId);
        }
      });
    }
  });
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <span class="block text-sm font-medium text-gray-700">
      Images ({images.length}/{maxImages})
    </span>
    <Button
      variant="outline"
      size="sm"
      onclick={() => fileInput?.click()}
      disabled={disabled || uploading || images.length >= maxImages}
      loading={uploading}
    >
      {uploading ? "Uploading..." : "Add Images"}
    </Button>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    multiple
    onchange={handleFileSelect}
    class="hidden"
  />

  {#if uploadError}
    <div class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
      {uploadError}
    </div>
  {/if}

  {#if images.length > 0}
    <div class="grid grid-cols-3 gap-2">
      {#each images as image, index}
        <div class="relative group">
          {#if imageUrls[image.fileId] && imageUrls[image.fileId] !== ""}
            <img
              src={imageUrls[image.fileId]}
              alt="Menu item {index + 1}"
              class="w-full h-24 object-cover rounded border {image.shouldBeUsedInMenuItemsPage ? 'border-green-500 border-2' : 'border-gray-200'}"
            />
            <!-- Badge for main image -->
            {#if image.shouldBeUsedInMenuItemsPage}
              <div class="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                Main
              </div>
            {/if}
            <!-- Action buttons overlay -->
            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onclick={() => toggleShouldBeUsedInMenuItemsPage(index)}
                disabled={disabled || uploading}
                aria-label="Toggle main image"
                class="bg-green-500 text-white rounded-full p-2 hover:bg-green-600 transition-colors disabled:opacity-50"
                title={image.shouldBeUsedInMenuItemsPage ? "Unset as main" : "Set as main"}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                type="button"
                onclick={() => handleCropImage(index)}
                disabled={disabled || uploading}
                aria-label="Crop image"
                class="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
                title="Crop/Edit"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                onclick={() => removeImage(index)}
                disabled={disabled}
                aria-label="Remove image"
                class="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                title="Remove"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          {:else if imageUrls[image.fileId] === ""}
            <div class="w-full h-24 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
              <span class="text-xs text-gray-400">Image unavailable</span>
            </div>
          {:else}
            <div class="w-full h-24 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
              <span class="text-xs text-gray-400">Loading...</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <p class="text-sm text-gray-500">No images yet. Click "Add Images" to upload.</p>
    </div>
  {/if}
</div>

<ImageCropModal
  bind:isOpen={isCropModalOpen}
  imageUrl={cropImageUrl}
  imageName={cropImageName}
  onSave={handleCropSave}
  onClose={handleCropClose}
/>
