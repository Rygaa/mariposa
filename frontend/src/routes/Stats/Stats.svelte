<script lang="ts">
  import { onMount } from "svelte";
  import { _globalStore } from "../../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";
  import Page from "../../lib/shadcn/Page.svelte";
  import DataDisplayer from "../../lib/shadcn/DataDisplayer.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "../../lib/shadcn/Card/index";
  import { DateTimePicker } from "../../lib/shadcn";

  type Period = "today" | "yesterday" | "lastWeek" | "custom";

  let isLoading = $state(false);
  let selectedPeriod = $state<Period>("today");
  let fromValue = $state<Date | undefined>(undefined);
  let toValue = $state<Date | undefined>(undefined);
  let revenueData = $state<{
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    period: string;
  } | null>(null);
  
  let salesData = $state<{
    menuItems: Array<{
      id: string;
      name: string;
      type: string[];
      quantitySold: number;
      revenue: number;
    }>;
    supplements: Array<{
      id: string;
      name: string;
      quantitySold: number;
      revenue: number;
    }>;
  } | null>(null);
  
  let rawMaterialData = $state<Array<{
    id: string;
    name: string;
    unit: string | null;
    totalQuantityUsed: number;
  }> | null>(null);

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    await loadRevenueData("today");
  });

  async function loadRevenueData(period: Period, from?: Date | undefined, to?: Date | undefined) {
    isLoading = true;
    selectedPeriod = period;

    try {
      // If custom range is provided, include it in the queries. Backend should handle these keys if supported.
      const revenueArgs: any = { period };
      const salesArgs: any = { period };
      const rawArgs: any = { period };

      if (period === 'custom') {
        if (from) {
          const fromISO = from.toISOString();
          revenueArgs.from = fromISO;
          salesArgs.from = fromISO;
          rawArgs.from = fromISO;
        }
        if (to) {
          const toISO = to.toISOString();
          revenueArgs.to = toISO;
          salesArgs.to = toISO;
          rawArgs.to = toISO;
        }
      }

      const [revenueResult, salesResult, rawMaterialResult] = await Promise.all([
        trpc.getRevenueStats.query(revenueArgs),
        trpc.getMenuItemSales.query(salesArgs),
        trpc.getRawMaterialConsumption.query(rawArgs),
      ]);
      
      if (revenueResult && revenueResult.success) {
        revenueData = revenueResult.data;
      }
      
      if (salesResult && salesResult.success) {
        salesData = salesResult.data;
      }
      
      if (rawMaterialResult && rawMaterialResult.success) {
        rawMaterialData = rawMaterialResult.data;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      isLoading = false;
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

  const periods: { value: Period; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
     { value: "lastWeek", label: "Last Week" },
     { value: "custom", label: "Custom" },
  ];
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Revenue Statistics</CardTitle>
    </CardHeader>
    <CardContent class="p-6 flex flex-col">
      <div class="mb-6 flex gap-3">
         <div class="flex items-center gap-3 mr-4">
          <div class="flex flex-col">
            <label class="text-xs text-gray-500 mb-1">
              From
              <DateTimePicker bind:value={fromValue} />
            </label>
          </div>

          <div class="flex flex-col">
            <label class="text-xs text-gray-500 mb-1">
              To
              <DateTimePicker bind:value={toValue} />
            </label>
          </div>

           <div class="flex items-end">
             <button
              onclick={() => loadRevenueData('custom', fromValue, toValue)}
               class="ml-2 px-4 py-2 rounded bg-indigo-600 text-white text-sm"
             >
               Apply Range
             </button>
           </div>
         </div>
        {#each periods as period}
          <button
            onclick={() => loadRevenueData(period.value)}
            class="px-6 py-2.5 rounded-lg font-medium transition-all {selectedPeriod ===
            period.value
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            {period.label}
          </button>
        {/each}
      </div>

      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      {:else}
        <Card class="w-full" useAvailableHeight={false}>
          <CardContent class="p-4">
            <div class="flex items-center justify-between gap-6">
              <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-500">Revenue</div>
                <div class="text-lg font-semibold text-gray-900 truncate">{revenueData ? formatCurrency(revenueData.totalRevenue) : '-'}</div>
                <div class="text-xs text-gray-400">{revenueData ? revenueData.period : 'No data'}</div>
              </div>

              <div class="w-28 text-center">
                <div class="text-xs text-gray-500">Orders</div>
                <div class="text-lg font-medium text-gray-900">{revenueData ? revenueData.orderCount : '-'}</div>
              </div>

              <div class="w-32 text-center">
                <div class="text-xs text-gray-500">Avg order</div>
                <div class="text-lg font-medium text-gray-900">{revenueData ? formatCurrency(revenueData.averageOrderValue) : '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {#if salesData}
          <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Menu Items Sales -->
            <Card useAvailableHeight={false}>
              <CardHeader>
                <div class="text-base font-semibold">Menu Items Sold</div>
              </CardHeader>
              <CardContent class="p-4">
                {#if salesData.menuItems.length > 0}
                  <div class="space-y-2">
                    {#each salesData.menuItems as item}
                      <div class="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                          <div class="text-xs text-gray-500">{formatCurrency(item.revenue)}</div>
                        </div>
                        <div class="text-sm font-semibold text-indigo-600 ml-4">
                          {item.quantitySold}
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-8 text-gray-400 text-sm">No menu items sold</div>
                {/if}
              </CardContent>
            </Card>

            <!-- Supplements Sales -->
            <Card useAvailableHeight={false}>
              <CardHeader>
                <div class="text-base font-semibold">Supplements Sold</div>
              </CardHeader>
              <CardContent class="p-4">
                {#if salesData.supplements.length > 0}
                  <div class="space-y-2">
                    {#each salesData.supplements as supplement}
                      <div class="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-900 truncate">{supplement.name}</div>
                          <div class="text-xs text-gray-500">{formatCurrency(supplement.revenue)}</div>
                        </div>
                        <div class="text-sm font-semibold text-indigo-600 ml-4">
                          {supplement.quantitySold}
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-8 text-gray-400 text-sm">No supplements sold</div>
                {/if}
              </CardContent>
            </Card>
          </div>
        {/if}

        {#if rawMaterialData}
          <div class="mt-6">
            <!-- Raw Materials Consumption -->
            <Card useAvailableHeight={false}>
              <CardHeader>
                <div class="text-base font-semibold">Raw Materials Consumed</div>
              </CardHeader>
              <CardContent class="p-4">
                {#if rawMaterialData.length > 0}
                  <div class="space-y-2">
                    {#each rawMaterialData as material}
                      <div class="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-900 truncate">{material.name}</div>
                          <div class="text-xs text-gray-500">{material.unit || 'N/A'}</div>
                        </div>
                        <div class="text-sm font-semibold text-indigo-600 ml-4">
                          {material.totalQuantityUsed.toFixed(2)} {material.unit || ''}
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-8 text-gray-400 text-sm">No raw materials consumed</div>
                {/if}
              </CardContent>
            </Card>
          </div>
        {/if}
      {/if}
    </CardContent>
  </Card>
</Page>
