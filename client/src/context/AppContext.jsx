import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api, setAuthToken, getAuthToken, setTenantContext } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Authentication & Session
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('ORG_ADMIN');

  // Multi-Organization & Multi-Tenant Hierarchy
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);

  // Boards & Projects
  const [boards, setBoards] = useState([]);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [boardData, setBoardData] = useState(null);

  // Layout UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDrawerTask, setActiveDrawerTask] = useState(null); // Right-side task detail drawer
  const [activeConflict, setActiveConflict] = useState(null); // OCC 409 Conflict Dialog
  const [isEdgeCaseModalOpen, setIsEdgeCaseModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskColumnId, setCreateTaskColumnId] = useState(null);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Real-Time & Presence
  const [wsStatus, setWsStatus] = useState('DISCONNECTED');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Undo / Redo History Stack
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const socketRef = useRef(null);

  const addToast = useCallback((message, type = 'info', action = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const pushUndoAction = useCallback((action) => {
    setUndoStack(prev => [...prev.slice(-20), action]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    try {
      await action.undo();
      setRedoStack(prev => [...prev, action]);
      addToast(`Undone: ${action.description}`, 'info');
    } catch (err) {
      addToast(`Failed to undo: ${err.message}`, 'conflict');
    }
  }, [undoStack, addToast]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    try {
      await action.redo();
      setUndoStack(prev => [...prev, action]);
      addToast(`Redone: ${action.description}`, 'info');
    } catch (err) {
      addToast(`Failed to redo: ${err.message}`, 'conflict');
    }
  }, [redoStack, addToast]);

  // Global Undo/Redo hotkeys
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Initial Data Bootstrap with Verified JWT Authentication
  const loadInitialData = useCallback(async () => {
    try {
      let token = getAuthToken();

      // If no token exists, log in as Rahul Sharma (Org Admin) to obtain initial cryptographic JWT
      if (!token) {
        try {
          const loginData = await api.login('rahul@abctech.com', 'Password123!');
          token = loginData.token;
          setCurrentUser(loginData.user);
        } catch (e) {
          console.warn('Initial login attempt:', e.message);
        }
      }

      const [orgs, users] = await Promise.all([
        api.getOrganizations(),
        api.getUsers()
      ]);

      setOrganizations(orgs);
      setAllUsers(users);

      // Resolve current user
      if (!currentUser) {
        const defaultUser = users.find(u => u.id === 'user-rahul') || users[0];
        setCurrentUser(defaultUser);
      }

      // Default to ABC Technologies
      const defaultOrg = orgs.find(o => o.slug === 'abc-tech') || orgs[0];
      setCurrentOrg(defaultOrg);

      if (defaultOrg) {
        const tenantList = await api.getTenants(defaultOrg.id);
        setTenants(tenantList);
        const hyd = tenantList.find(t => t.slug === 'hyderabad') || tenantList[0];
        setCurrentTenant(hyd);
        if (hyd) setTenantContext(hyd.id);
      }
    } catch (err) {
      console.error('Data bootstrap error:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Update API context and load Tenant data when tenant or user changes
  useEffect(() => {
    if (!currentTenant || !currentUser) return;

    setTenantContext(currentTenant.id);

    // Fetch tenant details for role verification
    api.getTenantDetails(currentTenant.id)
      .then(res => {
        setUserRole(res.currentRole || 'MEMBER');
      })
      .catch(err => {
        console.warn('Tenant details error:', err.message);
      });

    // Load boards for tenant
    api.getBoards()
      .then(boardList => {
        setBoards(boardList);
        if (boardList.length > 0) {
          setCurrentBoard(boardList[0]);
        } else {
          setCurrentBoard(null);
          setBoardData(null);
        }
      })
      .catch(err => {
        console.error('Failed to load boards for tenant:', err);
      });

    // Load initial activity logs
    api.getActivityLogs()
      .then(logs => setActivityLogs(logs))
      .catch(() => {});
  }, [currentTenant?.id, currentUser?.id]);

  // Refresh Board Data
  const refreshBoardData = useCallback(async () => {
    if (!currentBoard || !currentTenant) return;
    try {
      const data = await api.getBoard(currentBoard.id);
      setBoardData(data);
    } catch (err) {
      if (err.status === 403) {
        addToast('Access Denied: You do not have permissions for this board', 'conflict');
      }
    }
  }, [currentBoard?.id, currentTenant?.id, addToast]);

  useEffect(() => {
    refreshBoardData();
  }, [refreshBoardData]);

  // Real-time Event Handler
  const handleRealtimeMessage = useCallback((msg) => {
    const type = msg.type || msg.action;
    const payload = msg.payload !== undefined ? msg.payload : msg;

    switch (type) {
      case 'PRESENCE_STATE':
        setOnlineUsers(payload.users || []);
        break;

      case 'TASK_CREATED':
        setBoardData(prev => {
          if (!prev) return prev;
          const col = prev.columns.find(c => c.id === payload.column_id);
          if (col && col.tasks.some(t => t.id === payload.id)) return prev;
          return {
            ...prev,
            columns: prev.columns.map(c => {
              if (c.id === payload.column_id) {
                return {
                  ...c,
                  tasks: [...c.tasks, payload].sort((a, b) => a.position - b.position)
                };
              }
              return c;
            })
          };
        });
        break;

      case 'TASK_UPDATED':
        setBoardData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map(col => ({
              ...col,
              tasks: col.tasks.map(t => t.id === payload.id ? { ...t, ...payload } : t)
            }))
          };
        });
        setActiveDrawerTask(curr => (curr && curr.id === payload.id ? { ...curr, ...payload } : curr));
        break;

      case 'TASK_MOVED':
        setBoardData(prev => {
          if (!prev) return prev;
          const { task, fromColumnId, toColumnId } = payload;
          return {
            ...prev,
            columns: prev.columns.map(col => {
              if (col.id === fromColumnId && fromColumnId !== toColumnId) {
                return { ...col, tasks: col.tasks.filter(t => t.id !== task.id) };
              }
              if (col.id === toColumnId) {
                const filtered = col.tasks.filter(t => t.id !== task.id);
                return {
                  ...col,
                  tasks: [...filtered, task].sort((a, b) => a.position - b.position)
                };
              }
              return col;
            })
          };
        });
        break;

      case 'TASK_DELETED':
        setBoardData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map(col => ({
              ...col,
              tasks: col.tasks.filter(t => t.id !== payload.taskId)
            }))
          };
        });
        setActiveDrawerTask(curr => (curr && curr.id === payload.taskId ? null : curr));
        break;

      case 'COLUMN_CREATED':
        setBoardData(prev => {
          if (!prev || prev.columns.some(c => c.id === payload.id)) return prev;
          return {
            ...prev,
            columns: [...prev.columns, payload].sort((a, b) => a.position - b.position)
          };
        });
        break;

      case 'COLUMN_DELETED':
        setBoardData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.filter(c => c.id !== payload.columnId)
          };
        });
        break;

      case 'ACTIVITY_LOGGED':
        setActivityLogs(prev => [payload, ...prev.slice(0, 49)]);
        setUnreadNotifications(c => c + 1);
        break;

      default:
        break;
    }
  }, []);

  // Authenticated Socket.IO Connection Management
  useEffect(() => {
    const token = getAuthToken();
    if (!currentTenant || !currentUser || !token) return;

    setWsStatus('RECONNECTING');

    const socketUrl = import.meta.env.VITE_API_BASE_URL || '/';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setWsStatus('CONNECTED');
      // Subscribe to tenant-scoped room with verified credentials
      socket.emit('SUBSCRIBE', {
        tenantId: currentTenant.id,
        boardId: currentBoard?.id || null
      });
      // Synchronize board state on connect/reconnect
      refreshBoardData();
    });

    socket.on('disconnect', () => {
      setWsStatus('OFFLINE');
    });

    socket.on('reconnect', () => {
      setWsStatus('CONNECTED');
      socket.emit('SUBSCRIBE', {
        tenantId: currentTenant.id,
        boardId: currentBoard?.id || null
      });
      refreshBoardData();
    });

    // Listen to real-time events
    socket.on('PRESENCE_STATE', (data) => handleRealtimeMessage({ type: 'PRESENCE_STATE', payload: data }));
    socket.on('TASK_CREATED', (data) => handleRealtimeMessage({ type: 'TASK_CREATED', payload: data }));
    socket.on('TASK_UPDATED', (data) => handleRealtimeMessage({ type: 'TASK_UPDATED', payload: data }));
    socket.on('TASK_MOVED', (data) => handleRealtimeMessage({ type: 'TASK_MOVED', payload: data }));
    socket.on('TASK_DELETED', (data) => handleRealtimeMessage({ type: 'TASK_DELETED', payload: data }));
    socket.on('COLUMN_CREATED', (data) => handleRealtimeMessage({ type: 'COLUMN_CREATED', payload: data }));
    socket.on('COLUMN_DELETED', (data) => handleRealtimeMessage({ type: 'COLUMN_DELETED', payload: data }));
    socket.on('ACTIVITY_LOGGED', (data) => handleRealtimeMessage({ type: 'ACTIVITY_LOGGED', payload: data }));
    socket.on('message', (msg) => handleRealtimeMessage(msg));

    socket.on('AUTH_FAILED', (err) => {
      addToast(err.error || 'Realtime subscription rejected', 'conflict');
    });

    return () => {
      socket.disconnect();
    };
  }, [currentTenant?.id, currentBoard?.id, currentUser?.id, handleRealtimeMessage, refreshBoardData, addToast]);

  // Send activity presence
  const sendPresenceActivity = useCallback((activeTaskId = null, isEditing = false) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('PRESENCE_ACTIVITY', {
        activeTaskId,
        isEditing,
        boardId: currentBoard?.id || null
      });
    }
  }, [currentBoard?.id]);

  // Switch Organization
  const switchOrg = async (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;
    setCurrentOrg(org);

    try {
      const tenantList = await api.getTenants(org.id);
      setTenants(tenantList);
      if (tenantList.length > 0) {
        setCurrentTenant(tenantList[0]);
      } else {
        setCurrentTenant(null);
        setBoards([]);
        setBoardData(null);
      }
    } catch (err) {
      addToast(`Failed to switch organization: ${err.message}`, 'conflict');
    }
  };

  // Switch Tenant / Branch
  const switchTenant = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setBoardData(null);
      setBoards([]);
      setCurrentTenant(tenant);
      setTenantContext(tenant.id);
      addToast(`Switched branch to ${tenant.name}`, 'info');
    }
  };

  // Switch User (Role & JWT Profile Simulator)
  const switchUser = async (userId) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      try {
        const loginData = await api.login(user.email, 'Password123!');
        setCurrentUser(loginData.user);
        addToast(`Switched profile to ${user.name} (JWT Verified)`, 'info');
      } catch (e) {
        setCurrentUser(user);
        addToast(`Switched profile to ${user.name}`, 'info');
      }
    }
  };

  // Auth: Login
  const login = async (email, password) => {
    const res = await api.login(email, password);
    setCurrentUser(res.user);
    setIsAuthenticated(true);
    await loadInitialData();
    addToast(`Welcome back, ${res.user.name}`, 'info');
    return res;
  };

  // Auth: Register
  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    setCurrentUser(res.user);
    setIsAuthenticated(true);
    addToast(`Account created successfully. Welcome, ${res.user.name}!`, 'info');
    return res;
  };

  // Auth: Logout
  const logout = () => {
    api.logout();
    setIsAuthenticated(false);
    addToast('Signed out of WorkSphere', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        currentUser,
        setCurrentUser,
        allUsers,
        setAllUsers,
        userRole,
        login,
        register,
        logout,
        switchUser,

        organizations,
        setOrganizations,
        currentOrg,
        switchOrg,

        tenants,
        setTenants,
        currentTenant,
        switchTenant,

        boards,
        setBoards,
        currentBoard,
        setCurrentBoard,
        boardData,
        setBoardData,
        refreshBoardData,

        sidebarCollapsed,
        setSidebarCollapsed,
        activeDrawerTask,
        setActiveDrawerTask,
        activeConflict,
        setActiveConflict,
        isEdgeCaseModalOpen,
        setIsEdgeCaseModalOpen,
        isCreateTaskModalOpen,
        setIsCreateTaskModalOpen,
        createTaskColumnId,
        setCreateTaskColumnId,
        isCreateBoardModalOpen,
        setIsCreateBoardModalOpen,
        searchQuery,
        setSearchQuery,

        wsStatus,
        onlineUsers,
        activityLogs,
        unreadNotifications,
        setUnreadNotifications,

        toasts,
        addToast,
        undoStack,
        redoStack,
        pushUndoAction,
        handleUndo,
        handleRedo,
        sendPresenceActivity,
        loadInitialData
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
