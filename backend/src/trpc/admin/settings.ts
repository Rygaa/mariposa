import { z } from "zod";
import { adminProcedure, TRPCError } from "../../index";
import fs from "fs/promises";
import path from "path";

const SETTINGS_FILE_PATH = path.join(__dirname, "../../settings.json");

// Helper to read settings
async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading settings:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to read settings",
    });
  }
}

// Helper to write settings
async function writeSettings(settings: any) {
  try {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing settings:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to write settings",
    });
  }
}

export const getSettings = adminProcedure.query(async () => {
  const settings = await readSettings();
  
  return {
    success: true,
    settings,
  };
});

export const updateSettings = adminProcedure
  .input(
    z.object({
      shouldCountRawMaterial: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const settings = await readSettings();
    
    // Update only the provided fields
    if (input.shouldCountRawMaterial !== undefined) {
      settings.shouldCountRawMaterial = input.shouldCountRawMaterial;
    }
    
    await writeSettings(settings);
    
    return {
      success: true,
      settings,
      message: "Settings updated successfully",
    };
  });
