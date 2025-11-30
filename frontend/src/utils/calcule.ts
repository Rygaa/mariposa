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

/**
 * DEPRECATED: Calculate order total the old way (counting all items including supplements)
 * This was incorrect as it double-counted supplements/options
 * Used only for comparison to detect orders with calculation issues
 */
export function calculateOrderDeprecatedTotal(menuItemOrders: any[]): number {
  if (!menuItemOrders || menuItemOrders.length === 0) {
    return 0;
  }
  
  // Old incorrect way: sum ALL items including supplements
  return menuItemOrders.reduce(
    (sum: number, mio: any) => sum + mio.price * mio.quantity,
    0
  );
}
