# Configuration

You **must** create a `.env` file in the `server/` directory for the application to work.
```toml
DB_HOST=db 
DB_PORT=5432 
DB_USER=adminkhet 
DB_PASSWORD=khetgamerthailand 
DB_NAME=nestbin 

JWT_SECRET=super_secret_key_change_this
```
(Note: If running locally without Docker, change `DB_HOST` to `localhost`)

---
## How to Run

Make sure you have Docker Desktop/CLI installed. Run the following command in the **root directory** of the project:
`$ docker compose up`

This will start both the Backend (API) and the Frontend (React), along with the PostgreSQL database.

- **API URL:** `http://localhost:3000`
- **Frontend URL:** `http://localhost:5173`

## Default Admin Account

On the first run, the system automatically seeds a default administrator account:

- **Username:** `khetadmin`
- **Password:** `adminkhet123`

---

# Project Information

## Tech Stack

### **Frontend (Client)**
- **Framework:** React (Vite)
- **Language:** TypeScript
- **UI Library:** Ant Design (v5)
- **Routing:** React Router DOM
- **Highlighter:** React Syntax Highlighter

### **Backend (Server)**
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Security:** Passport.js (JWT), BCrypt, RBAC
- **Testing:** Jest (Unit & E2E)

## Project Structure
```
nest-bin-project/
├── frontend/            # React Frontend Application
├── backend/             # NestJS Backend API
├── docker-compose.yml   # Orchestration for App + DB
└── README.md            # This file
```

## Backend Architecture & Security

The backend is designed with a **"Security First"** architecture featuring strict Role-Based Access Control (RBAC).

### Key Security Features

1. **RBAC (Role-Based Access Control):**
    - **Guests:** Read-only access to public snippets.
    - **Users:** Manage their own data (CRUD) and like snippets.
    - **Admins:** Full access to view all users and moderate (delete) any content.
    
2. **Ownership Verification:**
    - Service layer explicitly checks `snippet.authorId === user.id` before allowing updates or deletes.
    
3. **Database Integrity:**
    - `onDelete: 'CASCADE'` is configured on the User $\leftrightarrow$ Snippet relationship. This ensures that deleting a user automatically cleans up their snippets, preventing orphaned data.
    
4. **Guards & Decorators:**
    - `JwtAuthGuard`: Validates tokens on protected routes.
    - `RolesGuard`: Enforces `@Roles('ADMIN')` on sensitive endpoints.
      
---
## Testing Strategy

###  Test Actors
- **Guest:** Unauthenticated user.
- **Hacker:** Authenticated user trying to access data they _don't_ own.
- **Owner:** The creator of the resource.
- **Admin:** Superuser with moderation privileges. (Logged in to an existing user; Cannot be created)

### 1. End-to-End (E2E) Tests

The E2E suite spins up the full application and database to simulate real-world usage.
- **Authentication Flow:** Register $\rightarrow$ Login $\rightarrow$ Access Token.
- **RBAC Enforcement:** Verifies that Hackers get `403 Forbidden` while Owners get `200 OK`.
- **Database Constraints:** Verifies Foreign Key integrity and cascading deletes.

### 2. Unit Tests
Isolated tests for Services using **Mock Repositories**.
- **Logic Testing:** Tag normalization (case-insensitivity), Admin overrides, and State changes (Toggling Likes).

---
## API Reference

### Auth

| **Method** | **Endpoint**         | **Description** | **Access** |
| ---------- | -------------------- | --------------- | ---------- |
| `POST`     | `/api/auth/register` | Create account  | Public     |
| `POST`     | `/api/auth/login`    | Get JWT Token   | Public     |

### Snippets

| **Method** | **Endpoint**             | **Description**      | **Access**             |
| ---------- | ------------------------ | -------------------- | ---------------------- |
| `GET`      | `/api/snippets`          | List public snippets | Public                 |
| `POST`     | `/api/snippets`          | Create snippet       | User                   |
| `GET`      | `/api/snippets/:id`      | View snippet         | Public / Owner / Admin |
| `PATCH`    | `/api/snippets/:id`      | Update snippet       | Owner / Admin          |
| `DELETE`   | `/api/snippets/:id`      | Delete snippet       | Owner / Admin          |
| `POST`     | `/api/snippets/:id/like` | Toggle Like          | User                   |

