import { z } from "zod";
import {
  protectedProcedure,
  protectedProcedureGlobalTransaction,
  TRPCError,
} from "../../index";
import _ServiceCategories from "../../services/categories.service";

export const create = protectedProcedureGlobalTransaction
  .input(
    z.object({
      name: z.string(),
      isUnlisted: z.boolean().default(false).optional(),
      iconname: z.string().optional(),
      index: z.number().int().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { name, isUnlisted, iconname, index } = input;

    const createdCategory = await _ServiceCategories.create(
      {
        name,
        isUnlisted,
        iconname,
        index,
      },
      ctx.globalTx
    );

    return {
      success: true,
      category: createdCategory,
      message: "Category created successfully",
    };
  });

export const update = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid category ID"),
      name: z.string().optional(),
      isUnlisted: z.boolean().optional(),
      iconname: z.string().optional(),
      index: z.number().int().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, name, isUnlisted, iconname, index } = input;

    const updatedCategory = await _ServiceCategories.update(
      {
        id,
        ...(name !== undefined && { name }),
        ...(isUnlisted !== undefined && { isUnlisted }),
        ...(iconname !== undefined && { iconname }),
        ...(index !== undefined && { index }),
      },
      ctx.globalTx
    );

    return {
      success: true,
      category: updatedCategory,
      message: "Category updated successfully",
    };
  });

export const deleteCategory = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid("Invalid category ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id } = input;

    await _ServiceCategories.deleteCategory(id, ctx.globalTx);

    return {
      success: true,
      message: "Category deleted successfully",
    };
  });

export const list = protectedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        isUnlisted: z.boolean().optional(),
        limit: z.number().int().positive().max(500).default(100).optional(),
        offset: z.number().int().nonnegative().default(0).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const filters = input || {};

    const categories = await _ServiceCategories.list(filters);

    return {
      success: true,
      categories,
      count: categories.length,
    };
  });

export const getById = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid("Invalid category ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { id } = input;

    const category = await _ServiceCategories.getById(id);

    return {
      success: true,
      category,
    };
  });
