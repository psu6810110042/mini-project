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

import { SnippetsService } from '../snippets/snippets.service';
import { UpdateSnippetDto } from '../snippets/dto/update-snippet.dto';

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

  constructor(private readonly snippetsService: SnippetsService) { }

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
    { title?: string; language?: string; startTime: string; owner: string, snippetId?: string, visibility?: string }
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

  // Map<sessionId, boolean> - Track if a session has been saved to dashboard
  private readonly sessionSavedStatus = new Map<string, boolean>();

  @SubscribeMessage('join-dashboard')
  handleJoinDashboard(client: AuthenticatedSocket): void {
    client.join('dashboard');
    // Send current active sessions immediately
    client.emit('active-sessions-update', Array.from(this.activeSessions.entries()));
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    client: AuthenticatedSocket,
    payload: string | { sessionId: string; language?: string; title?: string; visibility?: string }
  ): void {
    console.log('handleJoinSession payload:', payload);
    const sessionId = typeof payload === 'string' ? payload : payload.sessionId;
    const language = typeof payload === 'string' ? 'javascript' : (payload.language || 'javascript');
    // Use provided title if available, otherwise default
    const title = (typeof payload === 'object' && payload.title) ? payload.title : `Session ${sessionId}`;
    // Use provided visibility, default to PUBLIC
    const visibility = (typeof payload === 'object' && payload.visibility) ? payload.visibility : 'PUBLIC';

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
      this.sessionSavedStatus.set(sessionId, false);
      this.activeSessions.set(sessionId, {
        startTime: new Date().toISOString(),
        owner: user.username,
        title: title,
        language: language,
        visibility: visibility,
      });

      console.log(
        `User ${user.username} is now owner of session ${sessionId} with language ${language}, title "${title}", visibility "${visibility}"`,
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

    // Auto-grant permission removed. Only owner has initial permission.
    // Owner is handled via 'ownerId' check in Guard/Business Logic.

    // Send current permissions for this session
    const allowedUserIds = Array.from(this.sessionPermissions.get(sessionId) || []);
    const currentCode = this.sessionCode.get(sessionId) || '';
    const isSaved = this.sessionSavedStatus.get(sessionId) || false;
    const sessionData = this.activeSessions.get(sessionId);
    const snippetId = sessionData?.snippetId;
    const snippetTitle = sessionData?.title;
    const currentLanguage = sessionData?.language || 'javascript';

    client.emit('session-details', {
      ownerId,
      allowedUserIds,
      currentCode,
      isSaved,
      snippetId,
      snippetTitle,
      language: currentLanguage
    });

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

  @SubscribeMessage('mark-session-saved')
  handleMarkSessionSaved(
    client: AuthenticatedSocket,
    sessionId: string
  ): void {
    // Ideally check permissions, but basic flow assumes client logic handled it. 
    // Double check: is user owner or allowed?
    const ownerId = this.sessionOwners.get(sessionId);
    const permissions = this.sessionPermissions.get(sessionId);
    const user = client.user;
    const isOwner = user.id === ownerId;
    const isAllowed = permissions?.has(user.id);

    if (isOwner || isAllowed) {
      this.sessionSavedStatus.set(sessionId, true);
      this.server.to(sessionId).emit('session-saved-update', true);
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

  @SubscribeMessage('identify-snippet')
  handleIdentifySnippet(
    client: AuthenticatedSocket,
    payload: { sessionId: string; snippetId: string; title?: string }
  ): void {
    const ownerId = this.sessionOwners.get(payload.sessionId);
    if (client.user.id !== ownerId) {
      return; // Only owner can set the snippet ID
    }

    const session = this.activeSessions.get(payload.sessionId);
    if (session) {
      session.snippetId = payload.snippetId;
      if (payload.title) {
        session.title = payload.title;
      }
      this.activeSessions.set(payload.sessionId, session);

      // Broadcast update so late joiners or refresher know
      this.server.to(payload.sessionId).emit('session-details-update', { snippetId: payload.snippetId, snippetTitle: payload.title });
    }
  }

  @SubscribeMessage('save-snippet')
  async handleSaveSnippet(
    client: AuthenticatedSocket,
    payload: { sessionId: string; updateDto: UpdateSnippetDto }
  ): Promise<void> {
    const sessionId = payload.sessionId;
    const ownerId = this.sessionOwners.get(sessionId);
    const permissions = this.sessionPermissions.get(sessionId);
    const user = client.user;

    const isOwner = user.id === ownerId;
    const isAdmin = user.role === 'ADMIN';
    const isAllowed = permissions?.has(user.id);

    if (!isOwner && !isAdmin && !isAllowed) {
      client.emit('auth-error', 'You are not authorized to save changes.');
      return;
    }

    // Get linked snippet ID
    const session = this.activeSessions.get(sessionId);
    if (!session?.snippetId) {
      client.emit('error', 'No linked snippet found for this session.');
      return;
    }

    try {
      await this.snippetsService.updateShared(session.snippetId, payload.updateDto);

      // Broadcast success
      this.server.to(sessionId).emit('snippet-saved', {
        updater: user.username,
        timestamp: new Date().toISOString()
      });

      this.sessionSavedStatus.set(sessionId, true);
      this.server.to(sessionId).emit('session-saved-update', true);

    } catch (error) {
      console.error('Failed to save snippet:', error);
      client.emit('error', 'Failed to save snippet updates.');
    }
  }

  @SubscribeMessage('language-update')
  handleLanguageUpdate(
    client: AuthenticatedSocket,
    payload: { sessionId: string; language: string }
  ): void {
    const ownerId = this.sessionOwners.get(payload.sessionId);
    const user = client.user;
    const permissions = this.sessionPermissions.get(payload.sessionId);

    // Authorization check: Owner or Admin or Allowed User
    const isOwner = user.id === ownerId;
    const isAdmin = user.role === 'ADMIN';
    const isAllowed = permissions?.has(user.id);

    if (!isOwner && !isAdmin && !isAllowed) {
      client.emit('auth-error', 'You are not authorized to change the language.');
      return;
    }

    // Update session state
    const session = this.activeSessions.get(payload.sessionId);
    if (session) {
      session.language = payload.language;
      this.activeSessions.set(payload.sessionId, session);

      // Broadcast to session members
      this.server.to(payload.sessionId).emit('language-update', payload.language);

      // Broadcast update to dashboard so the language tag updates there too
      this.broadcastActiveSessions();
    }
  }

  private cleanupSession(sessionId: string) {
    this.sessionOwners.delete(sessionId);
    this.sessionPermissions.delete(sessionId);
    this.sessionParticipants.delete(sessionId);
    this.sessionCode.delete(sessionId);
    this.sessionSavedStatus.delete(sessionId);
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
    // Broadcast to dashboard room - Filter out PRIVATE sessions
    const allSessions = Array.from(this.activeSessions.entries());
    const publicSessions = allSessions.filter(([id, session]) => {
      // If visibility exists and is PRIVATE, filter it out
      // @ts-ignore
      const isPrivate = (session as any).visibility === 'PRIVATE';
      if (isPrivate) {
        console.log(`Filtering out private session ${id} from dashboard broadcast`);
      }
      return !isPrivate;
    });
    console.log(`Broadcasting ${publicSessions.length} public sessions (out of ${allSessions.length} total)`);
    this.server.to('dashboard').emit('active-sessions-update', publicSessions);
  }
}
