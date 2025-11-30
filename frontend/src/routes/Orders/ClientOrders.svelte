<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import CreateOrderModal from "./components/CreateOrderModal.svelte";
  import ViewMoreModal from "./components/ViewMoreModal.svelte";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";
  import Page from "../../lib/shadcn/Page.svelte";
  import DataDisplayer from "../../lib/shadcn/DataDisplayer.svelte";
  import DataGrid from "../../lib/shadcn/DataGrid.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../lib/shadcn/Card/index";
  import { _adminStore } from "../../store/admin.svelte";

  let isLoading = $state(false);
  let dateRange = $state<string>("today");
  let customFrom = $state<string>("");
  let customTo = $state<string>("");
  let isViewMoreModalOpen = $state(false);
  let selectedOrder = $state<any>(null);
  let showDeleted = $state(false);

  onMount(() => {
    _adminStore.loadOrders(showDeleted);
  });

  async function handleDelete(orderId: string) {
    if (confirm('Are you sure you want to delete this order?')) {
      const success = await _adminStore.deleteOrder(orderId);
      if (success) {
        await _adminStore.loadOrders(showDeleted);
      }
    }
  }

  $effect(() => {
    _adminStore.loadOrders(showDeleted);
  });
 


  // Convert UTC to Algerian time (UTC+1)
  function toAlgerianTime(date: Date): Date {
    const algerianOffset = 1 * 60; // UTC+1 in minutes
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utcTime + (algerianOffset * 60000));
  }

  function getDateRange() {
    const now = toAlgerianTime(new Date());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case "today":
        return {
          from: today,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          from: yesterday,
          to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case "last-week":
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          from: lastWeek,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case "last-month":
        const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          from: lastMonth,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case "custom":
        if (customFrom && customTo) {
          return {
            from: new Date(customFrom),
            to: new Date(new Date(customTo).getTime() + 24 * 60 * 60 * 1000 - 1)
          };
        }
        return null;
      default:
        return null;
    }
  }



  const filteredOrders = $derived.by(() => {
    const range = getDateRange();
    
    return _adminStore.orders.filter((order) => {
      if (range) {
        const orderDate = toAlgerianTime(new Date(order.createdAt));
        if (orderDate < range.from || orderDate > range.to) {
          return false;
        }
      }
      return true;
    });
  });


  import { calculateOrderTotal, calculateOrderDeprecatedTotal } from "../../utils/calcule";

  const gridData = $derived(
    filteredOrders.map((order) => {
      const total = calculateOrderTotal(order.menuItemOrders || []);
      const deprecatedTotal = calculateOrderDeprecatedTotal(order.menuItemOrders || []);
      const hasCalculationError = Math.abs(total - deprecatedTotal) > 0.01;
      
      const algerianDate = toAlgerianTime(new Date(order.createdAt));
      const formattedDate = algerianDate.toLocaleDateString('en-GB');
      const formattedTime = algerianDate.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      
      return {
        ID: order.id,
        Status: order.status,
        Table: order.eatingTable?.name || "N/A",
        Total: `$${total.toFixed(2)}`,
        Valid: hasCalculationError ? '⚠️' : '✓',
        Created: `${formattedDate} ${formattedTime}`,
        _isDeleted: !!order.deletedAt,
        _hasError: hasCalculationError,
      };
    })
  );

  function openViewMoreModal(orderId: string) {
    const order = filteredOrders.find(o => o.id === orderId);
    if (order) {
      selectedOrder = order;
      isViewMoreModalOpen = true;
    }
  }

  function closeViewMoreModal() {
    isViewMoreModalOpen = false;
    selectedOrder = null;
  }


  const dateRangeOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last-week", label: "Last Week" },
    { value: "last-month", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ];


      $effect(() => {
      console.log(_adminStore.orders)
      console.log(filteredOrders)
      console.log(gridData)
  });
 
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Orders</CardTitle>
      <CreateOrderModal onOrderCreated={() => _adminStore.loadOrders()} />
    </CardHeader>
    <CardContent class="px-4 flex flex-col">
      <div class="mb-6">
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="showDeleted"
              bind:checked={showDeleted}
              class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label for="showDeleted" class="text-sm font-medium text-gray-700">
              Show deleted orders
            </label>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each dateRangeOptions as option}
              <button
                onclick={() => dateRange = option.value}
                class="px-4 py-2 rounded-lg border transition-colors {dateRange === option.value 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
              >
                {option.label}
              </button>
            {/each}
          </div>

          {#if dateRange === "custom"}
            <div class="flex flex-wrap gap-4">
              <div>
                <label for="customFrom" class="block text-sm font-medium text-gray-700 mb-1">
                  From
                </label>
                <input
                  id="customFrom"
                  type="date"
                  bind:value={customFrom}
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label for="customTo" class="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <input
                  id="customTo"
                  type="date"
                  bind:value={customTo}
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          {/if}
        </div>
      </div>

      <DataDisplayer {isLoading} isEmpty={filteredOrders.length === 0}>
        <DataGrid data={gridData} tableId="orders-table" excludeFilters={["ID", "Created"]}>
          {#snippet actions(row)}
            <div class="flex gap-2">
              <button
                onclick={() => openViewMoreModal(row.ID)}
                class="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
              >
                View Items
              </button>
              <button
                onclick={() => handleDelete(row.ID)}
                class="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          {/snippet}
        </DataGrid>
      </DataDisplayer>
    </CardContent>
  </Card>

  <ViewMoreModal
    bind:isOpen={isViewMoreModalOpen}
    order={selectedOrder}
    onClose={closeViewMoreModal}
  />
</Page>

