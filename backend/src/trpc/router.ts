import { router, ping, giveMeRandomNumber, heartbeat } from "../index";
import { getAllUsers, createUser, updateUser, deleteUser } from "./admin/users";
import { auth, login, signup, updateMyPassword } from "./user/users";
import { create as createEatingTable, update as updateEatingTable, deleteEatingTable, list as listEatingTables, getById as getEatingTableById } from "./user/eatingTables";
import { create as createCategory, update as updateCategory, deleteCategory, list as listCategories, getById as getCategoryById } from "./user/categories";
import { create as createMenuItem, update as updateMenuItem, deleteMenuItem, list as listMenuItems, getById as getMenuItemById } from "./user/menuItems";

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
  getMenuItemById,
});

export type AppRouter = typeof appRouter;
