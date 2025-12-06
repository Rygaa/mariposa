import { z } from "zod";
import {
  protectedProcedure,
  protectedProcedureGlobalTransaction,
} from "../../index";
import _ServiceItemPrices from "../../services/itemPrices.service";

export const create = protectedProcedureGlobalTransaction
  .input(
    z.object({
      menuItemId: z.string().uuid(),
      priceValue: z.number(),
      unitValue: z.number(),
      multiplier: z.number().default(1),
      description: z.string().optional(),
      priceType: z.enum(["selling", "buying"]),
      isTemplate: z.boolean().default(false),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const createdItemPrice = await _ServiceItemPrices.create(
      input,
      ctx.globalTx
    );

    return {
      success: true,
      itemPrice: createdItemPrice,
      message: "Item price created successfully",
    };
  });

export const deleteItemPrice = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid item price ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id } = input;

    await _ServiceItemPrices.deleteItemPrice(id, ctx.globalTx);

    return {
      success: true,
      message: "Item price deleted successfully",
    };
  });

export const deleteAllNonTemplates = protectedProcedureGlobalTransaction
  .mutation(async ({ ctx }) => {
    const deletedCount = await _ServiceItemPrices.deleteAllNonTemplates(ctx.globalTx);

    return {
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} purchase records`,
    };
  });

export const listByMenuItem = protectedProcedure
  .input(
    z.object({
      menuItemId: z.string().uuid(),
      priceType: z.enum(["selling", "buying"]).optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const itemPrices = await _ServiceItemPrices.listByMenuItem(
      input.menuItemId,
      input.priceType
    );

    return {
      success: true,
      itemPrices,
      count: itemPrices.length,
    };
  });
