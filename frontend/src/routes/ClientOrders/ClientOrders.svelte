<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "../../lib/trpc";
  import Button from "../../lib/components/Button.svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import Page from "../../lib/shadcn/Page.svelte";
  import MenuItem from "./components/MenuItem.svelte";
  import SelectTableModal from "./components/SelectTableModal.svelte";
  import type {
    listEatingTables,
    listCategories,
    listMenuItems,
    getOrderByIdWithRelations,
  } from "../../../../backend/src/router.types";

  let eatingTables = $state<listEatingTables["eatingTables"]>([]);
  let categories = $state<listCategories["categories"]>([]);
  let menuItems = $state<listMenuItems["menuItems"]>([]);
  let selectedTableId = $state("");
  let selectedCategoryId = $state("");
  let currentOrder = $state<getOrderByIdWithRelations["order"] | null>(null);
  let isSelectTableModalOpen = $state(false);
  let isLoading = $state(false);

  // Get the selected table
  const selectedTable = $derived(
    eatingTables.find((t: any) => t.id === selectedTableId) || null
  );

  // Filter menu items by selected category
  const filteredMenuItems = $derived(
    selectedCategoryId
      ? menuItems.filter(
          (item: any) =>
            item.categoryId === selectedCategoryId &&
            item.type?.includes("MENU_ITEM")
        )
      : []
  );

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

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    try {
      const response1 = await trpc.listEatingTables.query();
      const response2 = await trpc.listCategories.query();
      const response3 = await trpc.listAllMenuItems.query({shouldIncludeSupplements: true});
      eatingTables = response1.eatingTables;
      categories = response2.categories.filter((c: any) => !c.isUnlisted);
      menuItems = response3.menuItems;

      // Select default table if available
      const defaultTable = eatingTables.find((t: any) => t.isDefault);
      if (defaultTable) {
        await handleTableSelect(defaultTable.id);
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
      });

      // Reload order
      await reloadOrder();
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Erreur lors de l'ajout de l'article");
    } finally {
      isLoading = false;
    }
  }

  async function handleRemoveMenuItem(menuItemId: string) {
    if (!currentOrder) return;

    isLoading = true;
    try {
      // Find a menu item order for this menu item
      const menuItemOrder = currentOrder.menuItemOrders?.find(
        (mio: any) => mio.menuItemId === menuItemId
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
      await trpc.updateOrder.mutate({
        id: currentOrder.id,
        status: "CONFIRMED",
      });

      alert("Commande confirmée avec succès!");

      // Create a new order for the same table
      await handleTableSelect(selectedTableId);
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

<Page>
  <!-- Hidden button for changing table (triple-click on header instead) -->
  <button
    onclick={handleHeaderClick}
    class="fixed top-3 right-3 sm:top-4 sm:right-4 bg-gray-500 text-white p-2 sm:p-3 rounded text-sm sm:text-base z-50 opacity-0"
  >
    Changer de table
  </button>

  <SelectTableModal
    bind:open={isSelectTableModalOpen}
    {eatingTables}
    bind:selectedTableId
    onTableSelect={handleTableSelect}
  />

  <div class="flex flex-col h-full">
    <!-- Header -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col items-start mx-4 mt-4"
      onclick={handleHeaderClick}
    >
      <p
        class="text-gray-800 text-2xl sm:text-3xl md:text-4xl text-left font-bold"
      >
        Bienvenue à Mariposa
      </p>
      <p
        class="text-gray-700 text-base sm:text-lg md:text-xl text-left font-medium mt-2"
      >
        Un havre de paix pour savourer une infusion, des douceurs… et l'instant
        présent.
      </p>
      {#if selectedTable}
        <p
          class="text-base sm:text-lg md:text-xl font-medium text-red-500 mt-2"
        >
          Vous êtes à la {selectedTable.name}.
        </p>
      {:else}
        <button
          onclick={openTableModal}
          class="text-base sm:text-lg md:text-xl font-medium text-blue-500 mt-2 hover:underline"
        >
          Veuillez sélectionner une table.
        </button>
      {/if}
    </div>

    <!-- Category tabs -->
    <div
      class="flex my-4 overflow-x-auto whitespace-nowrap gap-x-5 bg-gray-50 px-4"
    >
      {#each categories as category (category.id)}
        <button
          onclick={() => (selectedCategoryId = category.id)}
          class="flex-shrink-0 flex items-center justify-center cursor-pointer py-3 px-6 h-full border-b-4 transition-colors {selectedCategoryId ===
          category.id
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-700 hover:text-gray-900'}"
        >
          {#if category.iconname}
            <Icon iconName={category.iconname} />
          {/if}
          <p
            class="font-semibold text-[13.5px] sm:text-[20px] tracking-wider px-3"
          >
            {category.name}
          </p>
        </button>
      {/each}
    </div>

    <!-- Menu items -->
    <div class="flex-1 overflow-y-auto pb-24">
      {#if selectedTable}
        {#if filteredMenuItems.length > 0}
          {#each filteredMenuItems as item (item.id)}
            <MenuItem
              menuItem={item}
              count={itemCounts[item.id] || 0}
              onAdd={() => handleAddMenuItem(item.id)}
              onRemove={() => handleRemoveMenuItem(item.id)}
              onAddSupplement={(suppId: string) =>
                handleAddSupplement(item.id, suppId)}
            />
          {/each}
        {:else}
          <p class="text-gray-500 text-lg font-medium text-center mt-8">
            Aucun article disponible dans cette catégorie.
          </p>
        {/if}
      {:else}
        <p class="text-gray-500 text-lg font-medium text-center mt-8">
          Veuillez sélectionner une table pour voir le menu.
        </p>
      {/if}
    </div>

    <!-- Footer with total and confirm button -->
    <div
      class="fixed bottom-0 left-0 right-0 flex justify-between items-center h-[100px] border-t border-gray-300 bg-white px-4 gap-4"
    >
      <p class="text-gray-800 text-xl font-medium">
        Total: <span class="font-bold">{totalPrice.toFixed(2)} DZD</span>
      </p>
      <Button
        onclick={confirmOrder}
        disabled={!currentOrder ||
          currentOrder.menuItemOrders?.length === 0 ||
          isLoading}
      >
        Confirmer
      </Button>
    </div>
  </div>
</Page>
