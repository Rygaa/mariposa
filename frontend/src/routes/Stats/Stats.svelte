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
  type OrderStatus = "INITIALIZED" | "CONFIRMED" | "WAITING_TO_BE_PRINTED" | "PRINTED" | "SERVED" | "PAID";

  let isLoading = $state(false);
  let selectedPeriod = $state<Period>("today");
  let fromValue = $state<Date | undefined>(undefined);
  let toValue = $state<Date | undefined>(undefined);
  let selectedStatuses = $state<OrderStatus[]>(["PAID"]);
  let includeDeletedMenuItemOrders = $state<boolean>(false);
  let revenueData = $state<{
    totalRevenue: number;
    deletedRevenue: number;
    activeRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    period: string;
  } | null>(null);
  
  let salesData = $state<{
    menuItems: Array<{
      id: string;
      name: string;
      subName?: string | null;
      type: string[];
      quantitySold: number;
      revenue: number;
      deletedQuantitySold: number;
      deletedRevenue: number;
    }>;
    supplements: Array<{
      id: string;
      name: string;
      subName?: string | null;
      quantitySold: number;
      revenue: number;
      deletedQuantitySold: number;
      deletedRevenue: number;
    }>;
  } | null>(null);
  
  let rawMaterialData = $state<Array<{
    id: string;
    name: string;
    unit: string | null;
    totalQuantityUsed: number;
    deletedQuantityUsed: number;
  }> | null>(null);

  onMount(async () => {
    if (!_globalStore.user) {
      navigate("/login", { replace: true });
      return;
    }
    await loadRevenueData("today", undefined, undefined, ["PAID"], false);
  });

  async function loadRevenueData(period: Period, from?: Date | undefined, to?: Date | undefined, statuses?: OrderStatus[], includeDeleted?: boolean) {
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

      // Add status filter if provided
      if (statuses && statuses.length > 0) {
        revenueArgs.status = statuses;
        salesArgs.status = statuses;
        rawArgs.status = statuses;
      }

      // Add includeDeletedMenuItemOrders parameter
      if (includeDeleted !== undefined) {
        revenueArgs.includeDeletedMenuItemOrders = includeDeleted;
        salesArgs.includeDeletedMenuItemOrders = includeDeleted;
        rawArgs.includeDeletedMenuItemOrders = includeDeleted;
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
    { value: "today", label: "Aujourd'hui" },
    { value: "yesterday", label: "Hier" },
     { value: "lastWeek", label: "Semaine Dernière" },
     { value: "custom", label: "Personnalisé" },
  ];

  const statuses: { value: OrderStatus; label: string; color: string }[] = [
    { value: "INITIALIZED", label: "Initialisé", color: "bg-gray-100 text-gray-700" },
    { value: "CONFIRMED", label: "Confirmé", color: "bg-blue-100 text-blue-700" },
    { value: "WAITING_TO_BE_PRINTED", label: "En Attente d'Impression", color: "bg-yellow-100 text-yellow-700" },
    { value: "PRINTED", label: "Imprimé", color: "bg-purple-100 text-purple-700" },
    { value: "SERVED", label: "Servi", color: "bg-green-100 text-green-700" },
    { value: "PAID", label: "Payé", color: "bg-emerald-100 text-emerald-700" },
  ];

  function toggleStatus(status: OrderStatus) {
    if (selectedStatuses.includes(status)) {
      selectedStatuses = selectedStatuses.filter(s => s !== status);
    } else {
      selectedStatuses = [...selectedStatuses, status];
    }
    // Reload data with new status filter
    loadRevenueData(selectedPeriod, fromValue, toValue, selectedStatuses, includeDeletedMenuItemOrders);
  }

  function toggleIncludeDeleted() {
    includeDeletedMenuItemOrders = !includeDeletedMenuItemOrders;
    // Reload data with new deleted filter
    loadRevenueData(selectedPeriod, fromValue, toValue, selectedStatuses, includeDeletedMenuItemOrders);
  }
</script>

<Page>
  <Card>
    <CardHeader>
      <CardTitle>Statistiques de Revenus</CardTitle>
    </CardHeader>
    <CardContent class="p-4 md:p-6 flex flex-col">
      <div class="mb-6 flex flex-col md:flex-row gap-3">
         <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:mr-4">
          <div class="flex flex-col flex-1">
            <label class="text-xs text-gray-500 mb-1">
              De
              <DateTimePicker bind:value={fromValue} />
            </label>
          </div>

          <div class="flex flex-col flex-1">
            <label class="text-xs text-gray-500 mb-1">
              À
              <DateTimePicker bind:value={toValue} />
            </label>
          </div>

           <div class="flex items-end">
             <button
              onclick={() => loadRevenueData('custom', fromValue, toValue, selectedStatuses, includeDeletedMenuItemOrders)}
               class="w-full sm:w-auto px-4 py-2 rounded bg-indigo-600 text-white text-sm"
             >
               Appliquer
             </button>
           </div>
         </div>
        <div class="flex flex-wrap gap-2">
          {#each periods as period}
            <button
              onclick={() => loadRevenueData(period.value, undefined, undefined, selectedStatuses, includeDeletedMenuItemOrders)}
              class="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all text-sm {selectedPeriod ===
              period.value
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            >
              {period.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Status Filter Section -->
      <div class="mb-6 border-t pt-4">
        <div class="block text-sm font-medium text-gray-700 mb-3">Filtre par Statut de Commande :</div>
        <div class="flex flex-wrap gap-2">
          {#each statuses as status}
            <button
              onclick={() => toggleStatus(status.value)}
              class="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border {selectedStatuses.includes(status.value)
                ? status.color + ' border-current shadow-sm'
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}"
            >
              {status.label}
              {#if selectedStatuses.includes(status.value)}
                <span class="ml-1">✓</span>
              {/if}
            </button>
          {/each}
        </div>
        <p class="mt-2 text-xs text-gray-500">
          {selectedStatuses.length === 0 ? 'Aucun statut sélectionné (affichage de tous)' : `Affichage de ${selectedStatuses.length} statut(s) : ${selectedStatuses.join(', ')}`}
        </p>
      </div>

      <!-- Include Deleted Menu Item Orders Checkbox -->
      <div class="mb-6 border-t pt-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDeletedMenuItemOrders}
            onchange={toggleIncludeDeleted}
            class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700">
            Inclure les commandes d'articles supprimés
            <span class="text-xs text-gray-500 block mt-0.5">Les revenus des articles supprimés seront affichés séparément</span>
          </span>
        </label>
      </div>

      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      {:else}
        <Card class="w-full" useAvailableHeight={false}>
          <CardContent class="p-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-500">Revenu Total</div>
                <div class="text-lg sm:text-xl font-semibold text-gray-900 truncate">{revenueData ? formatCurrency(revenueData.totalRevenue) : '-'}</div>
                {#if includeDeletedMenuItemOrders && revenueData}
                  <div class="text-xs text-gray-400 mt-1">
                    Actif : {formatCurrency(revenueData.activeRevenue)} | 
                    <span class="text-red-500">Supprimé : {formatCurrency(revenueData.deletedRevenue)}</span>
                  </div>
                {/if}
                <div class="text-xs text-gray-400">{revenueData ? revenueData.period : 'Aucune donnée'}</div>
              </div>

              <div class="flex gap-6 sm:gap-4">
                <div class="flex-1 sm:w-28 text-center">
                  <div class="text-xs text-gray-500">Commandes</div>
                  <div class="text-lg font-medium text-gray-900">{revenueData ? revenueData.orderCount : '-'}</div>
                </div>

                <div class="flex-1 sm:w-32 text-center">
                  <div class="text-xs text-gray-500">Moy. commande</div>
                  <div class="text-base sm:text-lg font-medium text-gray-900">{revenueData ? formatCurrency(revenueData.averageOrderValue) : '-'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {#if salesData}
          <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <!-- Menu Items Sales -->
            <Card useAvailableHeight={false}>
              <CardHeader>
                <div class="text-sm sm:text-base font-semibold">Articles du Menu Vendus</div>
              </CardHeader>
              <CardContent class="p-3 sm:p-4">
                {#if salesData.menuItems.length > 0}
                  <div class="space-y-2">
                    {#each salesData.menuItems as item}
                      <div class="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-900 truncate">
                            {item.name} {#if item.subName}<span class="text-xs text-gray-500">({item.subName})</span>{/if}
                          </div>
                          <div class="text-xs text-gray-500">
                            {formatCurrency(item.revenue)}
                            {#if includeDeletedMenuItemOrders && item.deletedRevenue > 0}
                              <span class="text-red-500 ml-2">
                                + {formatCurrency(item.deletedRevenue)} (supprimé)
                              </span>
                            {/if}
                          </div>
                        </div>
                        <div class="text-sm font-semibold text-indigo-600 ml-4">
                          {item.quantitySold}
                          {#if includeDeletedMenuItemOrders && item.deletedQuantitySold > 0}
                            <span class="text-xs text-red-500 block">
                              +{item.deletedQuantitySold} del
                            </span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-8 text-gray-400 text-sm">Aucun article du menu vendu</div>
                {/if}
              </CardContent>
            </Card>

            <!-- Supplements Sales -->
            <Card useAvailableHeight={false}>
              <CardHeader>
                <div class="text-sm sm:text-base font-semibold">Suppléments Vendus</div>
              </CardHeader>
              <CardContent class="p-3 sm:p-4">
                {#if salesData.supplements.length > 0}
                  <div class="space-y-2">
                    {#each salesData.supplements as supplement}
                      <div class="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-900 truncate">
                            {supplement.name} {#if supplement.subName}<span class="text-xs text-gray-500">({supplement.subName})</span>{/if}
                          </div>
                          <div class="text-xs text-gray-500">
                            {formatCurrency(supplement.revenue)}
                            {#if includeDeletedMenuItemOrders && supplement.deletedRevenue > 0}
                              <span class="text-red-500 ml-2">
                                + {formatCurrency(supplement.deletedRevenue)} (supprimé)
                              </span>
                            {/if}
                          </div>
                        </div>
                        <div class="text-sm font-semibold text-indigo-600 ml-4">
                          {supplement.quantitySold}
                          {#if includeDeletedMenuItemOrders && supplement.deletedQuantitySold > 0}
                            <span class="text-xs text-red-500 block">
                              +{supplement.deletedQuantitySold} del
                            </span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-8 text-gray-400 text-sm">Aucun supplément vendu</div>
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
                <div class="text-sm sm:text-base font-semibold">Matières Premières Consommées</div>
              </CardHeader>
              <CardContent class="p-3 sm:p-4">
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
                          {#if includeDeletedMenuItemOrders && material.deletedQuantityUsed > 0}
                            <span class="text-xs text-red-500 block">
                              +{material.deletedQuantityUsed.toFixed(2)} {material.unit || ''} (supprimé)
                            </span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-8 text-gray-400 text-sm">Aucune matière première consommée</div>
                {/if}
              </CardContent>
            </Card>
          </div>
        {/if}
      {/if}
    </CardContent>
  </Card>
</Page>
