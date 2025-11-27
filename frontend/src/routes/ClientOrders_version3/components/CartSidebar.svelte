<script lang="ts">
  import Icon from "../../../lib/components/Icon.svelte";
  import type { getOrderByIdWithRelations } from "../../../../../backend/src/router.types";

  let {
    open = $bindable(false),
    currentOrder,
    menuItems,
    itemCounts,
    totalPrice,
    isLoading,
    onRemoveItem,
    onConfirm,
    fromColor = "#DFA1CD",
    toColor = "#C77DB5",
  }: {
    open?: boolean;
    currentOrder: getOrderByIdWithRelations["order"] | null;
    menuItems: any[];
    itemCounts: Record<string, number>;
    totalPrice: number;
    isLoading: boolean;
    onRemoveItem?: (menuItemOrderId: string) => void | Promise<void>;
    onConfirm?: () => void | Promise<void>;
    fromColor?: string;
    toColor?: string;
  } = $props();

  // Group menu items with their supplements and options
  const orderItems = $derived.by(() => {
    const orders = currentOrder?.menuItemOrders || [];
    const grouped: any[] = [];
    
    // Sort by creation time to maintain order
    const sortedOrders = [...orders].sort((a: any, b: any) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    let currentGroup: any = null;
    
    for (const mio of sortedOrders) {
      const menuItem = menuItems.find((m: any) => m.id === mio.menuItemId);
      const isMainItem = menuItem?.type?.includes("MENU_ITEM");
      const isSupplement = menuItem?.type?.includes("SUPPLEMENT");
      const isOption = menuItem?.type?.includes("MENU_ITEM_OPTION");
      
      const orderItem = {
        menuItemOrderId: mio.id,
        menuItemId: mio.menuItemId,
        menuItem,
        quantity: mio.quantity,
        price: mio.price,
        subtotal: mio.price * mio.quantity,
      };
      
      if (isMainItem) {
        // Start a new group for main items
        currentGroup = {
          ...orderItem,
          supplements: [],
          options: [],
        };
        grouped.push(currentGroup);
      } else if ((isSupplement || isOption) && currentGroup) {
        // Add supplement or option to the current group
        if (isOption) {
          currentGroup.options.push(orderItem);
        } else {
          currentGroup.supplements.push(orderItem);
        }
        currentGroup.subtotal += orderItem.subtotal;
      } else {
        // Fallback: treat as standalone item
        grouped.push({
          ...orderItem,
          supplements: [],
          options: [],
        });
        currentGroup = null;
      }
    }
    
    return grouped;
  });

  function closeSidebar() {
    open = false;
  }
</script>

<!-- Overlay -->
{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
    onclick={closeSidebar}
  ></div>
{/if}

<!-- Sidebar -->
<div
  class="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col {open
    ? 'translate-x-0'
    : 'translate-x-full'}"
>
  <!-- Header -->
  <div
    class="flex items-center justify-between p-6 border-b border-gray-200"
    style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
  >
    <h2 class="text-2xl font-bold text-white">Votre Commande</h2>
    <button
      onclick={closeSidebar}
      class="p-2 rounded-full bg-white/75 hover:bg-white/30 transition-colors flex items-center justify-center"
    >
      <Icon iconName="close" class="text-white" size="5" />
    </button>
  </div>

  <!-- Cart Items -->
  <div class="flex-1 overflow-y-auto p-6">
    {#if orderItems.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center">
        <h3 class="text-xl font-semibold text-gray-700 mb-2">Panier vide</h3>
        <p class="text-gray-500">Ajoutez des articles pour commencer</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each orderItems as item (item.menuItemOrderId)}
          <div
            class="rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:shadow-md transition-all"
          >
            <!-- Main Item -->
            <div class="flex items-center gap-4 p-4">
              <div class="flex-1">
                <h4 class="font-bold text-gray-900 mb-1">
                  {item.menuItem?.name || "Article inconnu"}
                </h4>
                <p class="text-sm text-gray-600 mb-2">
                  {item.price} DZD × {item.quantity}
                </p>
                
                {#if item.options && item.options.length > 0}
                  <!-- Options -->
                  <div class="mt-2 pl-4 border-l-2 border-blue-300 space-y-1">
                    {#each item.options as option}
                      <div class="flex items-center justify-between text-sm">
                        <div class="flex-1">
                          <span class="text-blue-700">• {option.menuItem?.name}</span>
                          {#if option.price > 0}
                            <span class="text-gray-500 ml-2">
                              ({option.price} DZD × {option.quantity})
                            </span>
                          {/if}
                        </div>
                        <button
                          onclick={() => onRemoveItem?.(option.menuItemOrderId)}
                          disabled={isLoading}
                          class="ml-2 p-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Icon iconName="trash" class="text-red-600" size="4" />
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
                
                {#if item.supplements && item.supplements.length > 0}
                  <!-- Supplements -->
                  <div class="mt-2 pl-4 border-l-2 border-gray-300 space-y-1">
                    {#each item.supplements as supplement}
                      <div class="flex items-center justify-between text-sm">
                        <div class="flex-1">
                          <span class="text-gray-700">+ {supplement.menuItem?.name}</span>
                          <span class="text-gray-500 ml-2">
                            ({supplement.price} DZD × {supplement.quantity})
                          </span>
                        </div>
                        <button
                          onclick={() => onRemoveItem?.(supplement.menuItemOrderId)}
                          disabled={isLoading}
                          class="ml-2 p-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Icon iconName="trash" class="text-red-600" size="4" />
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
                <p class="font-bold text-orange-600 mt-2">
                  {item.subtotal.toFixed(2)} DZD
                </p>
              </div>
              <button
                onclick={() => onRemoveItem?.(item.menuItemOrderId)}
                disabled={isLoading}
                class="flex-shrink-0 p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors disabled:opacity-50"
              >
                <Icon iconName="trash" class="text-red-600" size="5" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="border-t border-gray-200 p-6 bg-gray-50">
    <!-- Total -->
    <div class="flex justify-between items-center mb-6 text-xl">
      <span class="font-semibold text-gray-700">Total:</span>
      <span
        class="font-bold text-2xl bg-gradient-to-r bg-clip-text text-transparent"
        style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
      >
        {totalPrice.toFixed(2)} DZD
      </span>
    </div>

    <!-- Confirm Button -->
    <button
      onclick={onConfirm}
      disabled={!currentOrder ||
        currentOrder.menuItemOrders?.length === 0 ||
        isLoading}
      class="w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
    >
      {#if isLoading}
        <div class="flex items-center justify-center gap-2">
          <div
            class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
          ></div>
          <span>Traitement...</span>
        </div>
      {:else}
        Confirmer la commande
      {/if}
    </button>
  </div>
</div>
