<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "../../lib/trpc";
  import Button from "../../lib/components/Button.svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import MenuItem from "./components/MenuItemV0.svelte";
  import SelectTableModal from "./components/SelectTableModal.svelte";
  import CartSidebar from "./components/CartSidebar.svelte";
  import SupplementsModal from "./components/SupplementsModal.svelte";
  import type {
    listEatingTables,
    listCategories,
    listMenuItems,
    getOrderByIdWithRelations,
  } from "../../../../backend/src/router.types";
  import AvailableHeightContainer from "../../lib/components/AvailableHeightContainer.svelte";

  interface Props {
    existingOrder?: any;
    onConfirm?: () => void | Promise<void>;
  }

  let { existingOrder, onConfirm }: Props = $props();

  // Theme colors
  const fromColor = "#DFA1CD";
  const toColor = "#C77DB5";

  let eatingTables = $state<listEatingTables["eatingTables"]>([]);
  let categories = $state<listCategories["categories"]>([]);
  let menuItems = $state<listMenuItems["menuItems"]>([]);
  let selectedTableId = $state("");
  let selectedCategoryId = $state("");
  let currentOrder = $state<getOrderByIdWithRelations["order"] | null>(null);
  let isSelectTableModalOpen = $state(false);
  let isLoading = $state(false);
  let isCartOpen = $state(false);
  let searchQuery = $state("");
  let isSupplementModalOpen = $state(false);
  let currentItemForSupplements = $state<any>(null);

  // Get the selected table
  const selectedTable = $derived(
    eatingTables.find((t: any) => t.id === selectedTableId) || null
  );

  // Filter menu items by selected category and search query
  const filteredMenuItems = $derived(() => {
    let items = menuItems.filter((item: any) =>
      item.type?.includes("MENU_ITEM") && item.isAvailable
    );

    if (selectedCategoryId) {
      items = items.filter(
        (item: any) => item.categoryId === selectedCategoryId
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item: any) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    // Sort by index (nulls last), then by name
    items.sort((a: any, b: any) => {
      if (a.index === null && b.index === null) return a.name?.localeCompare(b.name) || 0;
      if (a.index === null) return 1;
      if (b.index === null) return -1;
      return a.index - b.index;
    });

    return items;
  });

  // Calculate total price from current order
  const totalPrice = $derived(
    currentOrder?.menuItemOrders?.reduce(
      (sum: number, mio: any) => sum + mio.price * mio.quantity,
      0
    ) || 0
  );

  // Count items in order grouped by menuItemId
  const itemCounts = $derived(
    currentOrder?.menuItemOrders?.reduce(
      (acc: Record<string, number>, mio: any) => {
        acc[mio.menuItemId] = (acc[mio.menuItemId] || 0) + mio.quantity;
        return acc;
      },
      {} as Record<string, number>
    ) || {}
  );

  // Total items in cart - only count MENU_ITEM types, not supplements
  const totalItemsInCart = $derived(
    currentOrder?.menuItemOrders?.reduce(
      (sum: number, mio: any) => {
        const menuItem = menuItems.find((m: any) => m.id === mio.menuItemId);
        const isMainItem = menuItem?.type?.includes("MENU_ITEM");
        return isMainItem ? sum + mio.quantity : sum;
      },
      0
    ) || 0
  );

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    try {
      const response1 = await trpc.listEatingTables.query();
      const response2 = await trpc.listCategories.query();
      const response3 = await trpc.listAllMenuItems.query({
        shouldIncludeSupplements: true,
      });

      eatingTables = response1.eatingTables;
      categories = response2.categories.filter((c: any) => !c.isUnlisted);
      menuItems = response3.menuItems;

      // If an existing order is passed, use it
      if (existingOrder) {
        currentOrder = existingOrder;
        selectedTableId = existingOrder.eatingTableId;
      } else {
        // Select default table if available
        const defaultTable = eatingTables.find((t: any) => t.isDefault);
        if (defaultTable) {
          await handleTableSelect(defaultTable.id);
        }
      }

      // Select first category by default
      if (categories.length > 0) {
        selectedCategoryId = categories[0].id;
      }
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Erreur lors du chargement des données");
    } finally {
      isLoading = false;
    }
  }

  async function handleTableSelect(tableId: string) {
    // Don't allow table selection if an existing order was passed
    if (existingOrder) return;

    selectedTableId = tableId;
    isLoading = true;

    try {
      // Create a new order for this table
      const orderRes = await trpc.createOrder.mutate({
        eatingTableId: tableId,
        status: "INITIALIZED",
      });

      if (orderRes.success) {
        // Load the order with relations
        const orderWithRelations = await trpc.getOrderByIdWithRelations.query({
          id: orderRes.order.id,
        });
        currentOrder = orderWithRelations.order;
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Erreur lors de la création de la commande");
    } finally {
      isLoading = false;
    }
  }

  async function handleAddMenuItem(menuItemId: string) {
    if (!currentOrder) return;

    isLoading = true;
    try {
      const item = menuItems.find((m: any) => m.id === menuItemId);
      if (!item) return;

      await trpc.createMenuItemOrder.mutate({
        orderId: currentOrder.id,
        menuItemId,
        quantity: 1,
        price: item.price || 0,
        status: existingOrder ? currentOrder.status : "INITIALIZED",
      });

      // Reload order
      await reloadOrder();

      // Check if item has supplements and open modal if so
      const hasSupplements = item.subMenuItems?.some((subMenuItem: any) =>
        subMenuItem?.type?.includes("SUPPLEMENT")
      );

      if (hasSupplements) {
        currentItemForSupplements = item;
        isSupplementModalOpen = true;
      }
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Erreur lors de l'ajout de l'article");
    } finally {
      isLoading = false;
    }
  }

  async function handleRemoveMenuItem(menuItemOrderId: string) {
    if (!currentOrder) return;

    isLoading = true;
    try {
      // Find the specific menu item order by its ID
      const menuItemOrder = currentOrder.menuItemOrders?.find(
        (mio: any) => mio.id === menuItemOrderId
      );

      if (menuItemOrder) {
        if (menuItemOrder.quantity > 1) {
          // Decrease quantity
          await trpc.updateMenuItemOrderQuantity.mutate({
            id: menuItemOrder.id,
            quantity: menuItemOrder.quantity - 1,
          });
        } else {
          // Remove the item
          await trpc.deleteMenuItemOrder.mutate({
            id: menuItemOrder.id,
          });
        }

        // Reload order
        await reloadOrder();
      }
    } catch (error) {
      console.error("Error removing item:", error);
      alert("Erreur lors du retrait de l'article");
    } finally {
      isLoading = false;
    }
  }

  async function handleAddSupplement(menuItemId: string, supplementId: string) {
    if (!currentOrder) return;

    isLoading = true;
    try {
      const supplement = menuItems.find((m: any) => m.id === supplementId);
      if (!supplement) return;

      // Add supplement as a new menu item order
      await trpc.createMenuItemOrder.mutate({
        orderId: currentOrder.id,
        menuItemId: supplementId,
        quantity: 1,
        price: supplement.price || 0,
        status: existingOrder ? currentOrder.status : "INITIALIZED",
      });

      // Reload order
      await reloadOrder();
    } catch (error) {
      console.error("Error adding supplement:", error);
      alert("Erreur lors de l'ajout du supplément");
    } finally {
      isLoading = false;
    }
  }

  async function reloadOrder() {
    if (!currentOrder) return;

    try {
      const orderWithRelations = await trpc.getOrderByIdWithRelations.query({
        id: currentOrder.id,
      });
      currentOrder = orderWithRelations.order;
    } catch (error) {
      console.error("Error reloading order:", error);
    }
  }

  async function confirmOrder() {
    if (!currentOrder) return;

    isLoading = true;
    try {
      // Update order status to CONFIRMED
      await trpc.updateOrder.mutate({
        id: currentOrder.id,
        status: "CONFIRMED",
      });

      // If an existing order was passed, call onConfirm callback to close modal
      if (existingOrder && onConfirm) {
        await onConfirm();
      } else {
        // Create a new order for the same table
        await handleTableSelect(selectedTableId);
      }
      
      isCartOpen = false;
    } catch (error) {
      console.error("Error confirming order:", error);
      alert("Erreur lors de la confirmation de la commande");
    } finally {
      isLoading = false;
    }
  }

  function openTableModal() {
    isSelectTableModalOpen = true;
  }

  // Triple-click counter for opening table modal
  let clickCount = $state(0);
  let clickTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleHeaderClick() {
    // Don't allow table selection if an existing order was passed
    if (existingOrder) return;

    clickCount++;

    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }

    if (clickCount === 3) {
      openTableModal();
      clickCount = 0;
      return;
    }

    clickTimeout = setTimeout(() => {
      clickCount = 0;
    }, 2000);
  }
