// src/stores/carts.svelte.ts
import { trpc } from "../lib/trpc";

class CartsStore {
  orders = $state<any[]>([]);

  async loadOrders() {
    try {
      const result = await trpc.listOrdersWithRelations.query({
        status: "CONFIRMED",
      });
      if (result.success) {
        this.orders = result.orders;
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  }
}

export const _cartsStore = new CartsStore();
