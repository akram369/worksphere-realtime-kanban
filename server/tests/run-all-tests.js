require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const assert = require('node:assert');
const http = require('node:http');
const { WebSocket } = require('ws');
const { app, server } = require('../src/server');
const { seedDatabase } = require('../src/db/seedPrisma');
const { prisma } = require('../src/db/prisma');

const TEST_PORT = 4099;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      port: TEST_PORT,
      hostname: 'localhost',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (e) {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE WORKSPHERE AUTOMATED TEST SUITE');
  console.log('   (Neon Cloud PostgreSQL + JWT + RBAC + OCC + WebSocket)');
  console.log('======================================================\n');

  // Fresh seed of Neon PostgreSQL
  await seedDatabase();

  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    process.stdout.write(`  [TEST ${total}] ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('    Error:', err.message);
      if (err.stack) {
        console.error('    Stack:', err.stack.split('\n').slice(0, 3).join('\n'));
      }
    }
  }

  // --- PRE-TEST: Authenticate Test Users and Collect Cryptographic JWT Tokens ---
  let rahulToken, priyaToken, arjunToken, davidToken;

  await test('JWT Authentication: Login with valid bcrypt password issues JWT token', async () => {
    const rahulLogin = await request({
      path: '/api/users/login',
      method: 'POST'
    }, {
      email: 'rahul@abctech.com',
      password: 'Password123!'
    });

    assert.strictEqual(rahulLogin.statusCode, 200, 'Rahul login must succeed');
    assert(rahulLogin.data.token, 'Must return JWT token');
    assert.strictEqual(rahulLogin.data.user.email, 'rahul@abctech.com');
    rahulToken = rahulLogin.data.token;

    const priyaLogin = await request({
      path: '/api/users/login',
      method: 'POST'
    }, {
      email: 'priya@abctech.com',
      password: 'Password123!'
    });
    assert.strictEqual(priyaLogin.statusCode, 200);
    priyaToken = priyaLogin.data.token;

    const arjunLogin = await request({
      path: '/api/users/login',
      method: 'POST'
    }, {
      email: 'arjun@abctech.com',
      password: 'Password123!'
    });
    assert.strictEqual(arjunLogin.statusCode, 200);
    arjunToken = arjunLogin.data.token;

    const davidLogin = await request({
      path: '/api/users/login',
      method: 'POST'
    }, {
      email: 'david@globalcorp.com',
      password: 'Password123!'
    });
    assert.strictEqual(davidLogin.statusCode, 200);
    davidToken = davidLogin.data.token;
  });

  await test('JWT Authentication: Insecure / unauthenticated request rejected with HTTP 401 Unauthorized', async () => {
    const res = await request({
      path: '/api/boards',
      method: 'GET',
      headers: {
        'x-tenant-id': 'tenant-hyderabad'
        // No Authorization header
      }
    });

    assert.strictEqual(res.statusCode, 401, 'Unauthenticated request must return 401');
    assert.match(res.data.error, /Unauthorized|Missing JWT/i);
  });

  // --- TEST GROUP 1: Cross-Tenant Data Isolation ---
  await test('Cross-Tenant Data Leakage: Arjun (Hyderabad/Bangalore) cannot access Singapore Hub Board (403 Forbidden)', async () => {
    const res = await request({
      path: '/api/boards/board-singapore',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${arjunToken}`,
        'x-tenant-id': 'tenant-singapore'
      }
    });

    assert.strictEqual(res.statusCode, 403, 'Must return 403 Forbidden for cross-tenant access');
    assert.match(res.data.error, /Access Denied|boundary violation/i);
  });

  await test('Cross-Tenant Task Tampering: Arjun cannot modify tasks in Singapore Hub (403 Forbidden)', async () => {
    const res = await request({
      path: '/api/tasks/task-sg-1',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${arjunToken}`,
        'x-tenant-id': 'tenant-singapore'
      }
    }, {
      title: 'Hacked Task Title'
    });

    assert.strictEqual(res.statusCode, 403, 'Must reject modification with 403 Forbidden');
  });

  // --- TEST GROUP 2: Cross-Organization Isolation ---
  await test('Cross-Organization Boundary: Rahul (ABC Tech Org Admin) cannot access Global Enterprise Singapore Tenant (403 Forbidden)', async () => {
    const res = await request({
      path: '/api/boards/board-singapore',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-singapore'
      }
    });

    assert.strictEqual(res.statusCode, 403, 'Must return 403 Forbidden for cross-organization access');
  });

  // --- TEST GROUP 3: Optimistic Concurrency Control (OCC 409) ---
  await test('Optimistic Concurrency Control: Concurrent update triggers HTTP 409 Conflict', async () => {
    // 1. Fetch initial task-web-1
    const initial = await request({
      path: '/api/boards/board-web-dev',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${priyaToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    });

    const task1 = initial.data.columns[0].tasks.find(t => t.id === 'task-web-1');
    assert(task1, 'Task 1 must exist');
    const expectedVersion = task1.version;

    // 2. User B (Rahul) updates task-web-1 first -> version increments to expectedVersion + 1
    const rahulUpdate = await request({
      path: '/api/tasks/task-web-1',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      expectedVersion,
      title: 'Rahul updated design system tokens first'
    });

    assert.strictEqual(rahulUpdate.statusCode, 200);
    assert.strictEqual(rahulUpdate.data.version, expectedVersion + 1);

    // 3. User A (Priya) attempts update with stale version -> HTTP 409 Conflict!
    const priyaUpdate = await request({
      path: '/api/tasks/task-web-1',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${priyaToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      expectedVersion, // Stale!
      title: 'Priya concurrent conflicting edit'
    });

    assert.strictEqual(priyaUpdate.statusCode, 409, 'Must return 409 Conflict');
    assert.strictEqual(priyaUpdate.data.conflict, true);
    assert.strictEqual(priyaUpdate.data.currentTask.version, expectedVersion + 1);
  });

  // --- TEST GROUP 4: Fractional Indexing & Task Movement ---
  await test('Fractional Indexing: Reordering task between 1000.0 and 2000.0 yields 1500.0', async () => {
    const moveRes = await request({
      path: '/api/tasks/task-web-2/move',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      targetColumnId: 'col-board-web-dev-todo',
      prevPos: 1000.0,
      nextPos: 2000.0
    });

    assert.strictEqual(moveRes.statusCode, 200);
    assert.strictEqual(moveRes.data.position, 1500.0, 'Position must be midpoint 1500.0');
  });

  // --- TEST GROUP 5: RBAC Role Authorization ---
  await test('RBAC Guard: Regular Member (Arjun) cannot delete a column (Requires Tenant Admin)', async () => {
    const deleteCol = await request({
      path: '/api/columns/col-board-web-dev-test',
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${arjunToken}`, // Member
        'x-tenant-id': 'tenant-hyderabad'
      }
    });

    assert.strictEqual(deleteCol.statusCode, 403, 'Member must be forbidden from deleting columns');
  });

  await test('RBAC Guard: Tenant Admin (Priya) CAN create a new column', async () => {
    const createCol = await request({
      path: '/api/columns',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${priyaToken}`, // Tenant Admin
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      boardId: 'board-web-dev',
      title: 'Staging Deployment'
    });

    assert.strictEqual(createCol.statusCode, 201, 'Tenant Admin must be permitted to create columns');
    assert.strictEqual(createCol.data.title, 'Staging Deployment');
  });

  // --- TEST GROUP 6: Real-time WebSocket Channel Scoping & JWT Verification ---
  await test('WebSocket Isolation: Client receives events only for subscribed tenant with verified JWT', async () => {
    const wsHyd = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
    const receivedMessages = [];

    await new Promise(resolve => wsHyd.on('open', resolve));

    // Subscribe wsHyd to Hyderabad with Rahul's verified token
    wsHyd.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: {
        tenantId: 'tenant-hyderabad',
        boardId: 'board-web-dev',
        token: rahulToken
      }
    }));

    wsHyd.on('message', (data) => {
      try {
        receivedMessages.push(JSON.parse(data.toString()));
      } catch (e) {}
    });

    await new Promise(r => setTimeout(r, 150));

    // Create task in Singapore Hub (tenant-singapore) with David's token
    await request({
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${davidToken}`,
        'x-tenant-id': 'tenant-singapore'
      }
    }, {
      boardId: 'board-singapore',
      columnId: 'col-board-singapore-todo',
      title: 'Singapore Private Logistics Event',
      priority: 'HIGH'
    });

    await new Promise(r => setTimeout(r, 200));

    // Verify Hyderabad subscriber NEVER received the Singapore event!
    const leakedEvent = receivedMessages.find(m => m.type === 'TASK_CREATED' && m.payload?.title === 'Singapore Private Logistics Event');
    assert.strictEqual(leakedEvent, undefined, 'Singapore event must NEVER leak into Hyderabad WebSocket channel');

    // Create task in Hyderabad with Priya's token
    await request({
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${priyaToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      boardId: 'board-web-dev',
      columnId: 'col-board-web-dev-todo',
      title: 'Hyderabad Legitimate Broadcast',
      priority: 'MEDIUM'
    });

    await new Promise(r => setTimeout(r, 200));

    // Verify Hyderabad subscriber DID receive legitimate broadcast!
    const legitimateEvent = receivedMessages.find(m => m.type === 'TASK_CREATED' && m.payload?.title === 'Hyderabad Legitimate Broadcast');
    assert(legitimateEvent, 'Hyderabad subscriber must receive legitimate tenant broadcast');

    wsHyd.close();
  });

  await test('WebSocket Security: Unauthorized tenant subscription rejected with AUTH_FAILED', async () => {
    const wsArjun = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
    const messages = [];

    await new Promise(resolve => wsArjun.on('open', resolve));

    // Arjun attempts to subscribe to Singapore Hub
    wsArjun.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: {
        tenantId: 'tenant-singapore',
        token: arjunToken
      }
    }));

    wsArjun.on('message', (data) => {
      try {
        messages.push(JSON.parse(data.toString()));
      } catch (e) {}
    });

    await new Promise(r => setTimeout(r, 200));

    const authFailed = messages.find(m => m.type === 'AUTH_FAILED');
    assert(authFailed, 'Must receive AUTH_FAILED message for unauthorized tenant subscription');
    assert.match(authFailed.error, /unauthorized to subscribe/i);

    wsArjun.close();
  });

  // --- NEW INTEGRATION TESTS FOR FINAL AUDIT ---

  // 1. Two users editing the same task
  await test('Concurrent Collaboration: Two users editing the same task results in HTTP 409 and version progression', async () => {
    // Both Priya and Rahul start with task-web-3 at version 1
    const taskBefore = await prisma.task.findUnique({ where: { id: 'task-web-3' } });
    const initialVersion = taskBefore.version;

    // Priya submits first
    const priyaEdit = await request({
      path: '/api/tasks/task-web-3',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${priyaToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      expectedVersion: initialVersion,
      title: 'Priya updated web vitals scope'
    });

    assert.strictEqual(priyaEdit.statusCode, 200);
    assert.strictEqual(priyaEdit.data.version, initialVersion + 1);

    // Rahul submits second with the now-stale initialVersion
    const rahulEdit = await request({
      path: '/api/tasks/task-web-3',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      expectedVersion: initialVersion,
      title: 'Rahul concurrent conflicting update'
    });

    assert.strictEqual(rahulEdit.statusCode, 409, 'Concurrent edit must return HTTP 409 Conflict');
    assert.strictEqual(rahulEdit.data.conflict, true);
    assert.strictEqual(rahulEdit.data.currentTask.version, initialVersion + 1);

    // Rahul resolves conflict by accepting server version and applying delta
    const rahulResolved = await request({
      path: '/api/tasks/task-web-3',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      expectedVersion: rahulEdit.data.currentTask.version,
      title: 'Priya updated web vitals scope + Rahul addition'
    });

    assert.strictEqual(rahulResolved.statusCode, 200);
    assert.strictEqual(rahulResolved.data.version, initialVersion + 2);
  });

  // 2. Two users moving the same task
  await test('Concurrent Movement: Two users moving the same task simultaneously triggers OCC conflict', async () => {
    const task = await prisma.task.findUnique({ where: { id: 'task-web-4' } });
    const currentVer = task.version;

    // Priya moves task to TESTING column
    const moveA = await request({
      path: '/api/tasks/task-web-4/move',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${priyaToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      targetColumnId: 'col-board-web-dev-test',
      prevPos: 1000.0,
      nextPos: null,
      expectedVersion: currentVer
    });

    assert.strictEqual(moveA.statusCode, 200);
    assert.strictEqual(moveA.data.version, currentVer + 1);

    // Rahul concurrently attempts to move task to DONE column using stale version
    const moveB = await request({
      path: '/api/tasks/task-web-4/move',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      targetColumnId: 'col-board-web-dev-done',
      prevPos: 1000.0,
      nextPos: null,
      expectedVersion: currentVer
    });

    assert.strictEqual(moveB.statusCode, 409, 'Concurrent movement must trigger HTTP 409 Conflict');
    assert.strictEqual(moveB.data.conflict, true);
  });

  // 3. Unauthorized tenant switching
  await test('Unauthorized Tenant Switching: Member attempting to query unassigned tenant is rejected with 403 Forbidden', async () => {
    // Arjun is member in Hyderabad and Bangalore, but NOT Chennai
    const res = await request({
      path: '/api/boards',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${arjunToken}`,
        'x-tenant-id': 'tenant-chennai'
      }
    });

    assert.strictEqual(res.statusCode, 403, 'Must return 403 Forbidden for unauthorized tenant');
    assert.match(res.data.error, /Access Denied|boundary violation/i);
  });

  // 4. WebSocket reconnection
  await test('WebSocket Resilience: Client disconnects, reconnects with JWT auth, and receives live events', async () => {
    // 1. Initial connection
    let ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
    await new Promise(r => ws.on('open', r));

    ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: { tenantId: 'tenant-hyderabad', token: priyaToken }
    }));
    await new Promise(r => setTimeout(r, 100));

    // 2. Simulate disconnect / network drop
    ws.close();
    await new Promise(r => ws.on('close', r));

    // 3. Reconnect with verified JWT token
    const wsReconnected = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
    const msgs = [];
    await new Promise(r => wsReconnected.on('open', r));

    wsReconnected.on('message', data => {
      try { msgs.push(JSON.parse(data.toString())); } catch (e) {}
    });

    wsReconnected.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: { tenantId: 'tenant-hyderabad', token: priyaToken }
    }));
    await new Promise(r => setTimeout(r, 100));

    // 4. Trigger server event during reconnected session
    await request({
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      boardId: 'board-web-dev',
      columnId: 'col-board-web-dev-todo',
      title: 'Reconnection Verification Event',
      priority: 'LOW'
    });
    await new Promise(r => setTimeout(r, 150));

    const received = msgs.find(m => m.type === 'TASK_CREATED' && m.payload?.title === 'Reconnection Verification Event');
    assert(received, 'Reconnected client must receive live broadcasts after session recovery');
    wsReconnected.close();
  });

  // 5. Unauthorized task deletion
  await test('Unauthorized Task Deletion: Cross-tenant task deletion is rejected with 403 Forbidden', async () => {
    // Arjun (Hyderabad/Bangalore) attempts to delete Singapore Hub task task-sg-1
    const delRes = await request({
      path: '/api/tasks/task-sg-1',
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${arjunToken}`,
        'x-tenant-id': 'tenant-singapore'
      }
    });

    assert.strictEqual(delRes.statusCode, 403, 'Must reject deletion with 403 Forbidden');

    // Confirm record is NOT deleted in PostgreSQL
    const taskStillExists = await prisma.task.findUnique({ where: { id: 'task-sg-1' } });
    assert(taskStillExists, 'Task must remain untouched in database');
  });

  // 6. Simultaneous task reordering
  await test('Simultaneous Task Reordering: Monotonic fractional position assignment in PostgreSQL transaction', async () => {
    // Two tasks inserted between existing positions
    const resA = await request({
      path: '/api/tasks/task-web-1/move',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      targetColumnId: 'col-board-web-dev-todo',
      prevPos: 1000.0,
      nextPos: 1500.0
    });

    const resB = await request({
      path: '/api/tasks/task-web-2/move',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rahulToken}`,
        'x-tenant-id': 'tenant-hyderabad'
      }
    }, {
      targetColumnId: 'col-board-web-dev-todo',
      prevPos: 1500.0,
      nextPos: 2000.0
    });

    assert.strictEqual(resA.statusCode, 200);
    assert.strictEqual(resB.statusCode, 200);
    assert.strictEqual(resA.data.position, 1250.0);
    assert.strictEqual(resB.data.position, 1750.0);
    assert(resA.data.position < resB.data.position, 'Order must remain strictly monotonic');
  });

  console.log('\n======================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('======================================================\n');

  await prisma.$disconnect();
  server.close();
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
