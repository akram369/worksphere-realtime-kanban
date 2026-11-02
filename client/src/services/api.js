// WorkSphere Centralized API Client with JWT Authentication & Tenant Scoping

let authToken = localStorage.getItem('worksphere_token') || null;
let currentTenantId = localStorage.getItem('worksphere_tenant_id') || 'tenant-hyderabad';

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('worksphere_token', token);
  } else {
    localStorage.removeItem('worksphere_token');
  }
}

export function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem('worksphere_token');
  }
  return authToken;
}

export function setTenantContext(tenantId) {
  if (tenantId) {
    currentTenantId = tenantId;
    localStorage.setItem('worksphere_tenant_id', tenantId);
  }
}

export function getTenantContext() {
  return currentTenantId;
}

// Deprecated alias for backwards compatibility
export function setApiContext(userId, tenantId) {
  if (tenantId) setTenantContext(tenantId);
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(currentTenantId ? { 'x-tenant-id': currentTenantId } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, config);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || `HTTP ${res.status}: ${res.statusText}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication
  login: async (email, password) => {
    const data = await apiRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data?.token) {
      setAuthToken(data.token);
    }
    return data;
  },
  register: async (name, email, password) => {
    const data = await apiRequest('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (data?.token) {
      setAuthToken(data.token);
    }
    return data;
  },
  getMe: () => apiRequest('/api/users/me'),
  logout: () => {
    setAuthToken(null);
  },

  // Organizations
  getOrganizations: () => apiRequest('/api/organizations'),
  createOrganization: (body) => apiRequest('/api/organizations', { method: 'POST', body: JSON.stringify(body) }),
  updateOrganization: (orgId, body) => apiRequest(`/api/organizations/${orgId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOrganization: (orgId) => apiRequest(`/api/organizations/${orgId}`, { method: 'DELETE' }),

  // Tenants / Branches
  getTenants: (orgId) => apiRequest(`/api/organizations/${orgId}/tenants`),
  createTenant: (orgId, body) => apiRequest(`/api/organizations/${orgId}/tenants`, { method: 'POST', body: JSON.stringify(body) }),
  updateTenant: (orgId, tenantId, body) => apiRequest(`/api/organizations/${orgId}/tenants/${tenantId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTenant: (orgId, tenantId) => apiRequest(`/api/organizations/${orgId}/tenants/${tenantId}`, { method: 'DELETE' }),
  getTenantDetails: (tenantId) => apiRequest(`/api/tenants/${tenantId}`),

  // Users & Team Management
  getUsers: () => apiRequest('/api/users'),
  inviteUser: (body) => apiRequest('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUserMembership: (userId, body) => apiRequest(`/api/users/${userId}/membership`, { method: 'PUT', body: JSON.stringify(body) }),
  removeUser: (userId) => apiRequest(`/api/users/${userId}`, { method: 'DELETE' }),

  // Boards / Projects
  getBoards: () => apiRequest('/api/boards'),
  getBoard: (boardId) => apiRequest(`/api/boards/${boardId}`),
  createBoard: (body) => apiRequest('/api/boards', { method: 'POST', body: JSON.stringify(body) }),

  // Columns
  createColumn: (body) => apiRequest('/api/columns', { method: 'POST', body: JSON.stringify(body) }),
  updateColumn: (columnId, body) => apiRequest(`/api/columns/${columnId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteColumn: (columnId) => apiRequest(`/api/columns/${columnId}`, { method: 'DELETE' }),

  // Tasks
  getOverviewStats: () => apiRequest('/api/tasks/overview-stats'),
  getMyTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/tasks/my-tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (body) => apiRequest('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskId, body) => apiRequest(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) }),
  moveTask: (taskId, body) => apiRequest(`/api/tasks/${taskId}/move`, { method: 'POST', body: JSON.stringify(body) }),
  deleteTask: (taskId) => apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' }),

  // Activity Logs
  getActivityLogs: (limit = 50) => apiRequest(`/api/activity-logs?limit=${limit}`),

  // Test Scenarios
  simulateConflict: (taskId) => apiRequest('/api/test-scenarios/simulate-conflict', { method: 'POST', body: JSON.stringify({ taskId }) }),
  verifyCrossTenantIsolation: () => apiRequest('/api/test-scenarios/verify-cross-tenant-isolation'),
  resetSeed: () => apiRequest('/api/test-scenarios/reset-seed', { method: 'POST' })
};
