import { z } from "zod";
import {
  protectedProcedure,
  protectedProcedureGlobalTransaction,
  TRPCError,
} from "../../index";
import _ServiceMenuItems from "../../services/menuItems.service";
import _ServiceMenuItemImages from "../../services/menuItemImages.service";

export const create = protectedProcedureGlobalTransaction
  .input(
    z.object({
      name: z.string(),
      type: z.array(z.enum(["MENU_ITEM", "RECIPE", "RAW_MATERIAL", "SUPPLEMENT", "MENU_ITEM_OPTION"])).default(["MENU_ITEM"]),
      price: z.number().optional(),
      image: z.array(z.string()).optional(),
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
      image: z.array(z.string()).optional(),
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
        shouldIncludeSupplements: z.boolean().default(false).optional(),
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

export const listAll = protectedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        type: z.array(z.enum(["MENU_ITEM", "RECIPE", "RAW_MATERIAL", "SUPPLEMENT", "MENU_ITEM_OPTION"])).optional(),
        categoryId: z.string().uuid().optional(),
        isAvailable: z.boolean().optional(),
        limit: z.number().int().positive().max(10000).optional(),
        offset: z.number().int().nonnegative().default(0).optional(),
        excludeIds: z.array(z.string().uuid()).default([]).optional(),
        shouldIncludeSupplements: z.boolean().default(false).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const filters = input || {};
    
    // If no limit specified, set it to a very high number to get all items
    if (!filters.limit) {
      filters.limit = 10000;
    }

    const menuItems = await _ServiceMenuItems.list(filters);

    return {
      success: true,
      menuItems,
      count: menuItems.length,
    };
  });

export const uploadMenuItemImage = protectedProcedureGlobalTransaction
  .input(
    z.object({
      menuItemId: z.string().uuid(),
      file: z.string(), // base64 encoded file
      filename: z.string(),
      mimeType: z.string(),
      folderId: z.string().optional(),
      shouldBeUsedInMenuItemsPage: z.boolean().default(false),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { uploadFile } = await import("../../utils/fileUpload");
    
    try {
      // Convert base64 to buffer
      const base64Data = input.file.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const result = await uploadFile(
        buffer,
        input.filename,
        input.mimeType,
        input.folderId
      );

      // Verify menu item exists
      await _ServiceMenuItems.getById(input.menuItemId, ctx.globalTx);
      
      // Create menu item image record
      const menuItemImage = await _ServiceMenuItemImages.create(
        {
          menuItemId: input.menuItemId,
          fileId: result.file.id,
          shouldBeUsedInMenuItemsPage: input.shouldBeUsedInMenuItemsPage,
        },
        ctx.globalTx
      );

      return {
        success: true,
        id: menuItemImage.id,
        fileId: result.file.id,
        file: result.file,
        shouldBeUsedInMenuItemsPage: menuItemImage.shouldBeUsedInMenuItemsPage,
        message: "File uploaded successfully",
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to upload file",
      });
    }
  });

export const deleteMenuItemImage = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { deleteFile } = await import("../../utils/fileUpload");
    
    try {
      // Get menu item image record
      const menuItemImage = await _ServiceMenuItemImages.getById(input.id, ctx.globalTx);
      
      // Delete the image record
      await _ServiceMenuItemImages.deleteById(input.id, ctx.globalTx);

      // Delete file from storage
      const result = await deleteFile(menuItemImage.fileId);

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete file",
      });
    }
  });

/**
 * Get file metadata
 */
export const getMenuItemImageMetadata = protectedProcedure
  .input(
    z.object({
      fileId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { getFileMetadata } = await import("../../utils/fileUpload");
    
    try {
      const file = await getFileMetadata(input.fileId);

      return {
        success: true,
        file,
      };
    } catch (error) {
      console.error("Error getting file metadata:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get file metadata",
      });
    }
  });

/**
 * Generate presigned URL for a file
 */
export const generateMenuItemImageUrl = protectedProcedure
  .input(
    z.object({
      fileId: z.string(),
      expiresIn: z.number().min(60).max(86400).optional(),
      maxUsageCount: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    const { generatePresignedUrl } = await import("../../utils/fileUpload");
    
    try {
      const result = await generatePresignedUrl(
        input.fileId,
        input.expiresIn,
        input.maxUsageCount
      );

      return {
        success: true,
        token: result.token,
        url: result.url,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate presigned URL",
      });
    }
  });

/**
 * Get public view URL for file (long-lived, high usage count)
 */
export const getMenuItemImageViewUrl = protectedProcedure
  .input(
    z.object({
      fileId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { getFileViewUrl } = await import("../../utils/fileUpload");
    
    try {
      console.log("Getting view URL for fileId:", input.fileId);
      const url = await getFileViewUrl(input.fileId);

      return {
        success: true,
        url,
      };
    } catch (error) {
      console.error("Error getting file view URL for fileId:", input.fileId, error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get file view URL",
      });
    }
  });

/**
 * List menu item images
 */
export const listMenuItemImages = protectedProcedure
  .input(
    z.object({
      menuItemId: z.string().uuid(),
    })
  )
  .query(async ({ ctx, input }) => {
    try {
      const images = await _ServiceMenuItemImages.listByMenuItemId(input.menuItemId);

      return {
        success: true,
        images,
      };
    } catch (error) {
      console.error("Error listing menu item images:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list menu item images",
      });
    }
  });

/**
 * Update menu item image
 */
export const updateMenuItemImage = protectedProcedureGlobalTransaction
  .input(
    z.object({
      id: z.string().uuid(),
      shouldBeUsedInMenuItemsPage: z.boolean(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    try {
      const updatedImage = await _ServiceMenuItemImages.update(
        {
          id: input.id,
          shouldBeUsedInMenuItemsPage: input.shouldBeUsedInMenuItemsPage,
        },
        ctx.globalTx
      );

      return {
        success: true,
        image: updatedImage,
        message: "Image updated successfully",
      };
    } catch (error) {
      console.error("Error updating menu item image:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update menu item image",
      });
    }
  });
