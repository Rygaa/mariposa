/**
 * Server Manager - Orchestrates Fastify HTTP server with WebSocket support
 * Functional API for server management
 */

import dotenv from "dotenv";
import "async-array-utils";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin, CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { User, users } from "./db/schema";
import { catchErrors } from "./utils/catchErrors";
import { db, type DbTransaction } from "./db/utils";
import websocket from "@fastify/websocket";

dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

export type Context = {
  user?: User;
  token?: string;
  globalTx?: DbTransaction;
};

// ============================================================================
// MODULE STATE
// ============================================================================

let app: FastifyInstance;
let appRouter: any;
let allowedOrigins: string[];

const JWT_SECRET = process.env.JWT_SECRET as string;

// ============================================================================
// TRPC SETUP
// ============================================================================

const t = initTRPC
  .context<{
    token?: string;
    user?: User;
  }>()
  .create({
    errorFormatter: ({ shape, error }) => {
      return {
        ...shape,
        data: {
          ...shape.data,
          success: false,
          message: error.message,
        },
      };
    },
  });

const tTx = initTRPC
  .context<{
    token?: string;
    user?: User;
    globalTx: DbTransaction;
  }>()
  .create({
    errorFormatter: ({ shape, error }) => {
      // Don't include ctx in error to avoid circular reference issues with transaction objects
      return {
        ...shape,
        data: {
          ...shape.data,
          success: false,
          message: error.message,
        },
      };
    },
  });

// Type for authenticated context with transaction
type AuthenticatedTxContext = {
  token: string;
  user: User;
  globalTx: DbTransaction;
};

export const router = t.router;
export const publicProcedure = t.procedure;

// ============================================================================
// AUTHENTICATION
// ============================================================================

const createContext = async ({ req }: CreateFastifyContextOptions) => {
  const authHeader = req.headers.authorization as string | undefined;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token && typeof req.query === "object") {
    token = (req.query as { token?: string }).token;
  }

  return { token };
};

async function authenticate(token?: string) {
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No token provided" });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; username?: string };
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
  }

  const userId = decoded.userId;
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  return { decoded, user };
}

// ============================================================================
// MIDDLEWARES
// ============================================================================

const withAuth = t.middleware(async ({ ctx, next }) => {
  const { user } = await authenticate(ctx.token);

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  return next({ ctx: { ...ctx, user } });
});

const withAuthTx = tTx.middleware(async ({ ctx, next }) => {
  const { user } = await authenticate(ctx.token);
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  // At this point, ctx already has globalTx from withTransaction
  return next({ 
    ctx: { 
      token: ctx.token!,
      user: user, // Now user is guaranteed to exist
      globalTx: ctx.globalTx 
    }
  });
});

const withTransaction = tTx.middleware(async ({ ctx, next }) => {
  try {
    return await db.transaction(async (globalTx) => {
      return await next({ 
        ctx: { 
          ...ctx,
          globalTx: globalTx as DbTransaction
        }
      });
    });
  } catch (error: any) {
    // Handle specific PostgreSQL errors
    if (error.code === "23505") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A record with this data already exists",
      });
    }

    if (error.code === "23503") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Referenced record does not exist",
      });
    }

    if (error.code === "23502") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Required field is missing",
      });
    }

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error?.message || "Operation failed",
    });
  }
});

// ============================================================================
// PROCEDURES
// ============================================================================

export const protectedProcedure = t.procedure.use(withAuth);

export const protectedProcedureGlobalTransaction = tTx.procedure.use(withTransaction).use(withAuthTx);

