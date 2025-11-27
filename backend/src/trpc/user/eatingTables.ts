import { z } from "zod";
import {
  protectedProcedure,
  protectedProcedureGlobalTransaction,
  TRPCError,
} from "../../index";
import _ServiceEatingTables from "../../services/eatingTables.service";

export const create = protectedProcedureGlobalTransaction
  .input(
    z.object({
      name: z.string().optional(),
      type: z.enum(["TAKEAWAY", "EMPLOYEES", "WAST", "GIFT"]).default("TAKEAWAY"),
      isActive: z.boolean().default(true).optional(),
      isDefault: z.boolean().default(false).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { name, type, isActive, isDefault } = input;

    const createdEatingTable = await _ServiceEatingTables.create(
      {
        name,
        type,
        isActive,
        isDefault,
      },
      ctx.globalTx
    );

    return {
      success: true,
      eatingTable: createdEatingTable,
      message: "Eating table created successfully",
    };
  });

export const update = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid eating table ID"),
      name: z.string().optional(),
      type: z.enum(["TAKEAWAY", "EMPLOYEES", "WAST", "GIFT"]).optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, name, type, isActive, isDefault } = input;

    const updatedEatingTable = await _ServiceEatingTables.update(
      {
        id,
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
      ctx.globalTx
    );

    return {
      success: true,
      eatingTable: updatedEatingTable,
      message: "Eating table updated successfully",
    };
  });

export const deleteEatingTable = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid eating table ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id } = input;

    await _ServiceEatingTables.deleteEatingTable(id, ctx.globalTx);

    return {
      success: true,
      message: "Eating table deleted successfully",
    };
  });

export const list = protectedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        type: z.enum(["TAKEAWAY", "EMPLOYEES", "WAST", "GIFT"]).optional(),
        isActive: z.boolean().optional(),
        limit: z.number().int().positive().max(500).default(100).optional(),
        offset: z.number().int().nonnegative().default(0).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const filters = input || {};

    const eatingTables = await _ServiceEatingTables.list(filters);

    return {
      success: true,
      eatingTables,
      count: eatingTables.length,
    };
  });

export const getById = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid("Invalid eating table ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { id } = input;

    const eatingTable = await _ServiceEatingTables.getById(id);

    return {
      success: true,
      eatingTable,
    };
  });

export const reorder = protectedProcedureGlobalTransaction
  .input(
    z.object({
      tableId: z.string().uuid("Invalid eating table ID"),
      targetTableId: z.string().uuid("Invalid target eating table ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { tableId, targetTableId } = input;

    // Get both tables
    const table = await _ServiceEatingTables.getById(tableId, ctx.globalTx);
    const targetTable = await _ServiceEatingTables.getById(targetTableId, ctx.globalTx);

    // Swap order indices
    const tempOrder = table.orderIndex;
    await _ServiceEatingTables.update(
      { id: tableId, orderIndex: targetTable.orderIndex },
      ctx.globalTx
    );
    await _ServiceEatingTables.update(
      { id: targetTableId, orderIndex: tempOrder },
      ctx.globalTx
    );

    const updatedTables = await _ServiceEatingTables.list({}, ctx.globalTx);

    return {
      success: true,
      eatingTables: updatedTables,
      message: "Tables reordered successfully",
    };
  });
