import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/trpc/router";
import { _globalStore } from "../store/globalStore.svelte";

export type { AppRouter } from "../../../backend/src/trpc/router";

// Heartbeat state
let heartbeatInterval: number | null = null;
let lastHeartbeatTime: number = Date.now();

// WebSocket state
let ws: WebSocket | null = null;
export let wsMessage: string = "";

// HTTP URL for API calls
const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:6100';
};

// WebSocket URL
const getWsUrl = () => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:6100';
  return base.replace(/^http/, 'ws') + '/ws';
};

// configure TRPCClient to use HTTP only
const baseClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      headers: () => {
        const token = localStorage.getItem("authToken");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

// Heartbeat functions
function startHeartbeat() {
  if (heartbeatInterval) return;
  
  console.log("💓 Starting heartbeat");
  heartbeatInterval = window.setInterval(async () => {
    try {
      const response = await baseClient.heartbeat.query();
      const latency = Date.now() - response.timestamp;
      lastHeartbeatTime = Date.now();
      console.log(`💓 Heartbeat OK (latency: ${latency}ms)`);
    } catch (error) {
      console.error("💔 Heartbeat failed:", error);
    }
  }, 10000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    console.log("💔 Stopping heartbeat");
    window.clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Start heartbeat on load
if (typeof window !== 'undefined') {
  startHeartbeat();
  // Auto-connect WebSocket on page load
  connectWebSocket();
}

// WebSocket functions
export function connectWebSocket(onMessage?: (message: string) => void) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("🔌 WebSocket already connected");
    return;
  }

  const wsUrl = getWsUrl();
  console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log("✅ WebSocket connected");
      _globalStore.loading.websocket.loading = false;
      _globalStore.loading.websocket.done = true;

  };
  
  ws.onmessage = (event) => {
    console.log("📩 WebSocket message received:", event.data);
    const data = JSON.parse(event.data);
    
    if (data.type === "AUTH") {
      wsMessage = event.data;
    }
    
    if (data.type === "DISCONNECT") {
      console.log("🚫 Disconnect message received:", data.reason);
      ws?.close();
      ws = null;
      // Clear auth and redirect
      _globalStore.setAuthToken(null);
      _globalStore.user = null;
      window.location.href = "/login";
    }
    
    if (onMessage) {
      onMessage(event.data);
    }
  };
  
  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
  };
  
  ws.onclose = () => {
    console.log("🔌 WebSocket disconnected");
    ws = null;
    
    // Retry connection after 3 seconds if not done
    if (!_globalStore.loading.websocket.done) {
      console.log("🔄 Retrying connection in 3 seconds...");
      setTimeout(() => {
        connectWebSocket(onMessage);
      }, 3000);
    }
  };
}

export function sendWebSocketMessage(message: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = { type: "AUTH", ...message };
    const messageStr = JSON.stringify(payload);
    console.log("📤 Sending WebSocket message:", messageStr);
    ws.send(messageStr);
  } else {
    console.error("❌ WebSocket not connected");
  }
}

export function disconnectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

// Export heartbeat status getter
export function getConnectionStatus() {
  return {
    lastHeartbeat: lastHeartbeatTime,
    timeSinceLastHeartbeat: Date.now() - lastHeartbeatTime,
  };
}

// Wrapper to handle errors and return consistent format
function wrapMutation<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      if (error instanceof TRPCClientError) {
        return {
          success: false,
          message: error.message,
          code: error.data?.code,
        };
      }
      return {
        success: false,
        message: "An unexpected error occurred",
      };
    }
  };
}