### Tags

| **Method** | **Endpoint**    | **Description** | **Access**     |
| ---------- | --------------- | --------------- | -------------- |
| `GET`      | `/api/tags`     | List all tags   | Public         |
| `POST`     | `/api/tags`     | Create tag      | User           |
| `GET`      | `/api/tags/:id` | List tag        | Public         |
| `DELETE`   | `/api/tags/:id` | Delete tag      | **Admin Only** |
| `PATCH`    | `/api/tags/:id` | Update tag      | Owner / Admin  |

### Users

| **Method** | **Endpoint**     | **Description** | **Access**     |
| ---------- | ---------------- | --------------- | -------------- |
| `GET`      | `/api/users`     | List all users  | **Admin Only** |
| `DELETE`   | `/api/users/:id` | Delete User     | Self / Admin   |

## Test Results
``` bash
AppController (e2e) - Complete Security Matrix
    1. Auth: Register & Login (All Roles)
      ✓ POST /auth/register - Create Admin, Owner, Hacker (145 ms)
      ✓ POST /auth/login - Get Tokens (164 ms)
    2. Tags Endpoints
      ✓ POST /tags - Guest blocked (401) (4 ms)
      ✓ POST /tags - Owner Creates Tag (201) (12 ms)
      ✓ GET /tags - Public Access (200) (4 ms)
      ✓ GET /tags/:id - Public Access (200) (6 ms)
      ✓ PATCH /tags/:id - Guest blocked (401) (4 ms)
      ✓ PATCH /tags/:id - Owner Updates (200) (9 ms)
      ✓ DELETE /tags/:id - Guest blocked (401) (3 ms)
      ✓ DELETE /tags/:id - Hacker blocked (403) (2 ms)
      ✓ DELETE /tags/:id - Owner blocked (403) (19 ms)
      ✓ DELETE /tags/:id - Admin Success (200) (6 ms)
    3. Snippets Endpoints
      ✓ POST /snippets - Guest blocked (401) (3 ms)
      ✓ POST /snippets - Owner Creates Private Snippet (201) (13 ms)
      ✓ GET /snippets - Public Access (200) (14 ms)
      ✓ GET /snippets/:id - Hacker blocked (403) (13 ms)
      ✓ GET /snippets/:id - Owner Success (200) (10 ms)
      ✓ PATCH /snippets/:id - Hacker blocked (403) (9 ms)
      ✓ PATCH /snippets/:id - Owner Success (200) (15 ms)
      ✓ POST /snippets/:id/like - Guest blocked (401) (5 ms)
      ✓ POST /snippets/:id/like - Owner Likes (201) (29 ms)
      ✓ DELETE /snippets/:id - Hacker blocked (403) (16 ms)
      ✓ DELETE /snippets/:id - Admin Success (200) (28 ms)
    4. Users Endpoints
      ✓ GET /users - Guest blocked (401) (4 ms)
      ✓ GET /users - Hacker blocked (403) (6 ms)
      ✓ GET /users - Owner blocked (403) (7 ms)
      ✓ GET /users - Admin Success (200) (8 ms)
      ✓ GET /users/:id - Owner views self (200) (9 ms)
      ✓ DELETE /users/:id - Hacker blocked from deleting Owner (403) (9 ms)
      ✓ DELETE /users/:id - Owner Self-Delete (200) (13 ms)
      ✓ DELETE /users/:id - Admin deletes Hacker (200) (22 ms)

Test Suites: 1 passed, 1 total
Tests:       31 passed, 31 total
Snapshots:   0 total
Time:        2.162 s, estimated 9 s
Ran all test suites.
```
---
### Created By

***Jirakorn Sukmee 6810110042***
- Department of Computer Engineering, **Faculty of Engineering**, Prince of Songkla University

***Manattee Vilairat 6810110275***
- Department of Computer Engineering, **Faculty of Engineering**, Prince of Songkla University