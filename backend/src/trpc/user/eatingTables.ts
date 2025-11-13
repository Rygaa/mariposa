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
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { name, type, isActive } = input;

    const createdEatingTable = await _ServiceEatingTables.create(
      {
        name,
        type,
        isActive,
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
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, name, type, isActive } = input;

    const updatedEatingTable = await _ServiceEatingTables.update(
      {
        id,
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(isActive !== undefined && { isActive }),
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
