/**
 * Calculate the correct total for an order by only counting parent menu items and their children
 * This prevents double-counting supplements and options which are linked via parentMenuItemOrderId
 */
export function calculateOrderTotal(menuItemOrders: any[]): number {
  if (!menuItemOrders || menuItemOrders.length === 0) {
    return 0;
  }

  // Only sum parent items (those without parentMenuItemOrderId)
  // The supplements and options are already included in the parent's price
  return menuItemOrders
    .filter((mio: any) => !mio.parentMenuItemOrderId)
    .reduce((sum: number, mio: any) => {
      // Add parent item price
      const parentTotal = mio.price * mio.quantity;
      
      // Add all child items (supplements and options) if they exist
      const childTotal = (mio.childMenuItemOrders || []).reduce(
        (childSum: number, child: any) => childSum + child.price * child.quantity,
        0
      );
      
      return sum + parentTotal + childTotal;
    }, 0);
}

/**
 * Calculate total for multiple orders
 */
export function calculateMultipleOrdersTotal(orders: any[]): number {
  return orders.reduce((sum, order) => {
    return sum + calculateOrderTotal(order.menuItemOrders || []);
  }, 0);
}
