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

export const batchUpdate = protectedProcedureGlobalTransaction
  .input(
    z.object({
      updates: z.array(
        z.object({
          id: z.string().uuid(),
          index: z.number().int(),
        })
      ),
    })
  )
  .mutation(async ({ ctx, input }) => {
    try {
      // Update all categories in parallel
      await Promise.all(
        input.updates.map((update) =>
          _ServiceCategories.update(
            {
              id: update.id,
              index: update.index,
            } as any,
            ctx.globalTx
          )
        )
      );

      return {
        success: true,
        message: "Categories reordered successfully",
      };
    } catch (error) {
      console.error("Error batch updating categories:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reorder categories",
      });
    }
  });
