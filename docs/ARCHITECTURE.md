# WorkSphere System Architecture

WorkSphere is an enterprise-grade collaborative Kanban board with strict multi-organization and multi-tenant scoping, hosted on **Neon Cloud PostgreSQL in AWS Singapore**.

---

## 1. Architectural Layers

### Frontend Layer (React 19 + Vite)
- **Styling**: Pure Light Theme ONLY (`#FFFFFF`, `#F8FAFC`, `#E2E8F0`, `#0F172A`, `#2563EB`).
- **Drag-and-Drop**: Built using `@dnd-kit/core` and `@dnd-kit/sortable` with fractional index position calculations.
- **State Management**: Centralized `AppContext` coordinating organizations, tenants, boards, tasks, presence, and live Socket.IO events.
- **Routing**: React Router 7 supporting 12 full enterprise pages:
  1. `/login`
  2. `/register`
  3. `/overview`
  4. `/my-tasks`
  5. `/projects`
  6. Task Details Drawer (Global Slide-over)
  7. `/activity`
  8. `/team`
  9. `/organizations`
  10. `/branches`
  11. `/settings`
  12. `/help`

### Security & Authentication Layer
- **Cryptographic JWT Tokens**: Tokens signed using `JWT_SECRET` with 7-day expiration.
- **Password Protection**: Salted Bcrypt hashing (`bcryptjs`) for all stored user passwords.
- **Token Verification**: Every protected REST route validates Bearer tokens.
- **Unverified Identity Protection**: User IDs and Tenant IDs supplied by client bodies or headers are never trusted blindly without database authorization lookup.

### Tenancy & RBAC Layer
- **Organization Hierarchy**: `Organization -> Tenants (Branches) -> Boards -> Columns -> Tasks`.
- **RBAC Roles**:
  - `ORG_ADMIN`: Organization-wide administrator with access across all branches of that organization.
  - `TENANT_ADMIN`: Branch administrator with column creation/deletion and user invite permissions.
  - `MEMBER`: Regular collaborator with task movement, creation, and editing permissions.
- **Cross-Tenant Boundary Protection**: Attempting to read or mutate records in an unauthorized branch yields `HTTP 403 Forbidden`.

### Persistence Layer
- **Database Engine**: Neon Cloud PostgreSQL (AWS Singapore, `ap-southeast-1`).
- **Connection Model**:
  - `DATABASE_URL`: Pooled connection via Neon PgBouncer for REST and Socket.IO API throughput.
  - `DIRECT_URL`: Direct database connection for schema migrations and advisory lock execution.
- **ORM**: Prisma ORM v6.4.1.

### Real-Time Layer (Socket.IO + WebSockets)
- **Authentication**: JWT token validated during socket handshake.
- **Room Isolation**: Scoped rooms (`tenant:{tenantId}` and `tenant:{tenantId}:board:{boardId}`).
- **Committed Changes Only**: Events are emitted only after database transaction commits.
