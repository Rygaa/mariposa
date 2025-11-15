import { z } from "zod";
import { protectedProcedure, protectedProcedureGlobalTransaction } from "../../index";
import _ServiceMenuItemOrders from "../../services/menuItemOrders.service";

const statusEnumValues = [
  "INITIALIZED",
  "CONFIRMED",
  "WAITING_TO_BE_PRINTED",
  "PRINTED",
  "SERVED",
  "PAID",
] as const;

export const create = protectedProcedureGlobalTransaction
  .input(
    z.object({
      orderId: z.string().uuid("Invalid order ID"),
      menuItemId: z.string().uuid("Invalid menu item ID"),
      quantity: z.number().int().positive().default(1),
      price: z.number(),
      status: z.enum(statusEnumValues).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { orderId, menuItemId, quantity, price, status } = input;
    const createdMenuItemOrder = await _ServiceMenuItemOrders.create(
      {
        orderId,
        menuItemId,
        quantity,
        price,
        ...(status !== undefined && { status }),
      },
      ctx.globalTx
    );

    return {
      success: true,
      menuItemOrder: createdMenuItemOrder,
      message: "Menu item added to order successfully",
    };
  });

export const update = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid menu item order ID"),
      quantity: z.number().int().positive().optional(),
      price: z.number().optional(),
      status: z.enum(statusEnumValues).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, quantity, price, status } = input;

    const updatedMenuItemOrder = await _ServiceMenuItemOrders.update(
      {
        id,
        ...(quantity !== undefined && { quantity }),
        ...(price !== undefined && { price }),
        ...(status !== undefined && { status }),
      },
      ctx.globalTx
    );

    return {
      success: true,
      menuItemOrder: updatedMenuItemOrder,
      message: "Menu item order updated successfully",
    };
  });

export const deleteMenuItemOrder = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid menu item order ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id } = input;

    await _ServiceMenuItemOrders.deleteMenuItemOrder(id, ctx.globalTx);

    return {
      success: true,
      message: "Menu item removed from order successfully",
    };
  });

export const list = protectedProcedure
  .input(
    z
      .object({
        orderId: z.string().uuid().optional(),
        menuItemId: z.string().uuid().optional(),
        status: z.enum(statusEnumValues).optional(),
        limit: z.number().int().positive().max(500).default(100).optional(),
        offset: z.number().int().nonnegative().default(0).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const filters = input || {};

    const menuItemOrders = await _ServiceMenuItemOrders.list(filters);

    return {
      success: true,
      menuItemOrders,
      count: menuItemOrders.length,
    };
  });

export const getById = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid("Invalid menu item order ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { id } = input;

    const menuItemOrder = await _ServiceMenuItemOrders.getById(id);

    return {
      success: true,
      menuItemOrder,
    };
  });

export const updateQuantity = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid menu item order ID"),
      quantity: z.number().int().positive(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, quantity } = input;

    const updatedMenuItemOrder = await _ServiceMenuItemOrders.updateQuantity(
      id,
      quantity,
      ctx.globalTx
    );

    return {
      success: true,
      menuItemOrder: updatedMenuItemOrder,
      message: "Quantity updated successfully",
    };
  });
