# WorkSphere REST API & Realtime WebSocket Specification

---

## 1. Authentication & Security Headers

All protected endpoints require:
```http
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-id>
```

---

## 2. Authentication Endpoints

### `POST /api/users/login`
- **Body**: `{ "email": "rahul@abctech.com", "password": "Password123!" }`
- **Response**: `{ "user": { ... }, "memberships": [ ... ], "token": "ey..." }`

### `POST /api/users/register`
- **Body**: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "Password123!" }`
- **Response**: `{ "user": { ... }, "memberships": [ ... ], "token": "ey..." }`

### `GET /api/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Current user profile and authorized memberships.

---

## 3. Multi-Tenant Scoped Endpoints

### Organizations
- `GET /api/organizations`: List organizations with branch counts.
- `POST /api/organizations`: Create organization.
- `PUT /api/organizations/:orgId`: Update organization.
- `DELETE /api/organizations/:orgId`: Delete organization.

### Branches / Tenants
- `GET /api/organizations/:orgId/tenants`: List branches.
- `POST /api/organizations/:orgId/tenants`: Create branch.
- `GET /api/tenants/:tenantId`: Get branch details and members.

### Boards & Columns
- `GET /api/boards`: List boards in active tenant.
- `GET /api/boards/:boardId`: Get board hierarchy with columns and tasks.
- `POST /api/boards`: Create board.
- `POST /api/columns`: Create column (Tenant Admin / Org Admin).
- `PUT /api/columns/:columnId`: Update column title.
- `DELETE /api/columns/:columnId`: Delete column.

### Tasks & Concurrency Control
- `GET /api/tasks/overview-stats`: Metrics for overview dashboard.
- `GET /api/tasks/my-tasks`: Filtered list of tasks.
- `POST /api/tasks`: Create task.
- `PUT /api/tasks/:taskId`:
  - **Body**: `{ "expectedVersion": 1, "title": "Updated Title", ... }`
  - **Status 200**: Successfully committed update; version incremented.
  - **Status 409 Conflict**: Returned when mid-air collision occurs.
- `POST /api/tasks/:taskId/move`:
  - **Body**: `{ "targetColumnId": "col-id", "prevPos": 1000.0, "nextPos": 2000.0, "expectedVersion": 1 }`
- `DELETE /api/tasks/:taskId`: Delete task.

### Activity Logs
- `GET /api/activity-logs?limit=50`: Get recent audit history for tenant.

---

## 4. Real-Time WebSocket & Socket.IO Events

### Connection Handshake
```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'jwt-token' }
});
```

### Subscribing to Tenant
```javascript
socket.emit('SUBSCRIBE', {
  tenantId: 'tenant-hyderabad',
  boardId: 'board-web-dev'
});
```

### Incoming Events
- `PRESENCE_STATE`: List of online collaborators and active editing tasks.
- `TASK_CREATED`: Committed task creation payload.
- `TASK_UPDATED`: Committed task update payload.
- `TASK_MOVED`: Committed task movement payload.
- `TASK_DELETED`: Deleted task identifier.
- `ACTIVITY_LOGGED`: New audit trail entry.
