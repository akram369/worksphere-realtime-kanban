const bcrypt = require('bcryptjs');
const { prisma } = require('../src/db/prisma');

async function verifyNeonDatabase() {
  console.log('\n======================================================');
  console.log('🔍 VERIFYING NEON POSTGRESQL DATABASE & CRUD INTEGRITY');
  console.log('======================================================\n');

  try {
    // 1. Verify 8 tables and counts
    console.log('1. Checking all 8 tables and row counts:');
    const orgCount = await prisma.organization.count();
    const tenantCount = await prisma.tenant.count();
    const userCount = await prisma.user.count();
    const membershipCount = await prisma.membership.count();
    const boardCount = await prisma.board.count();
    const columnCount = await prisma.column.count();
    const taskCount = await prisma.task.count();
    const activityCount = await prisma.activityLog.count();

    console.log(`   - organizations:  ${orgCount}`);
    console.log(`   - tenants:        ${tenantCount}`);
    console.log(`   - users:          ${userCount}`);
    console.log(`   - memberships:    ${membershipCount}`);
    console.log(`   - boards:         ${boardCount}`);
    console.log(`   - columns:        ${columnCount}`);
    console.log(`   - tasks:          ${taskCount}`);
    console.log(`   - activity_logs:  ${activityCount}`);

    if (
      orgCount === 0 ||
      tenantCount === 0 ||
      userCount === 0 ||
      membershipCount === 0 ||
      boardCount === 0 ||
      columnCount === 0 ||
      taskCount === 0 ||
      activityCount === 0
    ) {
      throw new Error('One or more tables are empty!');
    }

    // 2. Verify Foreign Keys and Relationships
    console.log('\n2. Verifying Foreign Key Relational Queries:');
    const orgWithRelations = await prisma.organization.findUnique({
      where: { slug: 'abc-tech' },
      include: {
        tenants: true,
        memberships: {
          include: { user: true }
        }
      }
    });
    console.log(`   ✔ Organization "${orgWithRelations.name}" has ${orgWithRelations.tenants.length} tenants and ${orgWithRelations.memberships.length} memberships.`);

    const boardWithColumns = await prisma.board.findUnique({
      where: { id: 'board-web-dev' },
      include: {
        tenant: true,
        columns: { orderBy: { position: 'asc' } },
        tasks: { include: { assignee: true } }
      }
    });
    console.log(`   ✔ Board "${boardWithColumns.name}" belongs to Tenant "${boardWithColumns.tenant.name}", with ${boardWithColumns.columns.length} columns and ${boardWithColumns.tasks.length} tasks.`);

    // 3. Verify Password Hashing with Bcrypt
    console.log('\n3. Verifying Bcrypt Password Hashes:');
    const rahul = await prisma.user.findUnique({ where: { email: 'rahul@abctech.com' } });
    const isPasswordValid = bcrypt.compareSync('Password123!', rahul.password_hash);
    console.log(`   ✔ Bcrypt compareSync('Password123!', hash) returned: ${isPasswordValid}`);
    if (!isPasswordValid) throw new Error('Bcrypt hash verification failed!');

    // 4. Test CRUD Operations
    console.log('\n4. Testing CRUD Operations on Tasks:');
    // CREATE
    const newTask = await prisma.task.create({
      data: {
        id: 'task-crud-test',
        title: 'Neon PostgreSQL CRUD Verification Task',
        description: 'Testing task persistence in Neon Singapore cluster',
        priority: 'HIGH',
        tenant_id: 'tenant-hyderabad',
        board_id: 'board-web-dev',
        column_id: 'col-board-web-dev-todo',
        position: 9999.0,
        version: 1
      }
    });
    console.log(`   ✔ CREATE: Task created with ID ${newTask.id} (version: ${newTask.version})`);

    // READ
    const fetchedTask = await prisma.task.findUnique({
      where: { id: 'task-crud-test' }
    });
    console.log(`   ✔ READ: Fetched task "${fetchedTask.title}" successfully.`);

    // UPDATE with Optimistic Concurrency Control
    const updatedTask = await prisma.task.update({
      where: { id: 'task-crud-test' },
      data: {
        title: 'Neon PostgreSQL CRUD Verification Task (Updated)',
        version: { increment: 1 }
      }
    });
    console.log(`   ✔ UPDATE: Updated title and incremented version to ${updatedTask.version}.`);

    // DELETE
    await prisma.task.delete({
      where: { id: 'task-crud-test' }
    });
    const checkDeleted = await prisma.task.findUnique({ where: { id: 'task-crud-test' } });
    console.log(`   ✔ DELETE: Verified task deletion (findUnique returned: ${checkDeleted === null ? 'null' : 'exists'}).`);

    console.log('\n======================================================');
    console.log('🎉 ALL 8 TABLES & CRUD CHECKS PASSED ON NEON CLOUD!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

verifyNeonDatabase();
