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

  // Map<sessionId, Set<userId>> - Users who have edit permission (Owner is always implicit)
  private readonly sessionPermissions = new Map<string, Set<number>>();

  // Map<sessionId, Map<socketId, User>> - Track participants in each session
  private readonly sessionParticipants = new Map<
    string,
    Map<string, AuthenticatedSocket['user']>
  >();

  // Map<sessionId, { title?: string, language?: string, startTime: string }>
  private readonly activeSessions = new Map<
    string,
    { title?: string; language?: string; startTime: string; owner: string }
  >();

  handleConnection(client: AuthenticatedSocket) {
    // The WsJwtGuard does not run on the initial connection, so `client.user` is not available here.
    // The guard will protect all subsequent message handlers.
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);

    // We need to find which sessions this client was in to clean up participants
    // iterate over all sessions in sessionParticipants
    for (const [sessionId, participants] of this.sessionParticipants.entries()) {
      if (participants.has(client.id)) {
        participants.delete(client.id);
        this.broadcastParticipants(sessionId);
      }
    }

    // Clean up if the user was the last one in any room they were in.
    // Note: client.rooms is empty after disconnect, so we rely on sessionParticipants logic above or manual tracking if needed.
    // However, for proper session cleanup, we should check if the session is empty.

    // Ideally we track which session a socket is in. For now, we cycle through active sessions.
    for (const sessionId of this.sessionOwners.keys()) {
      const clientsInRoom = await this.server.in(sessionId).fetchSockets();
      if (clientsInRoom.length === 0) {
        this.cleanupSession(sessionId);
      }
    }
  }

  // Map<sessionId, currentCode>
  private readonly sessionCode = new Map<string, string>();

  @SubscribeMessage('join-dashboard')
  handleJoinDashboard(client: AuthenticatedSocket): void {
    client.join('dashboard');
    // Send current active sessions immediately
    client.emit('active-sessions-update', Array.from(this.activeSessions.entries()));
  }

  @SubscribeMessage('join-session')
  handleJoinSession(client: AuthenticatedSocket, sessionId: string): void {
    client.join(sessionId);
    const user = client.user;
    console.log(
      `Client ${user.username} (${client.id}) joined session ${sessionId}`,
    );

    // Initialize session if new
    if (!this.sessionOwners.has(sessionId)) {
      this.sessionOwners.set(sessionId, user.id);
      this.sessionPermissions.set(sessionId, new Set<number>()); // No extra permissions initially
      this.sessionParticipants.set(sessionId, new Map());
      this.sessionCode.set(sessionId, '// Start coding...');
      this.activeSessions.set(sessionId, {
        startTime: new Date().toISOString(),
        owner: user.username,
        // Could receive title/lang from client if needed, defaulting for now
        title: `Session ${sessionId}`,
        language: 'javascript'
      });

      console.log(
        `User ${user.username} is now owner of session ${sessionId}`,
      );
      this.broadcastActiveSessions();
    }

    // Add to participants
    const participants = this.sessionParticipants.get(sessionId);
    if (participants) {
      participants.set(client.id, user); // Track by socketId to handle multiple tabs/connections same user? 
      // Actually, distinct users is better, but map by socketID ensures we can remove the correct connection.
    }
    this.broadcastParticipants(sessionId);

    // Send session details
    const ownerId = this.sessionOwners.get(sessionId);
    // Send current permissions for this session
    const allowedUserIds = Array.from(this.sessionPermissions.get(sessionId) || []);
    const currentCode = this.sessionCode.get(sessionId) || '';

    client.emit('session-details', { ownerId, allowedUserIds, currentCode });

    // Also broadcast permissions to everyone (in case someone rejoined)
    this.server.to(sessionId).emit('permissions-update', allowedUserIds);
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    client: AuthenticatedSocket,
    sessionId: string,
  ): Promise<void> {
    client.leave(sessionId);
    console.log(`Client ${client.id} left session ${sessionId}`);

    // Remove from participants
    const participants = this.sessionParticipants.get(sessionId);
    if (participants) {
      participants.delete(client.id);
      this.broadcastParticipants(sessionId);
    }

    // Check if the room is now empty
    const clientsInRoom = await this.server.in(sessionId).fetchSockets();
    if (clientsInRoom.length === 0) {
      this.cleanupSession(sessionId);
    }
  }

  @SubscribeMessage('grant-permission')
  handleGrantPermission(
    client: AuthenticatedSocket,
    payload: { sessionId: string; userId: number }
  ): void {
    const ownerId = this.sessionOwners.get(payload.sessionId);
    if (client.user.id !== ownerId) {
      client.emit('error', 'Only the owner can grant permissions.');
      return;
    }

    const permissions = this.sessionPermissions.get(payload.sessionId);
    if (permissions) {
      permissions.add(payload.userId);
      const allowedUserIds = Array.from(permissions);
      this.server.to(payload.sessionId).emit('permissions-update', allowedUserIds);
    }
  }

  @SubscribeMessage('revoke-permission')
  handleRevokePermission(
    client: AuthenticatedSocket,
    payload: { sessionId: string; userId: number }
  ): void {
    const ownerId = this.sessionOwners.get(payload.sessionId);
    if (client.user.id !== ownerId) {
      client.emit('error', 'Only the owner can revoke permissions.');
      return;
    }

    const permissions = this.sessionPermissions.get(payload.sessionId);
    if (permissions) {
      permissions.delete(payload.userId);
      const allowedUserIds = Array.from(permissions);
      this.server.to(payload.sessionId).emit('permissions-update', allowedUserIds);
    }
  }

  @SubscribeMessage('code-update')
  handleCodeUpdate(
    client: AuthenticatedSocket,
    payload: { sessionId: string; code: string },
  ): void {
    const ownerId = this.sessionOwners.get(payload.sessionId);
    const user = client.user;
    const permissions = this.sessionPermissions.get(payload.sessionId);

    // Check for authorization
    const isOwner = user.id === ownerId;
    const isAdmin = user.role === 'ADMIN';
    const isAllowed = permissions?.has(user.id);

    if (!isOwner && !isAdmin && !isAllowed) {
      client.emit('auth-error', 'You are not authorized to edit this session.');
      return;
    }

    // Update code state
    this.sessionCode.set(payload.sessionId, payload.code);

    // Broadcast the code update with the editor's username
    const broadcastPayload = {
      code: payload.code,
      editor: user.username,
    };
    this.server.to(payload.sessionId).emit('code-updated', broadcastPayload);
  }

  private cleanupSession(sessionId: string) {
    this.sessionOwners.delete(sessionId);
    this.sessionPermissions.delete(sessionId);
    this.sessionParticipants.delete(sessionId);
    this.sessionCode.delete(sessionId);
    this.activeSessions.delete(sessionId);
    console.log(`Session ${sessionId} has been cleaned up.`);
    this.broadcastActiveSessions();
  }

  private broadcastParticipants(sessionId: string) {
    const participantsMap = this.sessionParticipants.get(sessionId);
    if (!participantsMap) return;

    // Deduplicate users by ID
    const uniqueUsers = new Map<number, AuthenticatedSocket['user']>();
    participantsMap.forEach(user => {
      uniqueUsers.set(user.id, user);
    });

    this.server.to(sessionId).emit('participants-update', Array.from(uniqueUsers.values()));
  }

  private broadcastActiveSessions() {
    // Broadcast to dashboard room
    this.server.to('dashboard').emit('active-sessions-update', Array.from(this.activeSessions.entries()));
  }
}
