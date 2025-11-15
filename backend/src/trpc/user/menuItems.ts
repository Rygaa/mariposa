import { z } from "zod";
import {
  protectedProcedure,
  protectedProcedureGlobalTransaction,
  TRPCError,
} from "../../index";
import _ServiceMenuItems from "../../services/menuItems.service";

export const create = protectedProcedureGlobalTransaction
  .input(
    z.object({
      name: z.string(),
      type: z.array(z.enum(["MENU_ITEM", "RECIPE", "RAW_MATERIAL", "SUPPLEMENT", "MENU_ITEM_OPTION"])).default(["MENU_ITEM"]),
      price: z.number().optional(),
      image: z.string().optional(),
      description: z.string().optional(),
      isAvailable: z.boolean().default(true).optional(),
      categoryId: z.string().uuid().optional(),
      producedQuantityPerRecipe: z.number().optional(),
      cost: z.number().optional(),
      unit: z.enum(["gramme", "Kg", "portion", "liter", "milliliter"]).optional(),
      averagePrice: z.number().optional(),
      stockQuantity: z.number().default(0).optional(),
      stockConversionRatio: z.number().default(1).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const createdMenuItem = await _ServiceMenuItems.create(
      {
        ...input,
        // Only MENU_ITEM type can have a category
        categoryId: input.type.includes("MENU_ITEM") ? input.categoryId : undefined,
      } as any,
      ctx.globalTx
    );

    return {
      success: true,
      menuItem: createdMenuItem,
      message: "Menu item created successfully",
    };
  });

export const update = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid menu item ID"),
      name: z.string().optional(),
      type: z.array(z.enum(["MENU_ITEM", "RECIPE", "RAW_MATERIAL", "SUPPLEMENT", "MENU_ITEM_OPTION"])).optional(),
      price: z.number().optional(),
      image: z.string().optional(),
      description: z.string().optional(),
      isAvailable: z.boolean().optional(),
      categoryId: z.string().uuid().optional(),
      producedQuantityPerRecipe: z.number().optional(),
      cost: z.number().optional(),
      unit: z.enum(["gramme", "Kg", "portion", "liter", "milliliter"]).optional(),
      averagePrice: z.number().optional(),
      stockQuantity: z.number().optional(),
      stockConversionRatio: z.number().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const updatedMenuItem = await _ServiceMenuItems.update(
      {
        ...input,
        // Only MENU_ITEM type can have a category
        categoryId: input.type && !input.type.includes("MENU_ITEM") ? null : input.categoryId,
      } as any,
      ctx.globalTx
    );

    return {
      success: true,
      menuItem: updatedMenuItem,
      message: "Menu item updated successfully",
    };
  });

export const deleteMenuItem = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid menu item ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id } = input;

    await _ServiceMenuItems.deleteMenuItem(id, ctx.globalTx);

    return {
      success: true,
      message: "Menu item deleted successfully",
    };
  });

export const list = protectedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        type: z.array(z.enum(["MENU_ITEM", "RECIPE", "RAW_MATERIAL", "SUPPLEMENT", "MENU_ITEM_OPTION"])).optional(),
        categoryId: z.string().uuid().optional(),
        isAvailable: z.boolean().optional(),
        limit: z.number().int().positive().max(500).default(100).optional(),
        offset: z.number().int().nonnegative().default(0).optional(),
        excludeIds: z.array(z.string().uuid()).default([]).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const filters = input || {};

    const menuItems = await _ServiceMenuItems.list(filters);

    return {
      success: true,
      menuItems,
      count: menuItems.length,
    };
  });

export const getById = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid("Invalid menu item ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { id } = input;

    const menuItem = await _ServiceMenuItems.getById(id);

    return {
      success: true,
      menuItem,
    };
  });
