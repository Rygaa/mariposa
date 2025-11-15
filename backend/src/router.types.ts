import type { AppRouter } from "./trpc/router";
import type { inferRouterOutputs } from "@trpc/server";

export type RouterOutput = inferRouterOutputs<AppRouter>;
export type getMenuItemById = RouterOutput["getMenuItemById"]
export type getCategoryById = RouterOutput["getCategoryById"];
export type getEatingTableById = RouterOutput["getEatingTableById"];
export type listCategories = RouterOutput["listCategories"];
export type listItemPricesByMenuItem = RouterOutput["listItemPricesByMenuItem"];
