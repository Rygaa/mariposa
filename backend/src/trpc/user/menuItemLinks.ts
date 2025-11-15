import { z } from "zod";
import { protectedProcedure } from "../../index";
import _ServiceMenuItemSubMenuItems from "../../services/menuItemSubMenuItems.service";
import _ServiceMenuItems from "../../services/menuItems.service";

// ===== MENU ITEM SUB MENU ITEMS (MENU_ITEM_OPTION, SUPPLEMENT, RECIPE links) =====

export const createMenuItemSubMenuItem = protectedProcedure
  .input(
    z.object({
      parentMenuItemId: z.string(),
      subMenuItemId: z.string(),
      quantity: z.number().positive(),
      producedMenuItemsQuantity: z.number().positive().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Verify both menu items exist
    await _ServiceMenuItems.getById(input.parentMenuItemId);
    await _ServiceMenuItems.getById(input.subMenuItemId);

    const subMenuItem = await _ServiceMenuItemSubMenuItems.create(input);

    return {
      success: true,
      subMenuItem,
    };
  });

export const deleteMenuItemSubMenuItem = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    await _ServiceMenuItemSubMenuItems.deleteSubMenuItem(input.id);

    return {
      success: true,
      message: "Sub menu item link deleted successfully",
    };
  });

export const listMenuItemSubMenuItems = protectedProcedure
  .input(z.object({ parentMenuItemId: z.string() }))
  .query(async ({ input }) => {
    const subMenuItems = await _ServiceMenuItemSubMenuItems.listByParentMenuItem(
      input.parentMenuItemId
    );

    return {
      success: true,
      subMenuItems,
    };
  });

export const updateMenuItemSubMenuItem = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      quantity: z.number().positive().optional(),
      producedMenuItemsQuantity: z.number().positive().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const subMenuItem = await _ServiceMenuItemSubMenuItems.update(input);

    return {
      success: true,
      subMenuItem,
    };
  });