export const publicProcedureGlobalTransaction = tTx.procedure.use(withTransaction);

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.user.role?.includes("ADMIN")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin privileges required",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedureGlobalTransaction = protectedProcedureGlobalTransaction.use(
  async ({ ctx, next }) => {
    if (!ctx.user || !ctx.user.role?.includes("ADMIN")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin privileges required",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }
);

export const ping = publicProcedure
  .input(z.void())
  .output(z.object({ message: z.string() }))
  .query(() => ({ message: "pong from server" }));

export const heartbeat = publicProcedure
  .input(z.void())
  .output(z.object({ timestamp: z.number(), message: z.string() }))
  .query(() => ({ 
    timestamp: Date.now(),
    message: "heartbeat" 
  }));

export const giveMeRandomNumber = publicProcedure
  .input(z.void())
  .output(z.object({ number: z.number() }))
  .query(() => ({ number: Math.floor(Math.random() * 100) }));

// ============================================================================
// EXPORTS
// ============================================================================

export { z, TRPCError, withAuth as authMiddleware, t as tRPC, JWT_SECRET, app };
export type { AppRouter } from "./trpc/router";

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

function getAllowedOrigins() {
  return [
    "http://localhost:5173", 
    "https://mariposa.food",
    "https://www.mariposa.food",
    "127.0.0.1:5173"
  ];
}

async function setupMiddleware(): Promise<void> {
  await app.register(cors, {
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
}

async function setupRoutes(): Promise<void> {
  app.get("/health", async () => ({
    status: "OK",
    timestamp: new Date().toISOString(),
  }));

  // Register WebSocket plugin BEFORE tRPC and routes
  await app.register(websocket);

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: createContext,
      onError({ path, error }: any) {
        // Avoid logging full error object which may contain circular references (transaction objects)
        console.error(`tRPC error on path '${path}':`, {
          message: error.message,
          code: error.code,
          name: error.name,
        });
      },
    },
  });
}

async function setupErrorHandler(): Promise<void> {
  app.setErrorHandler((error: any, _req: any, reply: any) => {
    console.error("Fastify error:", error);
    reply.status(500).send({ error: "Internal server error" });
  });
}

async function initialize(): Promise<void> {
  allowedOrigins = getAllowedOrigins();
  app = Fastify({
    logger: false,
    routerOptions: {
      maxParamLength: 5000,
    },
    bodyLimit: 10 * 1024 * 1024 * 10, // 10 MB
  });
  await setupMiddleware();
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function setRouter(router: any): Promise<void> {
  appRouter = router;
  await setupRoutes();
}

export async function setupTRPCRouter(): Promise<void> {
  const { appRouter: routerModule } = require("./trpc/router");
  await setRouter(routerModule);
}

export async function addRoute(path: string, handler: any): Promise<void> {
  await app.register(handler, { prefix: path });
}

export function getApp(): FastifyInstance {
  return app;
}

export async function start(port: number = 4000): Promise<void> {
  try {
    console.log(`🔄 Attempting to start server on port ${port}...`);
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server started successfully on port ${port}`);
    console.log(`📍 Allowed origins:`, allowedOrigins);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
    throw error; // Propagate the error instead of exiting
  }
}

export function getHttpServer() {
  return app.server;
}

export async function close(): Promise<void> {
  await app.close();
}

// ============================================================================
// INITIALIZE
// ============================================================================

const PORT = Number(process.env.PORT);

// Start the server
(async () => {
  try {
    console.log(`0 - Initializing...`);
    await initialize();
    
    console.log(`1 - Setting up tRPC router...`);
    await setupTRPCRouter();
    
    // Setup WebSocket server BEFORE starting the HTTP server
    const { setupWebSocketServer } = await import("./index.ws");
    console.log("2 - Setting up WebSocket routes...");
    await setupWebSocketServer(getApp(), appRouter);
    
    // Setup error handler LAST
    console.log("3 - Setting up error handler...");
    await setupErrorHandler();
    
    console.log(`4 - Starting HTTP server...`);
    await start(PORT);

    console.log("🚀 HTTP and WebSocket servers are running on the same port");
  } catch (error) {
    console.error("❌ Failed to start servers:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
    process.exit(1);
  }
})();
