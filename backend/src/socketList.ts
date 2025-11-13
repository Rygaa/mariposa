import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

// Socket list to track connections with user information
interface SocketConnection {
  sockets: Array<{
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
): void {
  // Check if user already exists
  const existingConnection = socketList.find(conn => conn.user?.id === user.id);
  
  if (existingConnection) {
    // User exists, just add the socket to their connection
    existingConnection.sockets.push({
      socket: socket,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });
    console.log(`➕ Socket added to existing user ${user.email}. Total sockets: ${existingConnection.sockets.length}`);
  } else {
    // New user, create new connection
    socketList.push({
      sockets: [{
        socket: socket,
        ipAddress: ipAddress,
        userAgent: userAgent,
      }],
      user: user,
    });
    console.log(`✅ New connection created for user ${user.email}. Total connections: ${socketList.length}`);
  }
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


  // // Find the user's connection
  // const userConnection = socketList.find(conn => conn.user?.id === userId);
  
  // if (!userConnection || userConnection.sockets.length <= 1) {
  //   return socketsToDisconnect; // No duplicates to handle
  // }
  
  // // Group sockets by IP + User-Agent fingerprint
  // const fingerprintMap = new Map<string, typeof userConnection.sockets>();
  
  // userConnection.sockets.forEach(socketObj => {
  //   const fingerprint = `${socketObj.ipAddress}|${socketObj.userAgent}`;
  //   if (!fingerprintMap.has(fingerprint)) {
  //     fingerprintMap.set(fingerprint, []);
  //   }
  //   fingerprintMap.get(fingerprint)!.push(socketObj);
  // });
  
  // // For each fingerprint, keep only the most recent socket and disconnect the rest
  // fingerprintMap.forEach((sockets, fingerprint) => {
  //   if (sockets.length > 1) {
  //     // Disconnect all but the last (most recent) socket
  //     const toDisconnect = sockets.slice(0, -1);
      
  //     toDisconnect.forEach(socketObj => {
  //       socketsToDisconnect.push(socketObj.socket);
        
  //       try {
  //         socketObj.socket.send(JSON.stringify({
  //           type: 'DISCONNECT',
  //           reason: 'New connection from same device detected',
  //         }));
  //         socketObj.socket.close(1008, 'Duplicate connection');
  //       } catch (error) {
  //         console.error('Error disconnecting socket:', error);
  //       }
        
  //       // Remove from the sockets array
  //       const index = userConnection.sockets.indexOf(socketObj);
  //       if (index > -1) {
  //         userConnection.sockets.splice(index, 1);
  //       }
  //     });
  //   }
//   });
  
//   console.log(`🗑️ Disconnected ${socketsToDisconnect.length} old socket(s) for user ${userId}`);
//   return socketsToDisconnect;
// }
