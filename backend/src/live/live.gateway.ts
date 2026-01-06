import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  user: {
    id: number;
    username: string;
    role: string;
  };
}

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: {
    origin: '*', // For development, allow all origins. In production, restrict this.
  },
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map<sessionId, ownerId>
  private readonly sessionOwners = new Map<string, number>();

  handleConnection(client: AuthenticatedSocket) {
    // The WsJwtGuard does not run on the initial connection, so `client.user` is not available here.
    // The guard will protect all subsequent message handlers.
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up if the user was the last one in any room they were in.
    for (const room of client.rooms) {
      if (room !== client.id) {
        // socket.io rooms are also client.id
        const otherClients = await this.server.in(room).fetchSockets();
        if (otherClients.length === 0) {
          this.sessionOwners.delete(room);
          console.log(`Session ${room} is now empty and has been cleaned up.`);
        }
      }
    }
  }

  @SubscribeMessage('join-session')
  handleJoinSession(client: AuthenticatedSocket, sessionId: string): void {
    client.join(sessionId);
    console.log(
      `Client ${client.user.username} (${client.id}) joined session ${sessionId}`,
    );

    // If session has no owner, this user becomes the owner.
    if (!this.sessionOwners.has(sessionId)) {
      this.sessionOwners.set(sessionId, client.user.id);
      console.log(
        `User ${client.user.username} is now owner of session ${sessionId}`,
      );
    }

    // Send session details (including owner) to everyone in the room
    const ownerId = this.sessionOwners.get(sessionId);
    this.server.to(sessionId).emit('session-details', { ownerId });
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    client: AuthenticatedSocket,
    sessionId: string,
  ): Promise<void> {
    client.leave(sessionId);
    console.log(`Client ${client.id} left session ${sessionId}`);

    // Check if the room is now empty
    const clientsInRoom = await this.server.in(sessionId).fetchSockets();
    if (clientsInRoom.length === 0) {
      this.sessionOwners.delete(sessionId);
      console.log(`Session ${sessionId} is now empty and has been cleaned up.`);
    }
  }

  @SubscribeMessage('code-update')
  handleCodeUpdate(
    client: AuthenticatedSocket,
    payload: { sessionId: string; code: string },
  ): void {
    const ownerId = this.sessionOwners.get(payload.sessionId);
    const user = client.user;

    // Check for authorization
    const isOwner = user.id === ownerId;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      // Optionally, send an error back to the client
      client.emit('auth-error', 'You are not authorized to edit this session.');
      return;
    }

    // Broadcast the code update with the editor's username
    const broadcastPayload = {
      code: payload.code,
      editor: user.username,
    };
    this.server.to(payload.sessionId).emit('code-updated', broadcastPayload);
  }
}
