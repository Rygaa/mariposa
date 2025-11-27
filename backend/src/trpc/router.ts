import { router, ping, giveMeRandomNumber, heartbeat } from "../index";
import { getAllUsers, createUser, updateUser, deleteUser } from "./admin/users";
import { auth, login, signup, updateMyPassword, updateUserMeta } from "./user/users";
import { create as createEatingTable, update as updateEatingTable, deleteEatingTable, list as listEatingTables, getById as getEatingTableById } from "./user/eatingTables";
import { create as createCategory, update as updateCategory, deleteCategory, list as listCategories, getById as getCategoryById } from "./user/categories";
import { 
  create as createMenuItem, 
  update as updateMenuItem, 
  deleteMenuItem, 
  list as listMenuItems, 
  listAll as listAllMenuItems, 
  getById as getMenuItemById,
  uploadMenuItemImage,
  deleteMenuItemImage,
  updateMenuItemImage,
  getMenuItemImageMetadata,
  generateMenuItemImageUrl,
  getMenuItemImageViewUrl,
  listMenuItemImages,
  batchUpdateMenuItems
} from "./user/menuItems";
import { create as createItemPrice, deleteItemPrice, listByMenuItem as listItemPricesByMenuItem } from "./user/itemPrices";
import { 
  createMenuItemSubMenuItem,
  deleteMenuItemSubMenuItem,
  listMenuItemSubMenuItems,
  updateMenuItemSubMenuItem
} from "./user/menuItemLinks";
import { 
  create as createOrder, 
  update as updateOrder, 
  deleteOrder, 
  list as listOrders,
  listWithRelations as listOrdersWithRelations,
  getById as getOrderById,
  getByIdWithRelations as getOrderByIdWithRelations,
  printOrder,
  printReceiptOfEatingTable,
  printReceiptOfOrder,
  getRevenueStats,
  getMenuItemSales,
  getRawMaterialConsumption
} from "./user/orders";
import {
  create as createMenuItemOrder,
  update as updateMenuItemOrder,
  deleteMenuItemOrder,
  list as listMenuItemOrders,
  getById as getMenuItemOrderById,
  updateQuantity as updateMenuItemOrderQuantity
} from "./user/menuItemOrders";

export const appRouter = router({
  ping,
  heartbeat,
  giveMeRandomNumber,
  signup,
  login,
  auth,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateMyPassword,
  updateUserMeta,
  createEatingTable,
  updateEatingTable,
  deleteEatingTable,
  listEatingTables,
  getEatingTableById,
  createCategory,
  updateCategory,
  deleteCategory,
  listCategories,
  getCategoryById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listMenuItems,
  listAllMenuItems,
  getMenuItemById,
  createItemPrice,
  deleteItemPrice,
  listItemPricesByMenuItem,
  createMenuItemSubMenuItem,
  deleteMenuItemSubMenuItem,
  listMenuItemSubMenuItems,
  updateMenuItemSubMenuItem,
  createOrder,
  updateOrder,
  deleteOrder,
  listOrders,
  listOrdersWithRelations,
  getOrderById,
  getOrderByIdWithRelations,
  printOrder,
  printReceiptOfEatingTable,
  printReceiptOfOrder,
  getRevenueStats,
  getMenuItemSales,
  getRawMaterialConsumption,
  createMenuItemOrder,
  updateMenuItemOrder,
  deleteMenuItemOrder,
  listMenuItemOrders,
  getMenuItemOrderById,
  updateMenuItemOrderQuantity,
  uploadMenuItemImage,
  deleteMenuItemImage,
  updateMenuItemImage,
  getMenuItemImageMetadata,
  generateMenuItemImageUrl,
  getMenuItemImageViewUrl,
  listMenuItemImages,
  batchUpdateMenuItems,
});

export type AppRouter = typeof appRouter;
