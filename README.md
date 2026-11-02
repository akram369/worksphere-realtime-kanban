# WorkSphere: Enterprise Collaborative Kanban Board
### Multi-Organization + Multi-Tenant SaaS Architecture on Neon Cloud PostgreSQL with Strict Data Isolation & Live Synchronization

**WorkSphere** is an enterprise-grade SaaS project management application inspired by Linear and Asana. It provides real-time collaboration with **pure light-mode enterprise styling**, **multi-organization hierarchy**, **tenant/branch data isolation**, **Role-Based Access Control (RBAC)**, **Optimistic Concurrency Control (OCC)**, **fractional drag-and-drop indexing**, and a **slide-over task details drawer**.

---

## Live System URLs & Services

| Service | Address | Notes |
| :--- | :--- | :--- |
| **Web Application (Vite + React)** | **[http://localhost:3000](http://localhost:3000)** | Pure Light Mode Enterprise SaaS UI |
| **Backend REST API** | **`http://localhost:4000/api`** | JWT Authenticated & Tenant Scoped |
| **WebSocket & Socket.IO** | **`ws://localhost:4000/ws` & Socket.IO** | Authenticated Handshake + Tenant Rooms |
| **Database Engine** | **Neon Cloud PostgreSQL (AWS Singapore)** | Managed Cluster with PgBouncer Pooling |
| **Automated Test Suite** | **`npm test` (or `node server/tests/run-all-tests.js`)** | **11/11 Tests Passed (100%)** |

---

## 1. Enterprise Light Mode Design System

Designed specifically to avoid generic dark/neon templates:
- **Theme**: Pure **Light Mode ONLY**.
- **Color Palette**:
  - Primary Background: `#FFFFFF` and soft off-white `#F8FAFC`.
  - Sidebar: Light grey `#F8FAFC` with subtle border `#E2E8F0`.
  - Typography: Dark charcoal `#0F172A`, `#1E293B`, `#475569`.
  - Primary Brand Accent: Professional Blue (`#2563EB`, hover: `#1D4ED8`).
  - Status Indicators: Muted Green (`#059669`), Amber (`#D97706`), Red (`#DC2626`), Slate (`#475569`).
  - Corner Radii: Clean 8px to 12px corners.
  - Zero glassmorphism, zero neon colors, zero excessive animations.

---

## 2. Complete 12-Page Enterprise Architecture

The application implements a functional routing shell with a fixed, collapsible left sidebar and top navbar:

| Page | Route | Description & Features |
| :--- | :--- | :--- |
| **Page 1: Login** | `/login` | Enterprise sign-in with WorkSphere logo, bcrypt verification, JWT token issuance, and **1-click Fast Demo sign-in** for Rahul, Priya, and Arjun. |
| **Page 2: Registration** | `/register` | New account onboarding with validation, bcrypt password hashing, and branch assignment. |
| **Page 3: Overview Dashboard** | `/` or `/overview` | Greets user ("Good morning, Rahul"), 5 KPI metric cards (Total Projects, Total Tasks, In Progress, Completed, Overdue Tasks), My Assigned Tasks table, and Project Progress bars. |
| **Page 4: My Tasks** | `/my-tasks` | Work items table with tabs (*All Tasks*, *Assigned to Me*, *To Do*, *In Progress*, *Completed*, *Overdue*), keyword search, priority filter, and sorting. Row clicks open the Task Drawer. |
| **Page 5: Projects / Kanban** | `/projects` | Multi-column Kanban board (**TO DO**, **IN PROGRESS**, **TESTING**, **DONE**) with drag-and-drop, priority chips, tags, assignee avatars, OCC version badges, and project selector. |
| **Page 6: Task Details Drawer** | Slide-over | Right-side drawer opening on card click without leaving the page. Includes title, description, status, priority, assignee, due date, labels, and task-specific audit history. |
| **Page 7: Activity History** | `/activity` | Chronological activity feed from `activity_logs` with filters (*All*, *Creation*, *Movements*, *Updates*, *Deletions*). |
| **Page 8: Team Members** | `/team` | Personnel table with member names, emails, roles, branch assignments, active tasks, and an **Invite Team Member** modal. |
| **Page 9: Organization Management** | `/organizations` | Enterprise entity governance listing parent organizations, branch counts, total users, and a **Create Organization** modal. |
| **Page 10: Branch / Tenant Management** | `/branches` | Multi-branch directory (*Hyderabad*, *Bangalore*, *Chennai*, *Singapore Hub*) showing projects, personnel count, and tenant switching controls. |
| **Page 11: System Settings** | `/settings` | Tabbed settings (*My Profile*, *Account Settings*, *Notification Preferences*, *Workspace Settings*, *Security & 2FA*). |
| **Page 12: Help & Support** | `/help` | Keyboard shortcuts reference (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+K`), system diagnostics, and architecture FAQ. |

---

## 3. Demonstration Data Structure

- **Organizations**:
  - `ABC Technologies` (`org-abc-tech`)
  - `Global Enterprise Corp` (`org-global-corp`)
- **Branches / Tenants**:
  - `Hyderabad` (`tenant-hyderabad`) — Active workspace
  - `Bangalore` (`tenant-bangalore`)
  - `Chennai` (`tenant-chennai`)
  - `Singapore Hub` (`tenant-singapore`) — Isolated external tenant (Global Enterprise Corp)
- **Personnel & Roles (Default Password: `Password123!`)**:
  - **Rahul Sharma** — `ORG_ADMIN` (`rahul@abctech.com`)
  - **Priya Patel** — `TENANT_ADMIN` for Hyderabad (`priya@abctech.com`)
  - **Sneha Rao** — `TENANT_ADMIN` for Bangalore (`sneha@abctech.com`)
  - **Arjun Verma** — `MEMBER` for Hyderabad & Bangalore (`arjun@abctech.com`)
  - **David Kim** — `ORG_ADMIN` for Global Enterprise (`david@globalcorp.com`)
- **Projects**:
  - `Website Development` (Hyderabad)
  - `Mobile App Development` (Hyderabad)
  - `AI Automation` (Hyderabad)
  - `CRM Development` (Bangalore)
  - `Cloud Migration` (Bangalore)
  - `Security & Compliance` (Chennai)
  - `APAC Regional Expansion` (Singapore Hub)

---

## 4. Technical Architecture & Security Isolation

### Strict Multi-Tenant & Multi-Org Scoping
- **Cryptographic JWT Authentication**: Client receives a signed JWT containing `{ userId, email, name }`. Spurious or manipulated header identities (`x-user-id`) are ignored; caller identity is cryptographically validated on every request.
- **Tenant Context Middleware**: Every protected REST and WebSocket interaction checks the user's active memberships in PostgreSQL. An `ORG_ADMIN` possesses administrative scope across that organization's branches, while a `TENANT_ADMIN` or `MEMBER` is strictly restricted to assigned branches.
- **Cross-Tenant Access Rejection**: Attempting to query or mutate a record belonging to another tenant or another organization immediately returns `HTTP 403 Forbidden`.
- **Tenant-Scoped Database Queries**: All queries on `boards`, `columns`, `tasks`, and `activity_logs` are unconditionally scoped with `where: { tenant_id: req.tenantId }`.

### Optimistic Concurrency Control (OCC)
- Every task maintains an integer `version` counter.
- On edit or move, the frontend supplies the expected version.
- If another collaborator commits an edit first, the backend detects the mid-air collision and returns `HTTP 409 Conflict` along with the latest server state.
- The UI displays an interactive side-by-side conflict resolution modal (*Accept Server Version*, *Compare Changes*, *Merge Non-Conflicting Changes*).

### Real-time Collaboration (Socket.IO & WebSockets)
- Authenticated handshake validates JWT token before connection is established.
- Sockets join tenant rooms (`tenant:{tenantId}`) and board rooms (`tenant:{tenantId}:board:{boardId}`).
- Only committed database transactions broadcast events (`TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_DELETED`, `PRESENCE_STATE`).
- Events never leak across tenant boundaries.

---

## 5. Automated Test Suite Results

Execute the automated end-to-end integration test suite:
```powershell
node server/tests/run-all-tests.js
```

### Verified Test Matrix (11/11 Passed - 100%):
1. **[TEST 1] JWT Authentication**: Login with valid bcrypt password issues cryptographic JWT token (HTTP 200).
2. **[TEST 2] JWT Authentication**: Insecure / unauthenticated request rejected with HTTP 401 Unauthorized.
3. **[TEST 3] Cross-Tenant Data Leakage**: Arjun (Hyderabad/Bangalore) cannot access Singapore Hub Board (HTTP 403 Forbidden).
4. **[TEST 4] Cross-Tenant Task Tampering**: Arjun cannot modify tasks in Singapore Hub (HTTP 403 Forbidden).
5. **[TEST 5] Cross-Organization Boundary**: Rahul (ABC Tech Org Admin) cannot access Global Enterprise Singapore Tenant (HTTP 403 Forbidden).
6. **[TEST 6] Optimistic Concurrency Control**: Concurrent update triggers HTTP 409 Conflict with server diff.
7. **[TEST 7] Fractional Indexing**: Reordering task between 1000.0 and 2000.0 yields 1500.0 without re-indexing all items.
8. **[TEST 8] RBAC Guard**: Regular Member (Arjun) cannot delete a column (HTTP 403 Forbidden).
9. **[TEST 9] RBAC Guard**: Tenant Admin (Priya) CAN create a new column (HTTP 201 Created).
10. **[TEST 10] WebSocket Isolation**: Client receives events only for subscribed tenant with verified JWT.
11. **[TEST 11] WebSocket Security**: Unauthorized tenant subscription rejected with `AUTH_FAILED`.
