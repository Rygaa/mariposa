<script lang="ts">
  import { onMount } from "svelte";
  import Button from "../../../lib/components/Button.svelte";
  import MenuItemV0 from "../../ClientOrders_version3/components/MenuItemV0.svelte";

  interface Props {
    isOpen?: boolean;
    imageUrl: string;
    imageName: string;
    onSave: (croppedImage: string) => void | Promise<void>;
    onClose: () => void;
  }

  let { isOpen = $bindable(false), imageUrl, imageName, onSave, onClose }: Props = $props();

  let canvas = $state<HTMLCanvasElement>();
  let previewCanvas = $state<HTMLCanvasElement>();
  let ctx: CanvasRenderingContext2D | null = null;
  let img = $state<HTMLImageElement | null>(null);
  let isDragging = $state(false);
  let isResizing = $state(false);
  let resizeHandle = $state<string | null>(null);
  let imageLoaded = $state(false);
  
  // Aspect ratio control
  let aspectRatioMode = $state<"free" | "3:4" | "386:384">("free");
  const ASPECT_RATIO_3_4 = 3 / 4; // width:height = 3:4 (standard portrait)
  const ASPECT_RATIO_386_384 = 386 / 384; // width:height = 386:384 (nearly square)
  
  // Crop area state
  let cropX = $state(50);
  let cropY = $state(50);
  let cropWidth = $state(200);
  let cropHeight = $state(200);
  
  // Drag offset
  let dragOffsetX = $state(0);
  let dragOffsetY = $state(0);
  
  // Image scale and position
  let scale = $state(1);
  let imgX = $state(0);
  let imgY = $state(0);
  let imgWidth = $state(0);
  let imgHeight = $state(0);
  
  // Preview image URL for MenuItemV0 component
  let previewImageUrl = $state<string | null>(null);
  
  // Mock menu item for preview
  let previewMenuItem = $derived({
    id: 'preview',
    name: 'Preview',
    subName: img ? `${Math.round(cropWidth * img.width / imgWidth)} × ${Math.round(cropHeight * img.height / imgHeight)} px` : 'Loading...',
    price: null,
    isAvailable: true,
  });

  function loadImage() {
    if (!canvas || !imageUrl) {
      return;
    }
    
    if (!ctx) {
      ctx = canvas.getContext("2d");
    }
    
    if (!ctx) {
      console.error("Failed to get canvas context");
      return;
    }
    
    imageLoaded = false;
    img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      
      if (!canvas || !ctx || !img) {
        return;
      }
      
      // Calculate scaling to fit canvas
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgAspect = img.width / img.height;
      const canvasAspect = canvasWidth / canvasHeight;
      
      if (imgAspect > canvasAspect) {
        imgWidth = canvasWidth * 0.9;
        imgHeight = imgWidth / imgAspect;
      } else {
        imgHeight = canvasHeight * 0.9;
        imgWidth = imgHeight * imgAspect;
      }
      
      imgX = (canvasWidth - imgWidth) / 2;
      imgY = (canvasHeight - imgHeight) / 2;
      
      // Set initial crop area to center of image
      if (aspectRatioMode === "3:4") {
        // Start with 3:4 ratio (width:height = 3:4 portrait)
        cropWidth = Math.min(imgWidth * 0.5, 250);
        cropHeight = cropWidth / ASPECT_RATIO_3_4;
        // Adjust if height is too large
        if (cropHeight > imgHeight * 0.9) {
          cropHeight = imgHeight * 0.9;
          cropWidth = cropHeight * ASPECT_RATIO_3_4;
        }
      } else if (aspectRatioMode === "386:384") {
        // Start with 386:384 ratio (nearly square) - maximize size to 100%
        const maxWidth = imgWidth;
        const maxHeight = imgHeight;
        
        // Calculate dimensions that fit and maximize area
        if (maxWidth / ASPECT_RATIO_386_384 <= maxHeight) {
          // Width is limiting factor
          cropWidth = maxWidth;
          cropHeight = cropWidth / ASPECT_RATIO_386_384;
        } else {
          // Height is limiting factor
          cropHeight = maxHeight;
          cropWidth = cropHeight * ASPECT_RATIO_386_384;
        }
      } else {
        cropWidth = Math.min(imgWidth * 0.6, 300);
        cropHeight = Math.min(imgHeight * 0.6, 300);
      }
      cropX = imgX + (imgWidth - cropWidth) / 2;
      cropY = imgY + (imgHeight - cropHeight) / 2;
      
      imageLoaded = true;
      draw();
      drawPreview();
    };
    
    img.onerror = (e) => {
      console.error("Failed to load image:", e);
    };
    
    img.src = imageUrl;
  }

  function draw() {
    if (!ctx || !canvas || !img) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
    
    // Draw dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear crop area
    ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
    ctx.drawImage(
      img,
      (cropX - imgX) * (img.width / imgWidth),
      (cropY - imgY) * (img.height / imgHeight),
      cropWidth * (img.width / imgWidth),
      cropHeight * (img.height / imgHeight),
      cropX,
      cropY,
      cropWidth,
      cropHeight
    );
    
    // Draw crop box border
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
    
    // Draw resize handles
    const handleSize = 10;
    ctx.fillStyle = "#3b82f6";
    // Top-left
    ctx.fillRect(cropX - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(cropX - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize);
  }

  function handleMouseDown(e: MouseEvent) {
    if (!canvas) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on resize handles
    const handleSize = 10;
    const handles = {
      tl: { x: cropX, y: cropY },
      tr: { x: cropX + cropWidth, y: cropY },
      bl: { x: cropX, y: cropY + cropHeight },
      br: { x: cropX + cropWidth, y: cropY + cropHeight },
    };
    
    for (const [key, handle] of Object.entries(handles)) {
      if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
        isResizing = true;
        resizeHandle = key;
        return;
      }
    }
    
    // Check if clicking inside crop area
    if (x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight) {
      isDragging = true;
      dragOffsetX = x - cropX;
      dragOffsetY = y - cropY;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging && !isResizing) return;
    if (!canvas) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      cropX = Math.max(imgX, Math.min(x - dragOffsetX, imgX + imgWidth - cropWidth));
      cropY = Math.max(imgY, Math.min(y - dragOffsetY, imgY + imgHeight - cropHeight));
    } else if (isResizing && resizeHandle) {
      const minSize = 50;
      
      if (aspectRatioMode === "3:4" || aspectRatioMode === "386:384") {
        const currentRatio = aspectRatioMode === "3:4" ? ASPECT_RATIO_3_4 : ASPECT_RATIO_386_384;
        // Maintain aspect ratio while resizing
        if (resizeHandle === "br" || resizeHandle === "tr") {
          // Resize based on width, calculate height
          let newWidth = Math.max(minSize, Math.min(x - cropX, imgX + imgWidth - cropX));
          let newHeight = newWidth / currentRatio;
          
          // Check if height fits
          if (resizeHandle === "br") {
            if (cropY + newHeight > imgY + imgHeight) {
              newHeight = imgY + imgHeight - cropY;
              newWidth = newHeight * currentRatio;
            }
          } else if (resizeHandle === "tr") {
            const newY = cropY + cropHeight - newHeight;
            if (newY < imgY) {
              newHeight = cropY + cropHeight - imgY;
              newWidth = newHeight * currentRatio;
            }
          }
          
          cropWidth = newWidth;
          cropHeight = newHeight;
          
          if (resizeHandle === "tr") {
            cropY = cropY + cropHeight - newHeight;
          }
        } else if (resizeHandle === "bl" || resizeHandle === "tl") {
          // Resize based on height movement, calculate width
          let newHeight;
          let newY;
          
          if (resizeHandle === "bl") {
            newHeight = Math.max(minSize, Math.min(y - cropY, imgY + imgHeight - cropY));
          } else {
            newY = Math.max(imgY, Math.min(y, cropY + cropHeight - minSize));
            newHeight = cropY + cropHeight - newY;
          }
          
          let newWidth = newHeight * currentRatio;
          const newX = cropX + cropWidth - newWidth;
          
          // Check if it fits
          if (newX < imgX) {
            newWidth = cropX + cropWidth - imgX;
            newHeight = newWidth / currentRatio;
            
            if (resizeHandle === "tl") {
              newY = cropY + cropHeight - newHeight;
            }
          }
          
          cropX = cropX + cropWidth - newWidth;
          cropWidth = newWidth;
          cropHeight = newHeight;
          
          if (resizeHandle === "tl") {
            cropY = cropY + cropHeight - newHeight;
          }
        }
      } else {
        // Free mode - original behavior
        if (resizeHandle === "br") {
          cropWidth = Math.max(minSize, Math.min(x - cropX, imgX + imgWidth - cropX));
          cropHeight = Math.max(minSize, Math.min(y - cropY, imgY + imgHeight - cropY));
        } else if (resizeHandle === "bl") {
          const newX = Math.max(imgX, Math.min(x, cropX + cropWidth - minSize));
          const newWidth = cropX + cropWidth - newX;
          cropX = newX;
          cropWidth = newWidth;
          cropHeight = Math.max(minSize, Math.min(y - cropY, imgY + imgHeight - cropY));
        } else if (resizeHandle === "tr") {
          cropWidth = Math.max(minSize, Math.min(x - cropX, imgX + imgWidth - cropX));
          const newY = Math.max(imgY, Math.min(y, cropY + cropHeight - minSize));
          const newHeight = cropY + cropHeight - newY;
          cropY = newY;
          cropHeight = newHeight;
        } else if (resizeHandle === "tl") {
          const newX = Math.max(imgX, Math.min(x, cropX + cropWidth - minSize));
          const newY = Math.max(imgY, Math.min(y, cropY + cropHeight - minSize));
          const newWidth = cropX + cropWidth - newX;
          const newHeight = cropY + cropHeight - newY;
          cropX = newX;
          cropY = newY;
          cropWidth = newWidth;
          cropHeight = newHeight;
        }
      }
    }
    
    draw();
    drawPreview();
  }

  function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
  }

  async function handleSave() {
    if (!img) return;
    
    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = cropWidth * (img.width / imgWidth);
    croppedCanvas.height = cropHeight * (img.height / imgHeight);
    
    const croppedCtx = croppedCanvas.getContext("2d", { alpha: true });
    if (!croppedCtx) return;
    
    // Clear canvas to ensure transparency is preserved
    croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
    
    croppedCtx.drawImage(
      img,
      (cropX - imgX) * (img.width / imgWidth),
      (cropY - imgY) * (img.height / imgHeight),
      cropWidth * (img.width / imgWidth),
      cropHeight * (img.height / imgHeight),
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );
    
    // Convert to PNG to preserve transparency
    const croppedDataUrl = croppedCanvas.toDataURL("image/png");
    onSave(croppedDataUrl);
    isOpen = false;
  }

  function handleCancel() {
    isOpen = false;
    onClose();
  }

  // Load image when modal opens or imageUrl changes
  $effect(() => {
    if (isOpen && imageUrl && canvas) {
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        loadImage();
      }, 100);
    }
  });

  // Redraw when crop values change
  $effect(() => {
    const _ = [cropX, cropY, cropWidth, cropHeight];
    if (img && img.complete && imageLoaded) {
      draw();
      drawPreview();
    }
  });

  // Draw preview and update preview URL
  function drawPreview() {
    if (!img || !imageLoaded || !previewCanvas) return;
    
    const previewCtx = previewCanvas.getContext("2d", { alpha: true });
    if (!previewCtx) return;
    
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    previewCtx.drawImage(
      img,
      (cropX - imgX) * (img.width / imgWidth),
      (cropY - imgY) * (img.height / imgHeight),
      cropWidth * (img.width / imgWidth),
      cropHeight * (img.height / imgHeight),
      0,
      0,
      previewCanvas.width,
      previewCanvas.height
    );
    
    // Update preview URL for MenuItemV0 component
    previewImageUrl = previewCanvas.toDataURL("image/png");
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] flex flex-col" style="max-width: 95vw;">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold text-gray-900">Crop Image</h2>
        <button
          onclick={handleCancel}
          aria-label="Close"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Canvas and Preview -->
      <div class="flex-1 p-4 overflow-hidden flex gap-4">
        <!-- Canvas Section -->
        <div class="flex-1 flex items-center justify-center">
          <canvas
            bind:this={canvas}
            width={700}
            height={500}
            class="border border-gray-300 rounded cursor-move select-none"
            style="-webkit-user-drag: none; user-select: none;"
            onmousedown={handleMouseDown}
            onmousemove={handleMouseMove}
            onmouseup={handleMouseUp}
            onmouseleave={handleMouseUp}
            ondragstart={(e) => e.preventDefault()}
          ></canvas>
        </div>
        
        <!-- Preview Section -->
        <div class="flex flex-col items-center justify-start gap-3" style="width: 280px;">
          <span class="text-sm font-medium text-gray-700 mb-2">Preview</span>
          <canvas
            bind:this={previewCanvas}
            width={img && imgWidth ? cropWidth * (img.width / imgWidth) : 100}
            height={img && imgHeight ? cropHeight * (img.height / imgHeight) : 100}
            class="hidden"
          ></canvas>
          {#if imageLoaded && previewImageUrl}
            <MenuItemV0 
              menuItem={{...previewMenuItem, imageUrl: previewImageUrl}}
              count={0}
            />
          {:else}
            <div class="relative w-full">
              <div class="relative rounded-3xl overflow-hidden h-full flex flex-col">
                <div class="flex-1 relative overflow-hidden rounded-3xl shadow-md bg-gray-100" style="margin: 1rem; margin-bottom: -20%; aspect-ratio: 386 / 384;">
                  <div class="w-full h-full flex items-center justify-center">
                    <span class="text-sm text-gray-400">No preview</span>
                  </div>
                </div>
                
                <div
                  class="w-full py-4 flex items-center justify-between backdrop-blur-xs rounded-3xl border border-black/20 shadow-lg"
                  style="background-color: rgba(255, 255, 255, 0.25);"
                >
                  <div class="flex flex-col items-start justify-between w-full px-4">
                    <span class="text-xs text-gray-400">Waiting for image...</span>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Controls -->
      <div class="px-4 py-3 bg-gray-50 border-t border-b space-y-3">
        <!-- Aspect Ratio Toggle -->
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700">Aspect Ratio:</span>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => {
                aspectRatioMode = "free";
                if (imageLoaded && img) {
                  loadImage();
                }
              }}
              class="px-3 py-1.5 text-sm rounded {aspectRatioMode === 'free' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}"
            >
              Free
            </button>
            <button
              type="button"
              onclick={() => {
                aspectRatioMode = "3:4";
                if (imageLoaded && img) {
                  // Adjust current crop to 3:4 ratio
                  const newHeight = cropWidth / ASPECT_RATIO_3_4;
                  if (cropY + newHeight <= imgY + imgHeight) {
                    cropHeight = newHeight;
                  } else {
                    cropHeight = imgY + imgHeight - cropY;
                    cropWidth = cropHeight * ASPECT_RATIO_3_4;
                  }
                  draw();
                }
              }}
              class="px-3 py-1.5 text-sm rounded {aspectRatioMode === '3:4' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}"
            >
              3:4 Portrait
            </button>
            <button
              type="button"
              onclick={() => {
                aspectRatioMode = "386:384";
                if (imageLoaded && img) {
                  loadImage();
                }
              }}
              class="px-3 py-1.5 text-sm rounded {aspectRatioMode === '386:384' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}"
            >
              386:384 (Max)
            </button>
          </div>
        </div>
        
        <!-- Instructions -->
        <p class="text-sm text-gray-600">
          <span class="font-medium">Tip:</span> Drag the blue box to move the crop area. Drag the corners to resize.
          {#if aspectRatioMode === "3:4"}
            <span class="text-blue-600"> (Maintaining 3:4 portrait aspect ratio)</span>
          {:else if aspectRatioMode === "386:384"}
            <span class="text-blue-600"> (Maintaining 386:384 aspect ratio, maximized)</span>
          {/if}
        </p>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 p-4">
        <Button variant="outline" onclick={handleCancel}>
          Cancel
        </Button>
        <Button onclick={handleSave}>
          Save Cropped Image
        </Button>
      </div>
    </div>
  </div>
{/if}
