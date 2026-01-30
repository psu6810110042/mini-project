
# NestBin Backend Technical Documentation

This document provides a comprehensive technical overview of the NestBin backend. It covers the architecture, API endpoints, real-time features, security, and testing strategies.

## Table of Contents
1.  [Project Overview](#project-overview)
2.  [Technologies Used](#technologies-used)
3.  [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation & Setup](#installation--setup)
    -   [Running the Application](#running-the-application)
4.  [Application Architecture](#application-architecture)
    -   [Modules](#modules)
5.  [Module Deep-Dive](#module-deep-dive)
    -   [AuthModule](#authmodule-datasheet)
    -   [LiveModule](#livemodule-datasheet)
6.  [Authentication & Authorization](#authentication--authorization)
    -   [JWT Flow](#jwt-flow)
    -   [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
7.  [Database](#database)
    -   [Entities](#entities)
8.  [API Endpoints](#api-endpoints)
    -   [`/auth`](#auth)
    -   [`/users`](#users)
    -   [`/snippets`](#snippets-1)
    -   [`/tags`](#tags-1)
9.  [Real-Time Collaboration (WebSockets)](#real-time-collaboration-websockets)
    -   [Connection](#connection)
    -   [Events](#events)
10. [Testing](#testing)
    -   [Unit Tests](#unit-tests)
    -   [End-to-End (E2E) Tests](#end-to-end-e2e-tests)

---

## Project Overview

The NestBin backend is a robust server-side application built with NestJS. It powers a collaborative code-sharing platform, similar to Pastebin, but with real-time editing capabilities.

Core features include:
-   User authentication (registration and login).
-   Role-based access control (Admin vs. User).
-   CRUD operations for code snippets.
-   Public vs. Private snippet visibility.
-   Snippet tagging and organization.
-   Liking snippets.
-   Real-time collaborative editing of snippets in live sessions using WebSockets.

---

## Technologies Used

-   **Framework**: [NestJS](https://nestjs.com/) (v11)
-   **Language**: TypeScript
-   **Database**: PostgreSQL
-   **ORM**: [TypeORM](https://typeorm.io/)
-   **Real-time Communication**: WebSockets (`@nestjs/websockets` with Socket.IO)
-   **Authentication**: JSON Web Tokens (JWT) with [Passport.js](http://www.passportjs.org/)
-   **Validation**: `class-validator` and `class-transformer` for request DTOs.
-   **Testing**: Jest for unit and E2E testing.
-   **Containerization**: Docker

---

## Getting Started

### Prerequisites
-   Node.js (v24 or later recommended)
-   npm
-   A running PostgreSQL database instance.
-   Docker (optional, for containerized setup).

### Installation & Setup

1.  **Clone the repository.**

2.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the `backend` directory. This file is ignored by Git and should contain your local configuration secrets.

    ```env
    # .env
    PORT=3000

    # PostgreSQL Database Connection
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=nestbin

    # JWT Secret for signing tokens
    JWT_SECRET=a_very_strong_and_long_secret_key
    ```
    *`TypeORM` is configured with `synchronize: true`, which automatically creates/updates the database schema on application start. This is suitable for development but should be disabled in production in favor of migrations.*

### Running the Application

-   **Development Mode (with auto-reloading):**
    ```bash
    npm run start:dev
    ```

-   **Production Mode:**
    ```bash
    npm run build
    npm run start:prod
    ```

-   **Running with Docker:**
    The project includes a `docker-compose.yml` for easy setup.
    ```bash
    docker-compose up
    ```

---

## Application Architecture

The backend follows a modular architecture, a core concept in NestJS. Each primary feature is encapsulated within its own module, which helps in organizing the codebase and managing dependencies.

### Modules

-   **`AppModule` (`app.module.ts`):** The root module. It imports all other feature modules and configures global providers like `ConfigModule` (for environment variables) and `TypeOrmModule` (for the database connection).

-   **`AuthModule` (`auth/auth.module.ts`):** Handles user registration, login, and JWT strategy. It does not define its own entities but relies on the `UsersModule`.

-   **`UsersModule` (`users/users.module.ts`):** Manages user-related operations. It defines the `User` entity and provides the `UsersService` for user CRUD.

-   **`SnippetsModule` (`snippets/snippets.module.ts`):** The core module for managing code snippets. It handles creation, retrieval, updates, deletion, and liking of snippets.

-   **`TagsModule` (`tags/tags.module.ts`):** Manages tags that can be associated with snippets. It ensures tags are unique and handles their lifecycle.

-   **`LiveModule` (`live/live.module.ts`):** Powers all real-time functionality. It contains the WebSocket gateway (`LiveGateway`) for managing live collaborative sessions.

---

## Module Deep-Dive

### AuthModule Datasheet

The `AuthModule` is responsible for all authentication and authorization logic.

#### Files & Breakdown

-   **`auth.controller.ts`**:
    -   **Purpose**: Defines the HTTP endpoints for authentication.
    -   **Endpoints**:
        -   `POST /register`: Handles new user registration. It uses the `ClassSerializerInterceptor` to ensure the returned user object doesn't include the password. It calls `authService.register`.
        -   `POST /login`: Handles user login. It first validates credentials using `authService.validateUser`, then calls `authService.login` to get a JWT.
    -   **Tests**: `auth.controller.spec.ts` provides a basic test to ensure the controller can be initialized.

-   **`auth.service.ts`**:
    -   **Purpose**: Contains the core business logic for authentication.
    -   **Methods**:
        -   `validateUser(username, pass)`: Finds a user by username and compares the provided password with the stored hash using `bcrypt.compare`. Returns the user object (without password) or `null`.
        -   `login(user)`: Takes a validated user object and generates a JWT using `jwtService.sign`. The payload includes `id`, `username`, and `role`.
        -   `register(username, pass)`: Generates a salt and hashes the password using `bcrypt`. It calls `usersService.create` to save the new user. It includes error handling to throw a `409 Conflict` exception if the username is already taken (by checking for PostgreSQL error code `23505`).
    -   **Tests**: `auth.service.spec.ts` ensures the service can be initialized with its mocked dependencies (`UsersService`, `JwtService`).

-   **`jwt.strategy.ts`**:
    -   **Purpose**: Implements the Passport.js JWT strategy. This is the core of token validation for protected routes.
    -   **Logic**:
        1.  It's configured to extract the JWT from the `Authorization: Bearer <token>` header.
        2.  It uses the `JWT_SECRET` from the environment configuration to verify the token's signature.
        3.  The `validate(payload)` method is called upon successful verification. It receives the decoded JWT payload.
        4.  It uses `usersService.findOne` to retrieve the full user object from the database using the `id` from the token payload (`sub`).
        5.  If the user exists, it returns the user object, which NestJS then attaches to the `Request` object. If not, it throws an `UnauthorizedException`.

-   **Guards**:
    -   **`jwt-auth.guard.ts`**: A simple guard that extends `AuthGuard('jwt')`. Applying `@UseGuards(JwtAuthGuard)` to an endpoint enforces that a valid, non-expired JWT must be present.
    -   **`optional-jwt.guard.ts`**: A custom guard that also extends `AuthGuard('jwt')` but overrides `handleRequest`. It allows a route to proceed even if no user is authenticated (i.e., no token is provided). This is useful for public endpoints (like `GET /snippets`) that can provide extra information if a user happens to be logged in.
    -   **`roles.guard.ts`**: Implements Role-Based Access Control (RBAC). It works with the `@Roles()` decorator. The guard retrieves the required roles for an endpoint using `Reflector` and checks if the authenticated user's role is in the list of required roles.

-   **DTOs (`dto/*.ts`)**:
    -   `login.dto.ts`: Defines the shape and validation rules (`@IsString`, `@MinLength`) for the login request body.
    -   `register.dto.ts`: Defines the shape and validation for the registration request body.

---

### LiveModule Datasheet

The `LiveModule` provides all real-time collaboration functionality via WebSockets.

#### Files & Breakdown

-   **`live.gateway.ts`**:
    -   **Purpose**: The central hub for all WebSocket communication. It manages client connections, rooms, and message handling.
    -   **Decorators**:
        -   `@WebSocketGateway`: Marks the class as a WebSocket gateway.
        -   `@UseGuards(WsJwtGuard)`: Protects the entire gateway, ensuring every connecting client and subsequent message is authenticated.
    -   **Lifecycle Hooks**:
        -   `handleConnection(client)`: Logs a new client connection.
        -   `handleDisconnect(client)`: Handles client disconnection. It finds which session the client was in, removes them, and broadcasts the updated participant list. If the session becomes empty, it calls `sessionManager.cleanupSession` to free up memory.
    -   **Message Handlers (`@SubscribeMessage`)**:
        -   `join-dashboard`: Allows a client to subscribe to a general "dashboard" room to receive updates on all public, active sessions.
        -   `join-session`: Core logic for session entry. A user joins a room corresponding to the `sessionId`. If the session doesn't exist, it is created via `sessionManager`. It then broadcasts the new participant list and emits the full session state (code, permissions) to the joining user.
        -   `leave-session`: Handles a user explicitly leaving a session.
        -   `code-update`: Triggered when a user types. It first checks if the user is authorized (`sessionManager.isAuthorized`). If so, it updates the code in the session manager and broadcasts the new code to all clients in the room.
        -   `grant-permission`/`revoke-permission`: Allows the session owner to manage editing rights for other users. Broadcasts permission updates.
        -   `save-snippet`: Allows an authorized user to persist the current state of the code in the session to the database by calling `snippetsService.updateShared`.
        -   `language-update`: Allows an authorized user to change the session's language, which is then broadcast to all participants.

-   **`live-session-manager.service.ts`**:
    -   **Purpose**: A crucial in-memory state manager for all active WebSocket sessions. This service prevents the need for constant database lookups during a live session. It is a singleton service provided at the `LiveModule` level.
    -   **State Properties (Maps)**:
        -   `sessionOwners`: `Map<sessionId, ownerId>`
        -   `sessionPermissions`: `Map<sessionId, Set<userId>>` (stores users with granted edit access).
        -   `sessionParticipants`: `Map<sessionId, Map<socketId, user>>`
        -   `sessionCode`: `Map<sessionId, codeContent>`
        -   `activeSessions`: `Map<sessionId, ActiveSessionDetails>` (metadata like title, language, owner).
    -   **Key Methods**:
        -   `createSession(sessionId, user, details)`: Initializes all the maps for a new session.
        -   `isAuthorized(sessionId, user)`: A key security method. Checks if a user is the session owner, an admin, or has been granted permission. This is called before any "write" operations like `code-update`.
        -   `getParticipants(sessionId)`: Retrieves a list of unique users in a session.
        -   `getSessionDetails(sessionId)`: Gathers all relevant data for a session to send to a newly joined user.
        -   `cleanupSession(sessionId)`: Deletes all data related to a session from all maps to prevent memory leaks when a session ends.

-   **`ws-jwt.guard.ts`**:
    -   **Purpose**: A custom guard to secure the WebSocket gateway.
    -   **Logic**: Unlike the HTTP `JwtStrategy`, this guard is designed for the WebSocket protocol. It runs when a client first tries to connect and for every subsequent message. It extracts the JWT from `client.handshake.auth.token`, verifies it using `JwtService`, and attaches the user payload (`{ id, username, role }`) directly to the `socket` object for use in the gateway. If the token is missing or invalid, it throws a `WsException`, terminating the connection.

-   **DTOs (`dto/*.ts`)**:
    -   Define the expected payload shapes for each WebSocket event (e.g., `CodeUpdateDto`, `JoinSessionDto`, `PermissionDto`). This provides type safety and validation within the gateway.

---

## Authentication & Authorization

Security is handled via JWT and a role-based system.

### JWT Flow

1.  **Registration (`POST /auth/register`):** A user provides a username and password. The password is encrypted using `bcrypt` in `AuthService` before being stored in the database.
2.  **Login (`POST /auth/login`):** A user submits their credentials. `AuthService.validateUser` compares the provided password with the stored hash.
3.  **Token Issuance:** Upon successful validation, `AuthService.login` creates a JWT containing the user's ID, username, and role. This token is signed with the `JWT_SECRET` and has a default expiration of 1 day.
4.  **Authenticated Requests:** The client sends the JWT in the `Authorization` header (`Bearer <token>`).
5.  **Token Validation:** The `JwtStrategy` automatically intercepts requests to protected endpoints. It validates the token's signature and expiration. If valid, it fetches the corresponding user from the database and attaches the user object to the request for downstream use.

### Role-Based Access Control (RBAC)

-   **Roles:** The `UserRole` enum (`users/entities/user.entity.ts`) defines two roles: `ADMIN` and `USER`.
-   **Guards & Decorators:**
    -   `@UseGuards(JwtAuthGuard)`: The primary guard that protects an endpoint, ensuring a valid JWT is present.
    -   `@Roles(UserRole.ADMIN, ...)`: A decorator to specify which roles are allowed to access an endpoint.
    -   `@UseGuards(RolesGuard)`: A guard that works with `@Roles` to check if the authenticated user's role matches the required roles for the endpoint.

This combination allows for fine-grained control over endpoint access. For example, deleting a user is restricted to Admins.

---

## Database

### Entities

-   **`User` (`users/entities/user.entity.ts`):**
    -   Stores user information: `id`, `username`, hashed `password`, and `role`.
    -   The `password` and `role` fields are marked with `@Exclude()` to prevent them from being sent in API responses, enforced by the global `ClassSerializerInterceptor`.
    -   Has a one-to-many relationship with `Snippet` (a user can have many snippets).

-   **`Snippet` (`snippets/entities/snippet.entity.ts`):**
    -   The central entity. Stores `id` (a URL-friendly NanoID), `title`, `content`, `language`, and `visibility` (`PUBLIC` or `PRIVATE`).
    -   Has a many-to-one relationship with `User` (the author).
    -   Has a many-to-many relationship with `Tag` and `User` (for likes).

-   **`Tag` (`tags/entities/tag.entity.ts`):**
    -   Stores a unique, lowercase tag `name`.
    -   Has a many-to-many relationship with `Snippet`.

---

## API Endpoints

All endpoints are prefixed with `/api`. For a detailed breakdown of the `AuthModule`, see the [AuthModule Datasheet](#authmodule-datasheet).

### `/auth`
-   **`POST /register`**
    -   **Description**: Registers a new user.
    -   **Body**: `RegisterDto` (`{ "username": "string", "password": "string(min:8)" }`)
    -   **Response**: The created `User` object (with password excluded).

-   **`POST /login`**
    -   **Description**: Logs in a user and returns a JWT.
    -   **Body**: `LoginDto` (`{ "username": "string", "password": "string" }`)
    -   **Response**: `{ "accessToken": "string", "user": { ... } }`.

### `/users`
-   **`GET /`**
    -   **Description**: Retrieves a list of all users.
    -   **Auth**: `ADMIN` only.

-   **`GET /:id`**
    -   **Description**: Retrieves a single user by ID.
    -   **Auth**: Any authenticated user.

-   **`DELETE /:id`**
    -   **Description**: Deletes a user.
    -   **Auth**: `ADMIN` (can delete anyone) or a `USER` deleting their own account.

### `/snippets`
-   **`POST /`**
    -   **Description**: Creates a new snippet.
    -   **Auth**: `USER` or `ADMIN`.

-   **`GET /`**
    -   **Description**: Retrieves all public snippets. If authenticated, also includes the user's own private snippets. Admins see all snippets.
    -   **Auth**: Optional.

-   **`GET /:id`**
    -   **Description**: Retrieves a single snippet.
    -   **Auth**: Optional. If the snippet is `PRIVATE`, access is restricted to the author or an `ADMIN`.

-   **`PATCH /:id`**
    -   **Description**: Updates a snippet.
    -   **Auth**: Author or `ADMIN`.

-   **`DELETE /:id`**
    -   **Description**: Deletes a snippet.
    -   **Auth**: Author or `ADMIN`.

-   **`POST /:id/like`**
    -   **Description**: Toggles a "like" on a snippet for the authenticated user.
    -   **Auth**: `USER` or `ADMIN`.

### `/tags`
-   **`POST /`**
    -   **Description**: Creates a new tag. If the tag (case-insensitive) already exists, it returns the existing one.
    -   **Auth**: `USER` or `ADMIN`.

-   **`GET /`**
    -   **Description**: Retrieves all tags, sorted alphabetically.
    -   **Auth**: Public.

-   **`DELETE /:id`**
    -   **Description**: Deletes a tag.
    -   **Auth**: `ADMIN` only.

---

## Real-Time Collaboration (WebSockets)

The `LiveModule` handles real-time editing sessions. For a detailed breakdown, see the [LiveModule Datasheet](#livemodule-datasheet).

### Connection
-   A client connects to the WebSocket server with a valid JWT in the `handshake.auth.token` property.
-   The `WsJwtGuard` validates the token and attaches the user to the socket.

### Events
-   Clients `join-session`, `leave-session`, send `code-update`, `language-update`, and `save-snippet` events.
-   The server broadcasts `session-details`, `participants-update`, `code-updated`, and `permissions-update` to keep all clients in a room synchronized.

---

## Testing

The project has a robust testing suite using Jest.

### Unit Tests (`*.spec.ts`)
-   Located alongside the files they test (e.g., `snippets.service.spec.ts`).
-   They test individual classes (services, controllers) in isolation.
-   Dependencies are mocked using Jest's mocking capabilities and NestJS's testing utilities (`Test.createTestingModule`).
-   **Example**: `SnippetsService.spec.ts` includes tests to ensure that a `hacker` cannot view or edit a private snippet owned by someone else, while an `admin` or the `owner` can.

### End-to-End (E2E) Tests (`test/app.e2e-spec.ts`)
-   Test the application as a whole by making real HTTP requests to the running server.
-   The E2E test suite defines a "Complete Security Matrix" that simulates three user roles: an **Admin**, an **Owner**, and a **Hacker**.
-   It tests the entire lifecycle of an API interaction:
    1.  Registers and logs in all three users to get their tokens.
    2.  Tests the `Tags` endpoints to ensure correct permissions for creation and deletion.
    3.  Tests the `Snippets` endpoints, creating a private snippet as the `Owner` and verifying that the `Hacker` is blocked while the `Admin` and `Owner` have access.
    4.  Tests the `Users` endpoints to confirm that only an `Admin` can view all users.
    5.  Finally, it cleans up by deleting the created resources.

This E2E test provides high confidence that the application's security model works as expected across all layers.
