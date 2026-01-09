import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';
import { SnippetsService } from '../snippets/snippets.service';
import {
  CodeUpdateDto,
  IdentifySnippetDto,
  JoinSessionDto,
  LanguageUpdateDto,
  PermissionDto,
  SaveSnippetDto,
} from './dto';
import type { AuthenticatedSocket } from './types/authenticated-socket.interface';
import { SnippetVisibility } from '../snippets/entities/snippet-visibility.enum';
import { LiveSessionManager } from './live-session-manager.service';

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: {
    origin: '*', // For development, allow all origins. In production, restrict this.
  },
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly snippetsService: SnippetsService,
    private readonly sessionManager: LiveSessionManager,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    console.log(`Client disconnected: ${client.id}`);

    const sessionId = this.sessionManager.findSessionBySocketId(client.id);
    if (sessionId) {
      this.sessionManager.leaveSession(sessionId, client.id);
      this.broadcastParticipants(sessionId);

      // Check if the room is now empty
      const sockets = await this.server.in(sessionId).fetchSockets();
      if (sockets.length === 0) {
        this.sessionManager.cleanupSession(sessionId);
        this.broadcastActiveSessions();
      }
    }
  }

  @SubscribeMessage('join-dashboard')
  handleJoinDashboard(client: AuthenticatedSocket): void {
    client.join('dashboard');
    client.emit(
      'active-sessions-update',
      this.sessionManager.getPublicSessions(),
    );
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    client: AuthenticatedSocket,
    payload: string | JoinSessionDto,
  ): void {
    const sessionId = typeof payload === 'string' ? payload : payload.sessionId;
    const user = client.user;

    if (!this.sessionManager.doesSessionExist(sessionId)) {
      const language =
        typeof payload === 'object'
          ? payload.language || 'javascript'
          : 'javascript';
      const title =
        typeof payload === 'object'
          ? payload.title || `Session ${sessionId}`
          : `Session ${sessionId}`;
      const visibility =
        typeof payload === 'object'
          ? payload.visibility || SnippetVisibility.PUBLIC
          : SnippetVisibility.PUBLIC;

      this.sessionManager.createSession(sessionId, user, {
        title,
        language,
        visibility,
      });
      this.broadcastActiveSessions();
    }

    client.join(sessionId);
    this.sessionManager.joinSession(sessionId, client.id, user);
    this.broadcastParticipants(sessionId);

    const sessionDetails = this.sessionManager.getSessionDetails(sessionId);
    client.emit('session-details', sessionDetails);
    this.server
      .to(sessionId)
      .emit('permissions-update', sessionDetails.allowedUserIds);
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    client: AuthenticatedSocket,
    sessionId: string,
  ): Promise<void> {
    client.leave(sessionId);
    this.sessionManager.leaveSession(sessionId, client.id);
    this.broadcastParticipants(sessionId);

    const clientsInRoom = await this.server.in(sessionId).fetchSockets();
    if (clientsInRoom.length === 0) {
      this.sessionManager.cleanupSession(sessionId);
      this.broadcastActiveSessions();
    }
  }

  @SubscribeMessage('grant-permission')
  handleGrantPermission(
    client: AuthenticatedSocket,
    payload: PermissionDto,
  ): void {
    if (
      !this.sessionManager.isSessionOwner(payload.sessionId, client.user.id)
    ) {
      client.emit('error', 'Only the owner can grant permissions.');
      return;
    }

    this.sessionManager.grantPermission(payload.sessionId, payload.userId);
    const allowedUserIds = this.sessionManager.getPermissions(
      payload.sessionId,
    );
    this.server
      .to(payload.sessionId)
      .emit('permissions-update', allowedUserIds);
  }

  @SubscribeMessage('revoke-permission')
  handleRevokePermission(
    client: AuthenticatedSocket,
    payload: PermissionDto,
  ): void {
    if (
      !this.sessionManager.isSessionOwner(payload.sessionId, client.user.id)
    ) {
      client.emit('error', 'Only the owner can revoke permissions.');
      return;
    }

    this.sessionManager.revokePermission(payload.sessionId, payload.userId);
    const allowedUserIds = this.sessionManager.getPermissions(
      payload.sessionId,
    );
    this.server
      .to(payload.sessionId)
      .emit('permissions-update', allowedUserIds);
  }

  @SubscribeMessage('mark-session-saved')
  handleMarkSessionSaved(client: AuthenticatedSocket, sessionId: string): void {
    if (this.sessionManager.isAuthorized(sessionId, client.user)) {
      this.sessionManager.setSessionSavedStatus(sessionId, true);
      this.server.to(sessionId).emit('session-saved-update', true);
    }
  }

  @SubscribeMessage('code-update')
  handleCodeUpdate(client: AuthenticatedSocket, payload: CodeUpdateDto): void {
    if (!this.sessionManager.isAuthorized(payload.sessionId, client.user)) {
      client.emit('auth-error', 'You are not authorized to edit this session.');
      return;
    }

    this.sessionManager.updateCode(payload.sessionId, payload.code);

    const broadcastPayload = {
      code: payload.code,
      editor: client.user.username,
    };
    this.server.to(payload.sessionId).emit('code-updated', broadcastPayload);
  }

  @SubscribeMessage('identify-snippet')
  handleIdentifySnippet(
    client: AuthenticatedSocket,
    payload: IdentifySnippetDto,
  ): void {
    if (
      !this.sessionManager.isSessionOwner(payload.sessionId, client.user.id)
    ) {
      return;
    }

    this.sessionManager.identifySnippet(
      payload.sessionId,
      payload.snippetId,
      payload.title,
    );

    this.server.to(payload.sessionId).emit('session-details-update', {
      snippetId: payload.snippetId,
      snippetTitle: payload.title,
    });
  }

  @SubscribeMessage('save-snippet')
  async handleSaveSnippet(
    client: AuthenticatedSocket,
    payload: SaveSnippetDto,
  ): Promise<void> {
    if (!this.sessionManager.isAuthorized(payload.sessionId, client.user)) {
      client.emit('auth-error', 'You are not authorized to save changes.');
      return;
    }

    const session = this.sessionManager.getActiveSession(payload.sessionId);
    if (!session?.snippetId) {
      client.emit('error', 'No linked snippet found for this session.');
      return;
    }

    try {
      await this.snippetsService.updateShared(
        session.snippetId,
        payload.updateDto,
      );

      this.server.to(payload.sessionId).emit('snippet-saved', {
        updater: client.user.username,
        timestamp: new Date().toISOString(),
      });

      this.sessionManager.setSessionSavedStatus(payload.sessionId, true);
      this.server.to(payload.sessionId).emit('session-saved-update', true);
    } catch (error) {
      console.error('Failed to save snippet:', error);
      client.emit('error', 'Failed to save snippet updates.');
    }
  }

  @SubscribeMessage('language-update')
  handleLanguageUpdate(
    client: AuthenticatedSocket,
    payload: LanguageUpdateDto,
  ): void {
    if (!this.sessionManager.isAuthorized(payload.sessionId, client.user)) {
      client.emit(
        'auth-error',
        'You are not authorized to change the language.',
      );
      return;
    }

    this.sessionManager.updateLanguage(payload.sessionId, payload.language);
    this.server.to(payload.sessionId).emit('language-update', payload.language);
    this.broadcastActiveSessions();
  }

  private broadcastParticipants(sessionId: string): void {
    const participants = this.sessionManager.getParticipants(sessionId);
    this.server.to(sessionId).emit('participants-update', participants);
  }

  private broadcastActiveSessions(): void {
    this.server
      .to('dashboard')
      .emit('active-sessions-update', this.sessionManager.getPublicSessions());
  }
}
