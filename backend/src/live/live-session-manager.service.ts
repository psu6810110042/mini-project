import { Injectable } from '@nestjs/common';
import { SnippetVisibility } from '../snippets/entities/snippet-visibility.enum';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { UserRole } from '../users/entities/user.entity';

export interface ActiveSession {
  title?: string;
  language?: string;
  startTime: string;
  owner: string; // username
  ownerId: number;
  snippetId?: string;
  visibility?: SnippetVisibility;
}

@Injectable()
export class LiveSessionManager {
  private readonly sessionOwners = new Map<string, number>();
  private readonly sessionPermissions = new Map<string, Set<number>>();
  private readonly sessionParticipants = new Map<
    string,
    Map<string, RequestUser>
  >();
  private readonly activeSessions = new Map<string, ActiveSession>();
  private readonly sessionCode = new Map<string, string>();
  private readonly sessionSavedStatus = new Map<string, boolean>();

  createSession(
    sessionId: string,
    user: RequestUser,
    details: {
      title: string;
      language: string;
      visibility: SnippetVisibility;
    },
  ) {
    if (this.sessionOwners.has(sessionId)) {
      return; // Session already exists
    }
    this.sessionOwners.set(sessionId, user.id);
    this.sessionPermissions.set(sessionId, new Set<number>());
    this.sessionParticipants.set(sessionId, new Map());
    this.sessionCode.set(sessionId, '// Start coding...');
    this.sessionSavedStatus.set(sessionId, false);
    this.activeSessions.set(sessionId, {
      startTime: new Date().toISOString(),
      owner: user.username,
      ownerId: user.id,
      title: details.title,
      language: details.language,
      visibility: details.visibility,
    });
  }

  isSessionOwner(sessionId: string, userId: number): boolean {
    return this.sessionOwners.get(sessionId) === userId;
  }

  isAllowed(sessionId: string, userId: number): boolean {
    return this.sessionPermissions.get(sessionId)?.has(userId) ?? false;
  }

  isAuthorized(sessionId: string, user: RequestUser): boolean {
    const isOwner = this.isSessionOwner(sessionId, user.id);
    const isAdmin = user.role === UserRole.ADMIN;
    const isAllowed = this.isAllowed(sessionId, user.id);
    return isOwner || isAdmin || isAllowed;
  }

  joinSession(sessionId: string, socketId: string, user: RequestUser) {
    this.sessionParticipants.get(sessionId)?.set(socketId, user);
  }

  leaveSession(sessionId: string, socketId: string) {
    this.sessionParticipants.get(sessionId)?.delete(socketId);
  }

  findSessionBySocketId(socketId: string): string | undefined {
    for (const [
      sessionId,
      participants,
    ] of this.sessionParticipants.entries()) {
      if (participants.has(socketId)) {
        return sessionId;
      }
    }
    return undefined;
  }

  getParticipants(sessionId: string): RequestUser[] {
    const participantsMap = this.sessionParticipants.get(sessionId);
    if (!participantsMap) return [];

    const uniqueUsers = new Map<number, RequestUser>();
    participantsMap.forEach((user) => {
      uniqueUsers.set(user.id, user);
    });
    return Array.from(uniqueUsers.values());
  }

  grantPermission(sessionId: string, userId: number) {
    this.sessionPermissions.get(sessionId)?.add(userId);
  }

  revokePermission(sessionId: string, userId: number) {
    this.sessionPermissions.get(sessionId)?.delete(userId);
  }

  getPermissions(sessionId: string): number[] {
    return Array.from(this.sessionPermissions.get(sessionId) || []);
  }

  getSessionDetails(sessionId: string) {
    const ownerId = this.sessionOwners.get(sessionId);
    const allowedUserIds = this.getPermissions(sessionId);
    const currentCode = this.sessionCode.get(sessionId) || '';
    const isSaved = this.sessionSavedStatus.get(sessionId) || false;
    const sessionData = this.activeSessions.get(sessionId);

    return {
      ownerId,
      allowedUserIds,
      currentCode,
      isSaved,
      snippetId: sessionData?.snippetId,
      snippetTitle: sessionData?.title,
      language: sessionData?.language || 'javascript',
    };
  }

  updateCode(sessionId: string, code: string) {
    this.sessionCode.set(sessionId, code);
  }

  identifySnippet(sessionId: string, snippetId: string, title?: string) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.snippetId = snippetId;
      if (title) {
        session.title = title;
      }
    }
  }

  setSessionSavedStatus(sessionId: string, status: boolean) {
    this.sessionSavedStatus.set(sessionId, status);
  }

  getActiveSession(sessionId: string): ActiveSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  updateLanguage(sessionId: string, language: string) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.language = language;
    }
  }

  cleanupSession(sessionId: string) {
    this.sessionOwners.delete(sessionId);
    this.sessionPermissions.delete(sessionId);
    this.sessionParticipants.delete(sessionId);
    this.sessionCode.delete(sessionId);
    this.sessionSavedStatus.delete(sessionId);
    this.activeSessions.delete(sessionId);
  }

  getActiveSessions(): [string, ActiveSession][] {
    return Array.from(this.activeSessions.entries());
  }

  getPublicSessions(): [string, ActiveSession][] {
    return Array.from(this.activeSessions.entries()).filter(
      ([, session]) => session.visibility !== SnippetVisibility.PRIVATE,
    );
  }

  doesSessionExist(sessionId: string): boolean {
    return this.sessionOwners.has(sessionId);
  }
}
