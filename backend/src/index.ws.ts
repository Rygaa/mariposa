import type { FastifyInstance } from "fastify";
import { socketList, getIpAddress, getUserAgent, Add, enforceSingleDeviceSession } from "./socketList";

export async function setupWebSocketServer(app: FastifyInstance, appRouter: any) {
  console.log("🔄 Setting up WebSocket server...");

  // Register WebSocket route handler
  app.get("/ws", { websocket: true }, async (socket, req) => {
    console.log(`➕➕ WebSocket connection`);
    
    socket.on("message", async (message) => {
      const data = JSON.parse(message.toString());
      
      if (data.type === "AUTH") {
        console.log('AUTH')
        // Get IP and User-Agent
        const ipAddress = getIpAddress(req);
        const userAgent = getUserAgent(req);
        
        // Add socket to the list using Add function
        Add(data.user, socket, ipAddress, userAgent);
        console.log(socketList);

        // Disconnect old sockets for the same user
        // enforceSingleDeviceSession(data.user.id);

        console.log(socketList);
        
        socket.send(JSON.stringify({ 
          type: "AUTH",
          message: "Hello world",
          user: data.user 
        }));
      }
    });
    
    socket.on("close", () => {
      console.log(`➖➖ WebSocket connection closed`);
      
      // Remove socket from the list
      const connectionIndex = socketList.findIndex(conn => 
        conn.sockets.some(s => s.socket === socket)
      );
      
      if (connectionIndex !== -1) {
        const connection = socketList[connectionIndex];
        
        // Remove the specific socket from the connection
        connection.sockets = connection.sockets.filter(s => s.socket !== socket);
        
        // If no sockets left for this connection, remove the entire connection
        if (connection.sockets.length === 0) {
          socketList.splice(connectionIndex, 1);
        }
      }
      
      console.log(`📋 Socket removed. Total: ${socketList.length}`);
    });
  });

  console.log("✅ WebSocket route registered at /ws");
}
