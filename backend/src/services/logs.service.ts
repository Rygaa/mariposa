import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import crypto from "crypto";

class LogsService {
  async createLog(
    params: {
      action: string;
      userId?: string;
      userName?: string;
      request: any;
      response: any;
    },
    tx: DbTransactionOrDB = db
  ): Promise<SchemaDrizzle.ActivityLogs> {
    const id = crypto.randomUUID();
    
    const [logEntry] = await tx
      .insert(SchemaDrizzle.activityLogs)
      .values({
        id,
        action: params.action,
        userId: params.userId,
        userName: params.userName,
        request: params.request,
        response: params.response,
      })
      .returning();

    return logEntry;
  }

  async getLogs(
    params?: {
      limit?: number;
      offset?: number;
      action?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
    tx: DbTransactionOrDB = db
  ): Promise<{ logs: SchemaDrizzle.ActivityLogs[]; total: number }> {
    const conditions = [];

    if (params?.action) {
      conditions.push(eq(SchemaDrizzle.activityLogs.action, params.action));
    }

    if (params?.userId) {
      conditions.push(eq(SchemaDrizzle.activityLogs.userId, params.userId));
    }

    if (params?.startDate) {
      conditions.push(gte(SchemaDrizzle.activityLogs.timestamp, new Date(params.startDate)));
    }

    if (params?.endDate) {
      conditions.push(lte(SchemaDrizzle.activityLogs.timestamp, new Date(params.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(SchemaDrizzle.activityLogs)
      .where(whereClause);

    // Get logs with pagination
    const logs = await tx
      .select()
      .from(SchemaDrizzle.activityLogs)
      .where(whereClause)
      .orderBy(desc(SchemaDrizzle.activityLogs.timestamp))
      .limit(params?.limit || 50)
      .offset(params?.offset || 0);

    return { logs, total: Number(count) };
  }

  async clearLogs(tx: DbTransactionOrDB = db): Promise<void> {
    await tx.delete(SchemaDrizzle.activityLogs);
  }
}

export default new LogsService();
