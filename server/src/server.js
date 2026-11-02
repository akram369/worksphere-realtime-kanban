require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const { realtimeServer } = require('./websocket/socketServer');

// Routes
const orgsRouter = require('./routes/orgs');
const tenantsRouter = require('./routes/tenants');
const boardsRouter = require('./routes/boards');
const tasksRouter = require('./routes/tasks');
const columnsRouter = require('./routes/columns');
const activityLogsRouter = require('./routes/activityLogs');
const usersRouter = require('./routes/users');
const testScenariosRouter = require('./routes/testScenarios');

const app = express();
const server = http.createServer(app);

// Enable Cross-Origin Resource Sharing and JSON Body Parsing
app.use(cors());
app.use(express.json());

// Request logging for audit and debuggability
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') && req.path !== '/api/health') {
      const caller = req.user ? `${req.user.email} (${req.user.id})` : 'unauthenticated';
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms) [Caller: ${caller}]`);
    }
  });
  next();
});

// Health check endpoint (Public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'realtime-kanban-multi-tenant-backend',
    version: '2.0.0',
    database: 'Neon Cloud PostgreSQL (AWS Singapore)'
  });
});

// Authentication middleware applied across protected API routes
app.use('/api', authMiddleware);

// Mount API routes
app.use('/api/organizations', orgsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/activity-logs', activityLogsRouter);
app.use('/api/users', usersRouter);
app.use('/api/test-scenarios', testScenariosRouter);

// Serve static client bundle in production if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Handler for unhandled API requests
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Global Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Initialize WebSocket and Socket.IO server attached to the HTTP port
realtimeServer.init(server);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Multi-Tenant Collaborative Kanban Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO and WebSocket live on port ${PORT}`);
    console.log(`🐘 Connected to Neon Cloud PostgreSQL in AWS Singapore`);
  });
}

module.exports = { app, server };