</script>

<div class="flex h-full w-full">


  <SelectTableModal
    bind:open={isSelectTableModalOpen}
    {eatingTables}
    bind:selectedTableId
    onTableSelect={handleTableSelect}
  />

  <CartSidebar
    bind:open={isCartOpen}
    {currentOrder}
    {menuItems}
    {itemCounts}
    {totalPrice}
    {isLoading}
    {fromColor}
    {toColor}
    onRemoveItem={handleRemoveMenuItem}
    onConfirm={confirmOrder}
  />

  {#if currentItemForSupplements}
    <SupplementsModal
      bind:open={isSupplementModalOpen}
      menuItem={currentItemForSupplements}
      onAddSupplement={(suppId) => handleAddSupplement(currentItemForSupplements.id, suppId)}
      {fromColor}
      {toColor}
    />
  {/if}

  <AvailableHeightContainer>
    <div
      class="flex flex-col h-full bg-gradient-to-br from-orange-50 via-white to-pink-50"
    >
      <!-- Modern Header with Search -->
      <div
        class="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm"
      >
        <div class="px-4 py-4">
          <!-- Logo and Cart Row -->
          <div class="flex justify-between items-center mb-4">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div onclick={handleHeaderClick} class="cursor-pointer">
              <div class="flex gap-2 items-center">
                <Icon iconName="mariposa" size="12" />
                <h1
                  class="text-2xl sm:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent"
                  style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
                >
                  Mariposa
                </h1>
              </div>

              {#if selectedTable}
                <p class="text-xs sm:text-sm text-gray-600 mt-1">
                  Vous etes a la table {selectedTable.name}
                </p>
              {/if}
            </div>

            <!-- Cart Button -->
            <div class="flex items-center gap-2">
              {#if totalItemsInCart > 0}
                <button
                  onclick={() => (isCartOpen = true)}
                  class="relative flex gap-x-4 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-heartbeat"
                  style="background-image: linear-gradient(to right, {fromColor}, {toColor});"
                >
                  Cliquez ici pour modifier

                  <div class="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {#if totalItemsInCart > 0}
                      <span class="font-bold">{totalItemsInCart}</span>
                    {/if}
                  </div>
            
                </button>
              {/if}
            </div>
          </div>
        </div>

        <!-- Category Pills -->
        <div class="flex overflow-x-auto gap-3 px-4 pb-3 no-scrollbar">
          <button
            onclick={() => (selectedCategoryId = "")}
            class="flex-shrink-0 px-5 py-2 rounded-full font-medium transition-all duration-300 {selectedCategoryId ===
            ''
              ? 'text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}"
            style={selectedCategoryId === ""
              ? `background-image: linear-gradient(to right, ${fromColor}, ${toColor});`
              : ""}
          >
            Tout
          </button>
          {#each categories as category (category.id)}
            <button
              onclick={() => (selectedCategoryId = category.id)}
              class="flex-shrink-0 px-5 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2 {selectedCategoryId ===
              category.id
                ? 'text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}"
              style={selectedCategoryId === category.id
                ? `background-image: linear-gradient(to right, ${fromColor}, ${toColor});`
                : ""}
            >
              {#if category.iconname}
                <Icon iconName={category.iconname} useFill={false} />
              {/if}
              {category.name}
            </button>
          {/each}
        </div>
      </div>

      <!-- Menu Items Grid -->
      <div class="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
        {#if !selectedTable}
          <div class="flex flex-col items-center justify-center h-full">
            <div
              class="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md"
            >
              <div class="flex justify-center mb-4">
                <Icon iconName="home" class="text-orange-400" size="20" />
              </div>
              <h3 class="text-2xl font-bold text-gray-800 mb-2">Bienvenue!</h3>
              <p class="text-gray-600 mb-6">
                Sélectionnez votre table pour commencer votre commande
              </p>
              <Button onclick={openTableModal}>Choisir une table</Button>
            </div>
          </div>
        {:else if filteredMenuItems().length > 0}
          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6 auto-rows-fr"
          >
            {#each filteredMenuItems() as item (item.id)}
              <MenuItem
                menuItem={item}
                count={itemCounts[item.id] || 0}
                {toColor}
                onAdd={() => handleAddMenuItem(item.id)}
                onRemove={() => handleRemoveMenuItem(item.id)}
                onAddSupplement={(suppId: string) =>
                  handleAddSupplement(item.id, suppId)}
              />
            {/each}

          </div>
        {:else}
          <div class="flex items-center justify-center h-full">
            <div class="text-center p-8">
              <div class="flex justify-center mb-4">
                <Icon iconName="empty" class="text-gray-300" size="16" />
              </div>
              <p class="text-gray-500 text-lg">
                {searchQuery
                  ? "Aucun résultat trouvé"
                  : "Aucun article disponible"}
              </p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </AvailableHeightContainer>
</div>

<style>
  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Hide all scrollbars globally */
  :global(*::-webkit-scrollbar) {
    display: none;
  }

  :global(*) {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Heartbeat animation */
  @keyframes heartbeat {
    0% {
      transform: scale(1);
    }
    14% {
      transform: scale(1.1);
    }
    28% {
      transform: scale(1);
    }
    42% {
      transform: scale(1.1);
    }
    70% {
      transform: scale(1);
    }
  }

  .animate-heartbeat {
    animation: heartbeat 1.5s ease-in-out infinite;
  }

  .animate-heartbeat:hover {
    animation: none;
  }
</style>
