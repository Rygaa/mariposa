import { z } from "zod";
import { protectedProcedure } from "../../index";
import _ServiceLogs from "../../services/logs.service";

export const createLog = protectedProcedure
  .input(
    z.object({
      action: z.string(),
      request: z.any(),
      response: z.any(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const log = await _ServiceLogs.createLog({
      action: input.action,
      userId: ctx.user?.id,
      userName: ctx.user?.username || ctx.user?.email,
      request: input.request,
      response: input.response,
    });

    return {
      success: true,
      log,
      message: "Log created successfully",
    };
  });

export const getLogs = protectedProcedure
  .input(
    z.object({
      limit: z.number().int().positive().max(500).default(50).optional(),
      offset: z.number().int().nonnegative().default(0).optional(),
      action: z.string().optional(),
      userId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional()
  )
  .query(async ({ input }) => {
    const result = await _ServiceLogs.getLogs(input || {});

    return {
      success: true,
      logs: result.logs,
      total: result.total,
    };
  });

export const clearLogs = protectedProcedure
  .mutation(async () => {
    await _ServiceLogs.clearLogs();

    return {
      success: true,
      message: "All logs cleared successfully",
    };
  });
