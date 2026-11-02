const { Server: SocketIOServer } = require('socket.io');
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db/prisma');
const { JWT_SECRET } = require('../middleware/auth');

class RealtimeServer {
  constructor() {
    this.io = null;
    this.wss = null;
    // Map of socketId / ws -> { userId, userName, userEmail, userAvatar, tenantId, boardId, activeTaskId, isEditing }
    this.presence = new Map();
    // Raw ws channels
    this.rawChannels = new Map();
  }

  init(server) {
    // 1. Initialize Socket.IO Server
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 30000,
      pingInterval: 10000
    });

    // Enforce JWT Authentication on all Socket.IO connections
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '') ||
                    socket.handshake.query?.token;

      if (!token) {
        console.warn('[Socket.IO Auth] Connection rejected: Missing token');
        return next(new Error('AUTH_ERROR: Missing authentication token'));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, name: true, email: true, avatar: true }
        });

        if (!user) {
          return next(new Error('AUTH_ERROR: User not found in database'));
        }

        socket.user = user;
        next();
      } catch (err) {
        console.warn(`[Socket.IO Auth] Connection rejected: ${err.message}`);
        return next(new Error(`AUTH_ERROR: ${err.message}`));
      }
    });

    this.io.on('connection', (socket) => {
      // Setup client handlers
      socket.on('SUBSCRIBE', async (payload) => {
        await this.handleSocketSubscribe(socket, payload);
      });

      socket.on('join_tenant', async (payload) => {
        await this.handleSocketSubscribe(socket, payload);
      });

      socket.on('PRESENCE_ACTIVITY', (payload) => {
        this.handlePresenceActivity(socket.id, payload);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket.id);
      });
    });

    // 2. Initialize Raw WebSocket Server on /ws for dual compatibility
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleRawMessage(ws, message);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'ERROR', error: 'Invalid JSON message' }));
        }
      });

      ws.on('close', () => {
        this.handleRawDisconnect(ws);
      });

      ws.on('error', () => {
        this.handleRawDisconnect(ws);
      });

      ws.send(JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() }));
    });

    console.log('📡 Realtime Socket.IO and WebSocket server initialized with verified JWT authentication');
  }

  /**
   * Authorize tenant membership and join Socket.IO rooms
   */
  async handleSocketSubscribe(socket, payload) {
    const { tenantId, boardId } = payload || {};
    const user = socket.user;

    if (!tenantId) {
      return socket.emit('ERROR', { error: 'tenantId is required for subscription' });
    }

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, org_id: true, name: true }
      });

      if (!tenant) {
        return socket.emit('ERROR', { error: 'Tenant not found' });
      }

      // Verify membership server-side
      const membership = await prisma.membership.findFirst({
        where: {
          user_id: user.id,
          org_id: tenant.org_id,
          OR: [
            { tenant_id: tenant.id },
            { tenant_id: null, role: 'ORG_ADMIN' }
          ]
        }
      });

      if (!membership) {
        return socket.emit('AUTH_FAILED', {
          error: `Access Denied: User ${user.email} is unauthorized to subscribe to tenant ${tenantId}`,
          tenantId
        });
      }

      // Leave previous rooms
      const currentMeta = this.presence.get(socket.id);
      if (currentMeta) {
        socket.leave(`tenant:${currentMeta.tenantId}`);
        if (currentMeta.boardId) socket.leave(`tenant:${currentMeta.tenantId}:board:${currentMeta.boardId}`);
      }

      // Join tenant room
      socket.join(`tenant:${tenantId}`);
      if (boardId) {
        socket.join(`tenant:${tenantId}:board:${boardId}`);
      }

      this.presence.set(socket.id, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userAvatar: user.avatar,
        role: membership.role,
        tenantId,
        boardId: boardId || null,
        activeTaskId: null,
        isEditing: false,
        joinedAt: Date.now()
      });

      socket.emit('SUBSCRIBED', {
        tenantId,
        boardId,
        userRole: membership.role
      });

      this.broadcastPresence(tenantId);
    } catch (err) {
      console.error('[Socket.IO Subscribe Error]', err);
      socket.emit('ERROR', { error: 'Failed to verify tenant subscription', details: err.message });
    }
  }

  handlePresenceActivity(id, payload) {
    const meta = this.presence.get(id);
    if (!meta) return;

    const { activeTaskId, isEditing, boardId } = payload || {};
    if (activeTaskId !== undefined) meta.activeTaskId = activeTaskId;
    if (isEditing !== undefined) meta.isEditing = isEditing;
    if (boardId && boardId !== meta.boardId) meta.boardId = boardId;

    this.broadcastPresence(meta.tenantId);
  }

  handleDisconnect(id) {
    const meta = this.presence.get(id);
    if (meta) {
      const tenantId = meta.tenantId;
      this.presence.delete(id);
      this.broadcastPresence(tenantId);
    }
  }

  getPresenceForTenant(tenantId) {
    const list = [];
    for (const [id, meta] of this.presence.entries()) {
      if (meta.tenantId === tenantId) {
        list.push({
          userId: meta.userId,
          name: meta.userName,
          email: meta.userEmail,
          avatar: meta.userAvatar,
          role: meta.role,
          boardId: meta.boardId,
          activeTaskId: meta.activeTaskId,
          isEditing: meta.isEditing,
          joinedAt: meta.joinedAt
        });
      }
    }
    return list;
  }

  broadcastPresence(tenantId) {
    const users = this.getPresenceForTenant(tenantId);
    const data = {
      tenantId,
      users,
      count: users.length
    };

    // Emit via Socket.IO
    if (this.io) {
      this.io.to(`tenant:${tenantId}`).emit('PRESENCE_STATE', data);
      this.io.to(`tenant:${tenantId}`).emit('message', { type: 'PRESENCE_STATE', payload: data });
    }

    // Emit via raw WS
    this.broadcastRaw(tenantId, { type: 'PRESENCE_STATE', payload: data });
  }

  /**
   * Broadcast committed database event strictly to tenant subscribers
   */
  broadcastToTenant(tenantId, eventType, payload) {
    if (this.io) {
      this.io.to(`tenant:${tenantId}`).emit(eventType, payload);
      this.io.to(`tenant:${tenantId}`).emit('message', { type: eventType, payload });
    }
    this.broadcastRaw(tenantId, { type: eventType, payload });
  }

  /**
   * Broadcast strictly to board subscribers inside a tenant
   */
  broadcastToBoard(tenantId, boardId, eventType, payload) {
    if (this.io) {
      this.io.to(`tenant:${tenantId}:board:${boardId}`).emit(eventType, payload);
      this.io.to(`tenant:${tenantId}:board:${boardId}`).emit('message', { type: eventType, payload });
    }
    this.broadcastRaw(tenantId, { type: eventType, payload });
  }

  // --- Raw WebSocket support ---
  async handleRawMessage(ws, message) {
    const { type, payload } = message;

    if (type === 'PING') {
      return ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
    }

    if (type === 'SUBSCRIBE') {
      const { tenantId, boardId, userId, token } = payload || {};
      let resolvedUserId = userId;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          resolvedUserId = decoded.userId;
        } catch (e) {
          return ws.send(JSON.stringify({ type: 'AUTH_FAILED', error: 'Invalid JWT token' }));
        }
      }

      if (!tenantId || !resolvedUserId) {
        return ws.send(JSON.stringify({ type: 'ERROR', error: 'tenantId and authenticated user are required' }));
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return ws.send(JSON.stringify({ type: 'ERROR', error: 'Tenant not found' }));

      const membership = await prisma.membership.findFirst({
        where: {
          user_id: resolvedUserId,
          org_id: tenant.org_id,
          OR: [
            { tenant_id: tenant.id },
            { tenant_id: null, role: 'ORG_ADMIN' }
          ]
        }
      });

      if (!membership) {
        return ws.send(JSON.stringify({
          type: 'AUTH_FAILED',
          error: `User ${resolvedUserId} is unauthorized to subscribe to tenant ${tenantId}`
        }));
      }

      const user = await prisma.user.findUnique({ where: { id: resolvedUserId } });
      this.removeRawFromAll(ws);

      const clientMeta = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userAvatar: user.avatar,
        role: membership.role,
        tenantId,
        boardId: boardId || null,
        activeTaskId: null,
        isEditing: false,
        joinedAt: Date.now()
      };

      this.presence.set(ws, clientMeta);
      this.addToRawChannel(`tenant:${tenantId}`, ws);

      ws.send(JSON.stringify({
        type: 'SUBSCRIBED',
        payload: { tenantId, boardId, userRole: membership.role }
      }));

      this.broadcastPresence(tenantId);
    }
  }

  addToRawChannel(channel, ws) {
    if (!this.rawChannels.has(channel)) this.rawChannels.set(channel, new Set());
    this.rawChannels.get(channel).add(ws);
  }

  removeRawFromAll(ws) {
    for (const [ch, set] of this.rawChannels.entries()) {
      set.delete(ws);
    }
  }

  handleRawDisconnect(ws) {
    const meta = this.presence.get(ws);
    if (meta) {
      const tenantId = meta.tenantId;
      this.removeRawFromAll(ws);
      this.presence.delete(ws);
      this.broadcastPresence(tenantId);
    }
  }

  broadcastRaw(tenantId, data) {
    const channel = this.rawChannels.get(`tenant:${tenantId}`);
    if (!channel) return;
    const str = JSON.stringify(data);
    for (const ws of channel) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(str);
      }
    }
  }
}

const realtimeServer = new RealtimeServer();
module.exports = { realtimeServer };
