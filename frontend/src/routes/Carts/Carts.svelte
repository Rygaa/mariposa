<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import TableOrdersModal from "./components/TableOrdersModal.svelte";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";
  import Page from "../../lib/shadcn/Page.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../lib/shadcn/Card/index";
  import Button from "../../lib/components/Button.svelte";

  let orders = $state<any[]>([]);
  let tables = $state<any[]>([]);
  let isLoading = $state(false);
  let searchQuery = $state("");
  let selectedTable = $state<any>(null);
  let isTableOrdersModalOpen = $state(false);

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    try {
      // Load orders and tables
      const [ordersResult, tablesResult] = await Promise.all([
        trpc.listOrdersWithRelations.query({ status: "CONFIRMED" }),
        trpc.listEatingTables.query({}),
      ]);

      if (ordersResult.success) {
        // Filter confirmed orders only
        orders = ordersResult.orders;
      }

      if (tablesResult.success) {
        tables = tablesResult.eatingTables || [];
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    isLoading = false;
  }

  // Group orders by table
  const tablesWithOrders = $derived(() => {
    return tables
      .map((table) => {
        const tableOrders = orders.filter(
          (order) => order.eatingTableId === table.id
        );
        console.log(orders);
        console.log("Table Orders:", tableOrders);
        const totalAmount = tableOrders.reduce((sum, order) => {
          if (!order.menuItemOrders) return sum;
          return (
            sum +
            order.menuItemOrders.reduce(
              (orderSum: number, mio: any) =>
                orderSum + mio.price * mio.quantity,
              0
            )
          );
        }, 0);

        return {
          ...table,
          unpaidOrdersCount: tableOrders.length,
          totalAmount,
          orders: tableOrders,
        };
      })
      .filter((table) => {
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            table.name?.toLowerCase().includes(query) ||
            table.tableNumber?.toString().includes(query) ||
            table.id.toLowerCase().includes(query)
          );
        }
        return true;
      });
  });

  function handleTableClick(table: any) {
    if (table.unpaidOrdersCount > 0) {
      selectedTable = table;
      isTableOrdersModalOpen = true;
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  async function handleOrdersUpdated() {
    await loadData();
  }
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Confirmed Orders by Table</CardTitle>
    </CardHeader>
    <CardContent class="px-4 flex flex-col">
      <div class="mb-6">
        <div
          class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          <div class="flex-1 max-w-md w-full">
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Icon iconName="search" class="text-gray-400" />
              </div>
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search tables..."
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-600">
            <div class="flex items-center gap-2">
              <span class="font-medium"
                >{tablesWithOrders().filter((t) => t.unpaidOrdersCount > 0)
                  .length}</span
              >
              <span>tables with confirmed orders</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-medium">{orders.length}</span>
              <span>total confirmed orders</span>
            </div>
          </div>
        </div>
      </div>

      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
          ></div>
        </div>
      {:else if tablesWithOrders().length === 0}
        <div class="text-center py-12">
          <Icon
            iconName="table_restaurant"
            class="text-gray-300 text-6xl mx-auto mb-4"
          />
          <p class="text-gray-500 text-lg">
            {searchQuery
              ? "No tables found matching your search"
              : "No tables available"}
          </p>
        </div>
      {:else}
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {#each tablesWithOrders() as table (table.id)}
            <button
              onclick={() => handleTableClick(table)}
              class="relative bg-white border-2 rounded-lg p-6 transition-all text-left {table.unpaidOrdersCount >
              0
                ? 'border-orange-300 hover:border-orange-400 hover:shadow-lg cursor-pointer'
                : 'border-gray-200 cursor-default opacity-60'}"
            >
              {#if table.unpaidOrdersCount > 0}
                <div
                  class="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                >
                  {table.unpaidOrdersCount}
                </div>
              {/if}

              <div class="flex flex-col items-center justify-center space-y-3">
                <Icon
                  iconName="table_restaurant"
                  class="text-4xl {table.unpaidOrdersCount > 0
                    ? 'text-orange-500'
                    : 'text-gray-400'}"
                />

                <div class="text-center w-full">
                  <h3 class="font-semibold text-gray-900 text-lg truncate">
                    {table.name ||
                      `Table ${table.tableNumber || table.id.slice(0, 8)}`}
                  </h3>

                  {#if table.unpaidOrdersCount > 0}
                    <p class="text-sm text-orange-600 font-medium mt-1">
                      {table.unpaidOrdersCount} confirmed {table.unpaidOrdersCount ===
                      1
                        ? "order"
                        : "orders"}
                    </p>
                    <p class="text-lg font-bold text-gray-900 mt-2">
                      {formatCurrency(table.totalAmount)}
                    </p>
                  {:else}
                    <p class="text-sm text-gray-500 mt-1">
                      No confirmed orders
                    </p>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>
</Page>

{#if selectedTable}
  <TableOrdersModal
    bind:isOpen={isTableOrdersModalOpen}
    table={selectedTable}
    onOrdersUpdated={handleOrdersUpdated}
  />
{/if}
