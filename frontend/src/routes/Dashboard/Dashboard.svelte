<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { trpc } from "../../lib/trpc";
  import Page from "../../lib/shadcn/Page.svelte";
  import UpdateRawMaterialStock from "../MenuItems/components/UpdateRawMaterialStock.svelte";
  import ManageTransfertStockModal from "./components/ManageTransfertStockModal.svelte";
  import LogsModal from "./components/LogsModal.svelte";
  import DataGrid from "../../lib/shadcn/DataGrid.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../lib/shadcn/Card/index";

  let menuItems = $state<any[]>([]);
  let isLoading = $state(false);
  let isStockModalOpen = $state(false);
  let stockModalMode = $state<"add" | "subtract">("add");
  let isTransferModalOpen = $state(false);
  let isLogsModalOpen = $state(false);
  let todayLogs = $state<any[]>([]);
  let isLoadingLogs = $state(false);
  let isDeletingPurchases = $state(false);
  let totalStockValue = $state({ inHouse: 0, inShop: 0, total: 0 });

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    await loadMenuItems();
    await loadTodayLogs();
  });

  async function loadMenuItems() {
    isLoading = true;
    try {
      const result = await trpc.listAllMenuItems.query({
        type: ["RAW_MATERIAL"],
      });
      if (result.success) {
        menuItems = result.menuItems;
        await calculateTotalStockValue();
      }
    } catch (error) {
      console.error("Error loading menu items:", error);
    }
    isLoading = false;
  }

  async function calculateTotalStockValue() {
    let inHouseTotal = 0;
    let inShopTotal = 0;

    for (const item of menuItems) {
      try {
        const result = await trpc.listItemPricesByMenuItem.query({
          menuItemId: item.id,
          priceType: "buying",
        });
        
        if (result.success) {
          const prices = result.itemPrices.filter((p: any) => !p.isTemplate);
          
          for (const price of prices) {
            const isInShop = price.description?.includes("[in-shop]");
            if (isInShop) {
              inShopTotal += price.priceValue || 0;
            } else {
              inHouseTotal += price.priceValue || 0;
            }
          }
        }
      } catch (error) {
        console.error(`Error loading prices for ${item.name}:`, error);
      }
    }

    totalStockValue = {
      inHouse: inHouseTotal,
      inShop: inShopTotal,
      total: inHouseTotal + inShopTotal,
    };
  }

  function handleCloseStockModal() {
    isStockModalOpen = false;
  }

  async function handleStockUpdated() {
    await loadMenuItems();
    await loadTodayLogs();
    await calculateTotalStockValue();
  }

  async function loadTodayLogs() {
    isLoadingLogs = true;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const result = await trpc.getLogs.query({
        startDate: startOfDay.toISOString(),
        limit: 100,
      });
      
      if (result.success) {
        // Filter only transfer actions
        todayLogs = result.logs.filter((log: any) => 
          log.action.includes("TRANSFER_STOCK")
        );
      }
    } catch (error) {
      console.error("Error loading today's logs:", error);
    }
    isLoadingLogs = false;
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getTransferDirection(action: string): string {
    if (action === "TRANSFER_STOCK_TO_SHOP") return "→ Shop";
    if (action === "TRANSFER_STOCK_TO_HOUSE") return "→ House";
    return "";
  }

  const gridData = $derived(
    todayLogs.map((log) => ({
      Time: formatTime(log.timestamp),
      Item: log.request.menuItemName,
      Direction: `${log.request.from} ${getTransferDirection(log.action)}`,
      Quantity: log.request.quantity,
      User: log.userName || "Unknown",
      "House Stock": `${log.request.previousInHouse} → ${log.request.newInHouse}`,
      "Shop Stock": `${log.request.previousInShop} → ${log.request.newInShop}`,
    }))
  );

  function openManageStocks() {
    stockModalMode = "add";
    isStockModalOpen = true;
  }

  function openTransferModal() {
    isTransferModalOpen = true;
  }

  function handleCloseTransferModal() {
    isTransferModalOpen = false;
  }

  function openLogsModal() {
    isLogsModalOpen = true;
  }

  function handleCloseLogsModal() {
    isLogsModalOpen = false;
  }

  async function handleDeleteAllPurchases() {
    if (!confirm("Are you sure you want to delete ALL purchase records? This will keep price templates but remove all purchase history. This action cannot be undone.")) {
      return;
    }
    
    isDeletingPurchases = true;
    try {
      const result = await trpc.deleteAllNonTemplateItemPrices.mutate();
      if (result.success) {
        alert(`Successfully deleted ${result.deletedCount} purchase records.`);
        await loadMenuItems();
      }
    } catch (error: any) {
      console.error("Error deleting purchase records:", error);
      alert(error.message || "Failed to delete purchase records");
    } finally {
      isDeletingPurchases = false;
    }
  }
</script>

<Page>
  <Card useAvailableHeight>
    <CardHeader>
      <CardTitle>Dashboard</CardTitle>
      
      <!-- Total Stock Value Display -->
      <div class="grid grid-cols-3 gap-4 my-4">
        <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="text-sm text-blue-600 font-medium">In-House Stock</div>
          <div class="text-2xl font-bold text-blue-900">${totalStockValue.inHouse.toFixed(2)}</div>
        </div>
        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
          <div class="text-sm text-green-600 font-medium">In-Shop Stock</div>
          <div class="text-2xl font-bold text-green-900">${totalStockValue.inShop.toFixed(2)}</div>
        </div>
        <div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div class="text-sm text-purple-600 font-medium">Total Stock Value</div>
          <div class="text-2xl font-bold text-purple-900">${totalStockValue.total.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button
          onclick={openManageStocks}
          class="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          Manage Stocks
        </button>
        <button
          onclick={openTransferModal}
          class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Transfer Stock
        </button>
        <button
          onclick={openLogsModal}
          class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          View Logs
        </button>
        <button
          onclick={handleDeleteAllPurchases}
          disabled={isDeletingPurchases}
          class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isDeletingPurchases ? "Deleting..." : "Clear Purchase History"}
        </button>
      </div>
    </CardHeader>
    <CardContent class="p-4 " >
        <div class="flex flex-col w-full">
          <h3 class="text-lg font-semibold mb-3">Today's Stock Transfers</h3>
          
          {#if isLoadingLogs}
            <div class="text-center py-8 text-gray-500">
              Loading transfers...
            </div>
          {:else if todayLogs.length === 0}
            <div class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              No transfers recorded today
            </div>
          {:else}
            <DataGrid 
              data={gridData}
              tableId="dashboard-transfers"
              inputFilters={["Item", "User"]}
              excludeFilters={["Time"]}
            />
          {/if}
        </div>
    </CardContent>
  </Card>
</Page>

<UpdateRawMaterialStock
  bind:isOpen={isStockModalOpen}
  onClose={handleCloseStockModal}
  onStockUpdated={handleStockUpdated}
/>

<ManageTransfertStockModal
  bind:isOpen={isTransferModalOpen}
  menuItems={menuItems}
  onClose={handleCloseTransferModal}
  onStockUpdated={handleStockUpdated}
/>

<LogsModal
  bind:isOpen={isLogsModalOpen}
  onClose={handleCloseLogsModal}
/>
