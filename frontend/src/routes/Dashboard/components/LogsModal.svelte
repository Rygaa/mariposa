<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "../../../lib/shadcn/Dialog/index";
  import Button from "../../../lib/components/Button.svelte";
  import { trpc } from "../../../lib/trpc";
  import { onMount } from "svelte";

  let {
    isOpen = $bindable(false),
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  let logs = $state<any[]>([]);
  let isLoading = $state(false);
  let error = $state("");
  let total = $state(0);
  let page = $state(1);
  let limit = $state(50);
  let filterAction = $state<string>("");

  // Track previous state
  let prevIsOpen = $state(false);

  $effect(() => {
    if (isOpen && !prevIsOpen) {
      prevIsOpen = true;
      loadLogs();
    } else if (!isOpen) {
      prevIsOpen = false;
      page = 1;
      filterAction = "";
      error = "";
    }
  });

  async function loadLogs() {
    isLoading = true;
    error = "";
    try {
      const offset = (page - 1) * limit;
      const result = await trpc.getLogs.query({
        limit,
        offset,
        action: filterAction || undefined,
      });
      
      if (result.success) {
        logs = result.logs;
        total = result.total;
      }
    } catch (err: any) {
      console.error("Failed to load logs:", err);
      error = err.message || "Failed to load logs";
    } finally {
      isLoading = false;
    }
  }

  function handleFilterChange() {
    page = 1;
    loadLogs();
  }

  function nextPage() {
    if (page * limit < total) {
      page++;
      loadLogs();
    }
  }

  function prevPage() {
    if (page > 1) {
      page--;
      loadLogs();
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      TRANSFER_STOCK_TO_SHOP: "Transfer to Shop",
      TRANSFER_STOCK_TO_HOUSE: "Transfer to House",
      ADD_STOCK_IN_HOUSE: "Add Stock (In-House)",
      ADD_STOCK_IN_SHOP: "Add Stock (In-Shop)",
      SUBTRACT_STOCK_IN_HOUSE: "Subtract Stock (In-House)",
      SUBTRACT_STOCK_IN_SHOP: "Subtract Stock (In-Shop)",
      STOCK_UPDATE: "Stock Update",
    };
    return labels[action] || action;
  }

  function getActionColor(action: string): string {
    if (action.includes("ADD")) return "bg-green-100 text-green-800";
    if (action.includes("SUBTRACT")) return "bg-red-100 text-red-800";
    if (action.includes("TRANSFER")) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) onClose();
  }}
>
  <DialogContent class="max-w-5xl max-h-[80vh] overflow-visible">
    <DialogHeader>
      <DialogTitle>Activity Logs</DialogTitle>
      <DialogDescription>
        View all stock management activities
      </DialogDescription>
    </DialogHeader>

    <div class="px-6 py-4 space-y-4">
      <!-- Filter -->
      <div class="flex gap-2">
        <select
          bind:value={filterAction}
          onchange={handleFilterChange}
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="">All Actions</option>
          <option value="TRANSFER_STOCK_TO_SHOP">Transfer to Shop</option>
          <option value="TRANSFER_STOCK_TO_HOUSE">Transfer to House</option>
          <option value="ADD_STOCK_IN_HOUSE">Add Stock (In-House)</option>
          <option value="ADD_STOCK_IN_SHOP">Add Stock (In-Shop)</option>
          <option value="SUBTRACT_STOCK_IN_HOUSE">Subtract Stock (In-House)</option>
          <option value="SUBTRACT_STOCK_IN_SHOP">Subtract Stock (In-Shop)</option>
        </select>
        <button
          onclick={loadLogs}
          class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      {/if}

      {#if isLoading}
        <div class="text-center py-8 text-gray-500">
          Loading logs...
        </div>
      {:else if logs.length === 0}
        <div class="text-center py-8 text-gray-500">
          No logs found
        </div>
      {:else}
        <div class="overflow-auto max-h-96 border rounded-lg">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each logs as log}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>
                  <td class="px-4 py-3 text-sm whitespace-nowrap">
                    <span class="px-2 py-1 rounded text-xs font-medium {getActionColor(log.action)}">
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {log.userName || "Unknown"}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700">
                    <div class="space-y-1">
                      <div><strong>Item:</strong> {log.request.menuItemName}</div>
                      {#if log.request.quantity !== undefined}
                        <div><strong>Quantity:</strong> {log.request.quantity}</div>
                      {/if}
                      {#if log.request.from && log.request.to}
                        <div><strong>Transfer:</strong> {log.request.from} → {log.request.to}</div>
                      {/if}
                      {#if log.request.stockType}
                        <div><strong>Stock Type:</strong> {log.request.stockType}</div>
                      {/if}
                      {#if log.request.previousStock !== undefined}
                        <div><strong>Before:</strong> {log.request.previousStock} → <strong>After:</strong> {log.request.newStock}</div>
                      {/if}
                      {#if log.request.previousInHouse !== undefined}
                        <div>
                          <strong>In-House:</strong> {log.request.previousInHouse} → {log.request.newInHouse} |
                          <strong>In-Shop:</strong> {log.request.previousInShop} → {log.request.newInShop}
                        </div>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} logs
          </div>
          <div class="flex gap-2">
            <button
              onclick={prevPage}
              disabled={page === 1}
              class="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onclick={nextPage}
              disabled={page * limit >= total}
              class="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={onClose}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
