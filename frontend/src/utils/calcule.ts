/**
 * Calculate the correct total for an order by only counting parent menu items and their children
 * This prevents double-counting supplements and options which are linked via parentMenuItemOrderId
 */
export function calculateOrderTotal(menuItemOrders: any[]): number {
  if (!menuItemOrders || menuItemOrders.length === 0) {
    return 0;
  }

  // Filter main items only (not child supplements/options)
  const mainItems = menuItemOrders.filter((mio: any) => 
    !mio.parentMenuItemOrderId && mio.menuItem?.type?.includes("MENU_ITEM")
  );
  
  // Group child items by parent
  const childItemsByParent = menuItemOrders
    .filter((mio: any) => 
      mio.menuItem?.type?.includes("SUPPLEMENT") && mio.parentMenuItemOrderId
    )
    .reduce((acc: any, child: any) => {
      if (!acc[child.parentMenuItemOrderId]) {
        acc[child.parentMenuItemOrderId] = [];
      }
      acc[child.parentMenuItemOrderId].push(child);
      return acc;
    }, {});
  
  // Calculate total including child items
  return mainItems.reduce((sum: number, mio: any) => {
    const childItems = childItemsByParent[mio.id] || [];
    const childItemsTotal = childItems.reduce(
      (childSum: number, child: any) => childSum + (child.price || 0) * child.quantity,
      0
    );
    const itemTotal = (mio.price + childItemsTotal) * mio.quantity;
    return sum + itemTotal;
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
