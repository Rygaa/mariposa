import { z } from "zod";
import { protectedProcedure, protectedProcedureGlobalTransaction } from "../../index";
import _ServiceOrders from "../../services/orders.service";

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
      eatingTableId: z.string().uuid("Invalid eating table ID"),
      status: z.enum(statusEnumValues).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { eatingTableId, status } = input;
    const createdOrder = await _ServiceOrders.create(
      {
        eatingTableId,
        ...(status !== undefined && { status }),
      },
      ctx.globalTx
    );

    return {
      success: true,
      order: createdOrder,
      message: "Order created successfully",
    };
  });

export const update = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid order ID"),
      eatingTableId: z.string().uuid().optional(),
      status: z.enum(statusEnumValues).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, eatingTableId, status } = input;

    const updatedOrder = await _ServiceOrders.update(
      {
        id,
        ...(eatingTableId !== undefined && { eatingTableId }),
        ...(status !== undefined && { status }),
      },
      ctx.globalTx
    );

    return {
      success: true,
      order: updatedOrder,
      message: "Order updated successfully",
    };
  });

export const deleteOrder = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid order ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id } = input;

    await _ServiceOrders.deleteOrder(id, ctx.globalTx);

    return {
      success: true,
      message: "Order deleted successfully",
    };
  });

export const list = protectedProcedure
  .input(
    z
      .object({
        eatingTableId: z.string().uuid().optional(),
        status: z.enum(statusEnumValues).optional(),
        limit: z.number().int().positive().max(500).default(100).optional(),
        offset: z.number().int().nonnegative().default(0).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const filters = input || {};

    const orders = await _ServiceOrders.list(filters);

    return {
      success: true,
      orders,
      count: orders.length,
    };
  });

export const listWithRelations = protectedProcedure
  .input(
    z
      .object({
        eatingTableId: z.string().uuid().optional(),
        status: z.enum(statusEnumValues).optional(),
        limit: z.number().int().positive().max(500).default(100).optional(),
        offset: z.number().int().nonnegative().default(0).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const filters = input || {};

    const orders = await _ServiceOrders.listWithRelations(filters);

    return {
      success: true,
      orders,
      count: orders.length,
    };
  });

export const getById = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid("Invalid order ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { id } = input;

    const order = await _ServiceOrders.getById(id);

    return {
      success: true,
      order,
    };
  });

export const getByIdWithRelations = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid("Invalid order ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { id } = input;

    const order = await _ServiceOrders.getByIdWithRelations(id);

    return {
      success: true,
      order,
    };
  });

export const printOrder = protectedProcedure
  .input(z.object({ id: z.string().uuid("Invalid order ID") }))
  .mutation(async ({ ctx, input }) => {
    const { id } = input;

    const result = await _ServiceOrders.printOrder(id);

    return {
      success: result.success,
      message: result.message,
    };
  });

export const printReceiptOfEatingTable = protectedProcedure
  .input(z.object({ eatingTableId: z.string().uuid("Invalid eating table ID") }))
  .mutation(async ({ ctx, input }) => {
    const { eatingTableId } = input;

    const result = await _ServiceOrders.printReceiptOfEatingTable(eatingTableId);

    return {
      success: result.success,
      message: result.message,
    };
  });

export const printReceiptOfOrder = protectedProcedure
  .input(z.object({ orderId: z.string().uuid("Invalid order ID") }))
  .mutation(async ({ ctx, input }) => {
    const { orderId } = input;

    const result = await _ServiceOrders.printReceiptOfOrder(orderId);

    return {
      success: result.success,
      message: result.message,
    };
  });

export const getRevenueStats = protectedProcedure
  .input(
    z.object({
      period: z.enum(["today", "yesterday", "lastWeek", "custom"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { period, from, to } = input;

    // Algeria timezone
    const algeriaTimezone = "Africa/Algiers";
    const now = new Date();
    
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    // Convert to Algeria time and set boundaries
    const getAlgeriaDate = (date: Date) => {
      return new Date(date.toLocaleString("en-US", { timeZone: algeriaTimezone }));
    };

    const algeriaNow = getAlgeriaDate(now);

    if (period === "custom" && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      periodLabel = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else if (period === "today") {
      startDate = new Date(algeriaNow);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "Today";
    } else if (period === "yesterday") {
      startDate = new Date(algeriaNow);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "Yesterday";
    } else {
      // lastWeek - from 7 days ago to now
      startDate = new Date(algeriaNow);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "Last 7 Days";
    }

    const stats = await _ServiceOrders.getRevenueStats(startDate, endDate);

    return {
      success: true,
      data: {
        ...stats,
        period: periodLabel,
      },
    };
  });

export const getMenuItemSales = protectedProcedure
  .input(
    z.object({
      period: z.enum(["today", "yesterday", "lastWeek", "custom"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { period, from, to } = input;

    // Algeria timezone
    const algeriaTimezone = "Africa/Algiers";
    const now = new Date();
    
    let startDate: Date;
    let endDate: Date;

    const getAlgeriaDate = (date: Date) => {
      return new Date(date.toLocaleString("en-US", { timeZone: algeriaTimezone }));
    };

    const algeriaNow = getAlgeriaDate(now);

    if (period === "custom" && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
    } else if (period === "today") {
      startDate = new Date(algeriaNow);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "yesterday") {
      startDate = new Date(algeriaNow);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(algeriaNow);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setHours(23, 59, 59, 999);
    }

    const sales = await _ServiceOrders.getMenuItemSales(startDate, endDate);

    return {
      success: true,
      data: sales,
    };
  });

export const getRawMaterialConsumption = protectedProcedure
  .input(
    z.object({
      period: z.enum(["today", "yesterday", "lastWeek", "custom"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { period, from, to } = input;

    // Algeria timezone
    const algeriaTimezone = "Africa/Algiers";
    const now = new Date();
    
    let startDate: Date;
    let endDate: Date;

    const getAlgeriaDate = (date: Date) => {
      return new Date(date.toLocaleString("en-US", { timeZone: algeriaTimezone }));
    };

    const algeriaNow = getAlgeriaDate(now);

    if (period === "custom" && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
    } else if (period === "today") {
      startDate = new Date(algeriaNow);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "yesterday") {
      startDate = new Date(algeriaNow);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(algeriaNow);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(algeriaNow);
      endDate.setHours(23, 59, 59, 999);
    }

    const consumption = await _ServiceOrders.getRawMaterialConsumption(startDate, endDate);

    return {
      success: true,
      data: consumption,
    };
  });