// Create wrapped client
export const trpc = {
  signup: {
    mutate: wrapMutation(baseClient.signup.mutate),
  },
  auth: {
    mutate: wrapMutation(baseClient.auth.mutate),
  },
  login: {
    mutate: wrapMutation(baseClient.login.mutate),
  },
  ping: baseClient.ping,
  heartbeat: baseClient.heartbeat,
  giveMeRandomNumber: baseClient.giveMeRandomNumber,
  createUser: {
    mutate: wrapMutation(baseClient.createUser.mutate),
  },
  getAllUsers: {
    query: wrapMutation(baseClient.getAllUsers.query),
  },
  updateUser: {
    mutate: wrapMutation(baseClient.updateUser.mutate),
  },
  deleteUser: {
    mutate: wrapMutation(baseClient.deleteUser.mutate),
  },
  updateMyPassword: {
    mutate: wrapMutation(baseClient.updateMyPassword.mutate),
  },
  createEatingTable: {
    mutate: wrapMutation(baseClient.createEatingTable.mutate),
  },
  updateEatingTable: {
    mutate: wrapMutation(baseClient.updateEatingTable.mutate),
  },
  deleteEatingTable: {
    mutate: wrapMutation(baseClient.deleteEatingTable.mutate),
  },
  listEatingTables: {
    query: wrapMutation(baseClient.listEatingTables.query),
  },
  getEatingTableById: {
    query: wrapMutation(baseClient.getEatingTableById.query),
  },
  createCategory: {
    mutate: wrapMutation(baseClient.createCategory.mutate),
  },
  updateCategory: {
    mutate: wrapMutation(baseClient.updateCategory.mutate),
  },
  deleteCategory: {
    mutate: wrapMutation(baseClient.deleteCategory.mutate),
  },
  listCategories: {
    query: wrapMutation(baseClient.listCategories.query),
  },
  getCategoryById: {
    query: wrapMutation(baseClient.getCategoryById.query),
  },
  createMenuItem: {
    mutate: wrapMutation(baseClient.createMenuItem.mutate),
  },
  updateMenuItem: {
    mutate: wrapMutation(baseClient.updateMenuItem.mutate),
  },
  deleteMenuItem: {
    mutate: wrapMutation(baseClient.deleteMenuItem.mutate),
  },
  listMenuItems: {
    query: wrapMutation(baseClient.listMenuItems.query),
  },
  listAllMenuItems: {
    query: wrapMutation(baseClient.listAllMenuItems.query),
  },
  getMenuItemById: {
    query: wrapMutation(baseClient.getMenuItemById.query),
  },
  createItemPrice: {
    mutate: wrapMutation(baseClient.createItemPrice.mutate),
  },
  deleteItemPrice: {
    mutate: wrapMutation(baseClient.deleteItemPrice.mutate),
  },
  listItemPricesByMenuItem: {
    query: wrapMutation(baseClient.listItemPricesByMenuItem.query),
  },
  createMenuItemSubMenuItem: {
    mutate: wrapMutation(baseClient.createMenuItemSubMenuItem.mutate),
  },
  deleteMenuItemSubMenuItem: {
    mutate: wrapMutation(baseClient.deleteMenuItemSubMenuItem.mutate),
  },
  listMenuItemSubMenuItems: {
    query: wrapMutation(baseClient.listMenuItemSubMenuItems.query),
  },
  updateMenuItemSubMenuItem: {
    mutate: wrapMutation(baseClient.updateMenuItemSubMenuItem.mutate),
  },  
  updateOrder: {
    mutate: wrapMutation(baseClient.updateOrder.mutate),
  },
  printOrder: {
    mutate: wrapMutation(baseClient.printOrder.mutate),
  },
  printReceiptOfEatingTable: {
    mutate: wrapMutation(baseClient.printReceiptOfEatingTable.mutate),
  },
  printReceiptOfOrder: {
    mutate: wrapMutation(baseClient.printReceiptOfOrder.mutate),
  },
  deleteOrder: {
    mutate: wrapMutation(baseClient.deleteOrder.mutate),
  },
  createOrder: {
    mutate: wrapMutation(baseClient.createOrder.mutate),
  },
  getOrderById: {
    query: wrapMutation(baseClient.getOrderById.query),
  },
  listOrders: {
    query: wrapMutation(baseClient.listOrders.query),
  },
  getOrderByIdWithRelations: {
    query: wrapMutation(baseClient.getOrderByIdWithRelations.query),
  },
  createMenuItemOrder: {
    mutate: wrapMutation(baseClient.createMenuItemOrder.mutate),
  },
  updateMenuItemOrder: {
    mutate: wrapMutation(baseClient.updateMenuItemOrder.mutate),
  },
  deleteMenuItemOrder: {
    mutate: wrapMutation(baseClient.deleteMenuItemOrder.mutate),
  },
  listMenuItemOrders: {
    query: wrapMutation(baseClient.listMenuItemOrders.query),
  },
  getMenuItemOrderById: {
    query: wrapMutation(baseClient.getMenuItemOrderById.query),
  },
  updateMenuItemOrderQuantity: {
    mutate: wrapMutation(baseClient.updateMenuItemOrderQuantity.mutate),
  },
};

