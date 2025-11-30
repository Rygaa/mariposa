// src/stores/carts.svelte.ts
import { trpc } from "../lib/trpc";

class AdminStore {
  orders = $state<any[]>([]);

  async loadOrders(includeDeleted: boolean = false) {
    try {
      const result = await trpc.listOrdersWithRelations.query({
        includeDeletedMenuItemOrders: true,
        includeDeleted,
      });
      if (result.success) {
        this.orders = result.orders;
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  }

  async deleteOrder(orderId: string) {
    try {
      const result = await trpc.deleteOrder.mutate({ id: orderId });
      return result.success;
    } catch (error) {
      console.error("Error deleting order:", error);
      return false;
    }
  }
}

export const _adminStore = new AdminStore();
