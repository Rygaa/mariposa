<script lang="ts">
  import Button from "../../../lib/components/Button.svelte";
  import Icon from "../../../lib/components/Icon.svelte";
  import ClickableDiv from "../../../lib/shadcn/ClickableDiv.svelte";
  import {
    Dropdown,
    DropdownItem,
    DropdownSeparator,
  } from "../../../lib/shadcn/Dropdown";
  import DeleteOrderModal from "./DeleteOrderModal.svelte";
  import UpdateOrderModal from "./UpdateOrderModal.svelte";
  import ViewMoreModal from "./ViewMoreModal.svelte";

  let {
    order,
    onOrderUpdated,
  }: {
    order: any;
    onOrderUpdated?: () => void | Promise<void>;
  } = $props();

  let isDropdownOpen = $state(false);
  let isUpdateOrderModalOpen = $state(false);
  let isDeleteOrderModalOpen = $state(false);
  let isViewMoreModalOpen = $state(false);

  function handleEdit() {
    isUpdateOrderModalOpen = true;
  }

  function handleDelete() {
    isDeleteOrderModalOpen = true;
  }

  function handleViewMore() {
    isViewMoreModalOpen = true;
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      INITIALIZED: "text-blue-600",
      CONFIRMED: "text-green-600",
      WAITING_TO_BE_PRINTED: "text-yellow-600",
      PRINTED: "text-purple-600",
      SERVED: "text-indigo-600",
      PAID: "text-emerald-600",
    };
    return colors[status] || "text-gray-600";
  }

  function formatStatus(status: string) {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  function formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<ClickableDiv
  customOnClick={handleEdit}
  class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all relative cursor-pointer"
>
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <h3 class="font-semibold text-gray-900 truncate mb-2">
        Order #{order.id.slice(0, 8)}
      </h3>
      <div class="space-y-1 text-sm">
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Status:</span>
          <span class="font-medium {getStatusColor(order.status)}">
            {formatStatus(order.status)}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Table ID:</span>
          <span class="font-medium text-gray-900 truncate">
            {order.eatingTableId.slice(0, 8)}...
          </span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Created:</span>
          <span class="font-medium text-gray-900">
            {formatDate(order.createdAt)}
          </span>
        </div>
        {#if order.updatedAt && order.updatedAt !== order.createdAt}
          <div class="flex items-center gap-1">
            <span class="text-gray-600">Updated:</span>
            <span class="font-medium text-gray-900">
              {formatDate(order.updatedAt)}
            </span>
          </div>
        {/if}
      </div>
    </div>

    <div class="ml-2">
      <Dropdown bind:open={isDropdownOpen} align="end">
        {#snippet trigger()}
          <Button
            variant="ghost"
            iconName="more"
            iconOnly={true}
            tooltip="Actions"
          />
        {/snippet}

        <DropdownItem onclick={handleViewMore}>
          <Icon iconName="eye" size="4" class="fill-gray-600" />
          <span class="ml-2">View More</span>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onclick={handleEdit}>
          <Icon iconName="edit" size="4" class="fill-gray-600" />
          <span class="ml-2">Edit</span>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onclick={handleDelete} class="text-red-600">
          <Icon iconName="trash" size="4" class="fill-red-600" />
          <span class="ml-2">Delete</span>
        </DropdownItem>
      </Dropdown>
    </div>
  </div>
</ClickableDiv>

<UpdateOrderModal
  bind:isOpen={isUpdateOrderModalOpen}
  {order}
  onClose={() => (isUpdateOrderModalOpen = false)}
  onOrderUpdated={() => {
    onOrderUpdated?.();
  }}
/>

<DeleteOrderModal
  bind:isOpen={isDeleteOrderModalOpen}
  {order}
  onClose={() => (isDeleteOrderModalOpen = false)}
  onOrderDeleted={() => {
    onOrderUpdated?.();
  }}
/>

<ViewMoreModal
  bind:isOpen={isViewMoreModalOpen}
  {order}
  onClose={() => (isViewMoreModalOpen = false)}
/>
