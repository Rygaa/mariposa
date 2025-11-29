import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

// Socket list to track connections with user information
interface SocketConnection {
  sockets: Array<{
    socketId: string;
    socket: WebSocket;
    ipAddress: string;
    userAgent: string;
  }>;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

export const socketList: SocketConnection[] = [];

// Helper function to get active users
export function getActiveUsers() {
  return socketList
    .filter((connection) => connection.user)
    .map((connection) => connection.user!);
}

// Helper function to get connection count
export function getConnectionStats() {
  const totalSockets = socketList.reduce((acc, conn) => acc + conn.sockets.length, 0);
  const authenticated = socketList.filter(conn => conn.user).length;
  const anonymous = socketList.filter(conn => !conn.user).length;
  
  return {
    totalSockets,
    totalConnections: socketList.length,
    authenticated,
    anonymous,
  };
}

// Helper function to get IP address from request
export function getIpAddress(req: any): string {
  let ipAddress = 
    req.headers['cf-connecting-ip'] as string || // Cloudflare real IP
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.socket.remoteAddress ||
    'unknown';
  
  // Handle multiple IPs in x-forwarded-for (take the first one)
  if (ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }
  
  // Convert IPv6 localhost to IPv4 for consistency
  if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
    ipAddress = '127.0.0.1';
  }
  
  // Remove IPv6 prefix if present
  if (ipAddress.startsWith('::ffff:')) {
    ipAddress = ipAddress.substring(7);
  }
  
  return ipAddress;
}

// Helper function to get User-Agent from request
export function getUserAgent(req: any): string {
  return req.headers['user-agent'] || 'unknown';
}

// Function to add a socket connection
export function Add(
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  },
  socket: WebSocket,
  ipAddress: string,
  userAgent: string
): string {
  // Generate unique socket ID
  const socketId = `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Check if user already exists
  const existingConnection = socketList.find(conn => conn.user?.id === user.id);
  
  if (existingConnection) {
    // User exists, just add the socket to their connection
    existingConnection.sockets.push({
      socketId: socketId,
      socket: socket,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });
    console.log(`➕ Socket added to existing user ${user.email}. Total sockets: ${existingConnection.sockets.length}`);
  } else {
    // New user, create new connection
    socketList.push({
      sockets: [{
        socketId: socketId,
        socket: socket,
        ipAddress: ipAddress,
        userAgent: userAgent,
      }],
      user: user,
    });
    console.log(`✅ New connection created for user ${user.email}. Total connections: ${socketList.length}`);
  }
  
  return socketId;
}

// Function to disconnect old sockets for the same user
export function enforceSingleDeviceSession(userId: string): void {
  for (const connection of socketList) {
    if (connection.user?.id !== userId) continue;
    if (!connection.sockets.length) return;

    const newest = connection.sockets[connection.sockets.length - 1];
    const { ipAddress, userAgent } = newest;

    // Allowed sockets (same device/session)
    const allowed = connection.sockets.filter(
      s => s.ipAddress === ipAddress && s.userAgent === userAgent
    );

    // Sockets to disconnect (everything else)
    const toDisconnect = connection.sockets.filter(
      s => !allowed.includes(s)
    );

    // Disconnect and remove them
    for (const socketObj of toDisconnect) {
      try {
        socketObj.socket.send(JSON.stringify({
          type: 'DISCONNECT',
          reason: 'New connection from same device detected',
        }));
      } catch (_) {}

      try {
        socketObj.socket.close(1008, 'Duplicate connection');
      } catch (_) {}

      // Remove from user's socket array
      const index = connection.sockets.indexOf(socketObj);
      if (index > -1) connection.sockets.splice(index, 1);
    }

    return; // Only one user match needed
  }
}

// Function to send a message to all users with a specific role
export function sendMessageToRole(role: string, message: any): void {
  let sentCount = 0;
  
  for (const connection of socketList) {
    if (!connection.user) continue;
    
    // Check if user has the specified role
    if (connection.user.role && connection.user.role.includes(role)) {
      console.log(connection.user.email, 'has role', role);
      // Send to all sockets for this user
      for (const socketObj of connection.sockets) {
        try {
          socketObj.socket.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to user ${connection.user.email}:`, error);
        }
      }
    }
  }
  
  console.log(`📤 Sent message to ${sentCount} socket(s) with role ${role}`);
}
