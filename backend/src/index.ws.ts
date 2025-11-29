import type { FastifyInstance } from "fastify";
import { socketList, getIpAddress, getUserAgent, Add, enforceSingleDeviceSession } from "./socketList";

export async function setupWebSocketServer(app: FastifyInstance, appRouter: any) {
  console.log("🔄 Setting up WebSocket server...");

  // Register WebSocket route handler
  app.get("/ws", { websocket: true }, async (socket, req) => {
    console.log(`➕➕ WebSocket connection`);
    let socketId: string | null = null;
    
    socket.on("message", async (message) => {
      const data = JSON.parse(message.toString());
      
      if (data.type === "AUTH") {
        console.log('AUTH')
        // Get IP and User-Agent
        const ipAddress = getIpAddress(req);
        const userAgent = getUserAgent(req);
        
        // Add socket to the list using Add function and store the socketId
        socketId = Add(data.user, socket, ipAddress, userAgent);
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
      
      if (!socketId) {
        console.log('⚠️ Socket closed before authentication');
        return;
      }
      
      // Remove socket from the list using socketId
      for (let i = socketList.length - 1; i >= 0; i--) {
        const connection = socketList[i];
        const socketIndex = connection.sockets.findIndex(s => s.socketId === socketId);
        
        if (socketIndex !== -1) {
          // Remove the specific socket from the connection
          connection.sockets.splice(socketIndex, 1);
          
          console.log(`🔍 Socket removed from ${connection.user?.email || 'anonymous'}. Remaining sockets: ${connection.sockets.length}`);
          
          // If no sockets left for this connection, remove the entire connection
          if (connection.sockets.length === 0) {
            socketList.splice(i, 1);
            console.log(`🗑️ Connection removed for ${connection.user?.email || 'anonymous'}`);
          }
          
          break;
        }
      }
      
      console.log(`📋 Total connections: ${socketList.length}, Total sockets: ${socketList.reduce((acc, conn) => acc + conn.sockets.length, 0)}`);
    });
  });

  console.log("✅ WebSocket route registered at /ws");
}
