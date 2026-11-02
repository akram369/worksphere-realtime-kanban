const { db, withTransaction } = require('./connection');

function seedDatabase() {
  console.log('🌱 Starting WorkSphere database seed...');

  withTransaction(() => {
    // Clean existing data in reverse order of foreign keys
    db.exec('DELETE FROM activity_logs;');
    db.exec('DELETE FROM tasks;');
    db.exec('DELETE FROM columns;');
    db.exec('DELETE FROM boards;');
    db.exec('DELETE FROM memberships;');
    db.exec('DELETE FROM tenants;');
    db.exec('DELETE FROM organizations;');
    db.exec('DELETE FROM users;');

    // 1. Organizations
    const insertOrg = db.prepare('INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)');
    insertOrg.run('org-abc-tech', 'ABC Technologies', 'abc-tech');
    insertOrg.run('org-global-corp', 'Global Enterprise Corp', 'global-corp');

    // 2. Tenants (Branches)
    const insertTenant = db.prepare('INSERT INTO tenants (id, org_id, name, slug) VALUES (?, ?, ?, ?)');
    insertTenant.run('tenant-hyderabad', 'org-abc-tech', 'Hyderabad', 'hyderabad');
    insertTenant.run('tenant-bangalore', 'org-abc-tech', 'Bangalore', 'bangalore');
    insertTenant.run('tenant-chennai', 'org-abc-tech', 'Chennai', 'chennai');
    insertTenant.run('tenant-singapore', 'org-global-corp', 'Singapore Hub', 'singapore-hub');

    // 3. Users
    const insertUser = db.prepare('INSERT INTO users (id, name, email, avatar) VALUES (?, ?, ?, ?)');
    insertUser.run(
      'user-rahul',
      'Rahul Sharma',
      'rahul@abctech.com',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'
    );
    insertUser.run(
      'user-priya',
      'Priya Patel',
      'priya@abctech.com',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces'
    );
    insertUser.run(
      'user-sneha',
      'Sneha Rao',
      'sneha@abctech.com',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces'
    );
    insertUser.run(
      'user-arjun',
      'Arjun Verma',
      'arjun@abctech.com',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces'
    );
    insertUser.run(
      'user-david',
      'David Kim',
      'david@globalcorp.com',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces'
    );

    // 4. Memberships (Role-Based Access Control)
    const insertMember = db.prepare('INSERT INTO memberships (id, user_id, org_id, tenant_id, role) VALUES (?, ?, ?, ?, ?)');
    // Rahul: Organization Admin across all ABC Technologies branches
    insertMember.run('mem-rahul', 'user-rahul', 'org-abc-tech', null, 'ORG_ADMIN');
    // Priya: Tenant Admin for Hyderabad branch
    insertMember.run('mem-priya', 'user-priya', 'org-abc-tech', 'tenant-hyderabad', 'TENANT_ADMIN');
    // Sneha: Tenant Admin for Bangalore branch
    insertMember.run('mem-sneha', 'user-sneha', 'org-abc-tech', 'tenant-bangalore', 'TENANT_ADMIN');
    // Arjun: Member in Hyderabad and Bangalore
    insertMember.run('mem-arjun-hyd', 'user-arjun', 'org-abc-tech', 'tenant-hyderabad', 'MEMBER');
    insertMember.run('mem-arjun-blr', 'user-arjun', 'org-abc-tech', 'tenant-bangalore', 'MEMBER');
    // David: Org Admin for Global Enterprise Corp (isolation proof)
    insertMember.run('mem-david', 'user-david', 'org-global-corp', null, 'ORG_ADMIN');

    // 5. Boards / Projects
    const insertBoard = db.prepare('INSERT INTO boards (id, tenant_id, name, description) VALUES (?, ?, ?, ?)');
    insertBoard.run('board-web-dev', 'tenant-hyderabad', 'Website Development', 'Corporate customer portal and marketing web platform redesign.');
    insertBoard.run('board-mobile-dev', 'tenant-hyderabad', 'Mobile App Development', 'Next-gen iOS & Android hybrid mobile app for field operations.');
    insertBoard.run('board-ai-auto', 'tenant-hyderabad', 'AI Automation', 'LLM pipeline for automated customer ticket routing and synthesis.');
    insertBoard.run('board-crm-dev', 'tenant-bangalore', 'CRM Development', 'Custom CRM pipeline for enterprise sales and onboarding funnels.');
    insertBoard.run('board-cloud-mig', 'tenant-bangalore', 'Cloud Migration', 'Multi-region AWS Kubernetes deployment and database clustering.');
    insertBoard.run('board-sec-comp', 'tenant-chennai', 'Security & Compliance', 'SOC2 Type II compliance audit and automated policy verification.');
    insertBoard.run('board-singapore', 'tenant-singapore', 'APAC Regional Expansion', 'Logistics hub integration for APAC operations.');

    // 6. Workflow Columns (TO DO, IN PROGRESS, TESTING, DONE)
    const insertCol = db.prepare('INSERT INTO columns (id, board_id, tenant_id, title, position) VALUES (?, ?, ?, ?, ?)');

    const boardsList = [
      { id: 'board-web-dev', tenant: 'tenant-hyderabad' },
      { id: 'board-mobile-dev', tenant: 'tenant-hyderabad' },
      { id: 'board-ai-auto', tenant: 'tenant-hyderabad' },
      { id: 'board-crm-dev', tenant: 'tenant-bangalore' },
      { id: 'board-cloud-mig', tenant: 'tenant-bangalore' },
      { id: 'board-sec-comp', tenant: 'tenant-chennai' },
      { id: 'board-singapore', tenant: 'tenant-singapore' }
    ];

    for (const b of boardsList) {
      insertCol.run(`col-${b.id}-todo`, b.id, b.tenant, 'TO DO', 1000.0);
      insertCol.run(`col-${b.id}-prog`, b.id, b.tenant, 'IN PROGRESS', 2000.0);
      insertCol.run(`col-${b.id}-test`, b.id, b.tenant, 'TESTING', 3000.0);
      insertCol.run(`col-${b.id}-done`, b.id, b.tenant, 'DONE', 4000.0);
    }

    // 7. Tasks with realistic enterprise data
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, column_id, board_id, tenant_id, title, description, priority, assignee_id, position, version, tags, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Website Development Tasks (Hyderabad)
    insertTask.run(
      'task-web-1',
      'col-board-web-dev-todo',
      'board-web-dev',
      'tenant-hyderabad',
      'Design Responsive Design System Tokens',
      'Define unified typography, light theme color palettes, and component states for the customer portal.',
      'HIGH',
      'user-priya',
      1000.0,
      1,
      JSON.stringify(['Design', 'UI/UX']),
      '2026-11-15'
    );

    insertTask.run(
      'task-web-2',
      'col-board-web-dev-todo',
      'board-web-dev',
      'tenant-hyderabad',
      'Implement OAuth2 & SSO Authentication',
      'Integrate Okta and Google Workspace SSO provider for enterprise single sign-on.',
      'URGENT',
      'user-rahul',
      2000.0,
      1,
      JSON.stringify(['Security', 'Auth']),
      '2026-11-12'
    );

    insertTask.run(
      'task-web-3',
      'col-board-web-dev-prog',
      'board-web-dev',
      'tenant-hyderabad',
      'Optimize Web Vitals & Asset Bundling',
      'Reduce LCP to <1.2s and eliminate render-blocking stylesheets across landing routes.',
      'MEDIUM',
      'user-arjun',
      1000.0,
      1,
      JSON.stringify(['Performance', 'Frontend']),
      '2026-11-18'
    );

    insertTask.run(
      'task-web-4',
      'col-board-web-dev-prog',
      'board-web-dev',
      'tenant-hyderabad',
      'Build Multi-Tenant Tenant Switcher UI',
      'Provide instant branch context switching with zero data leakage across organizations.',
      'HIGH',
      'user-priya',
      2000.0,
      1,
      JSON.stringify(['Tenancy', 'UI']),
      '2026-11-10'
    );

    insertTask.run(
      'task-web-5',
      'col-board-web-dev-test',
      'board-web-dev',
      'tenant-hyderabad',
      'Cross-Browser End-to-End Regression Tests',
      'Automated Playwright suite running across Chrome, Firefox, and Safari on desktop and mobile viewports.',
      'HIGH',
      'user-arjun',
      1000.0,
      1,
      JSON.stringify(['QA', 'Automation']),
      '2026-11-08'
    );

    insertTask.run(
      'task-web-6',
      'col-board-web-dev-done',
      'board-web-dev',
      'tenant-hyderabad',
      'Database Schema Migration & Foreign Keys',
      'Initialize SQLite with WAL mode, foreign key cascade constraints, and tenant index benchmarks.',
      'LOW',
      'user-rahul',
      1000.0,
      1,
      JSON.stringify(['Database', 'Architecture']),
      '2026-11-01'
    );

    // Mobile App Development Tasks (Hyderabad)
    insertTask.run(
      'task-mob-1',
      'col-board-mobile-dev-todo',
      'board-mobile-dev',
      'tenant-hyderabad',
      'Offline SQLite Sync for Mobile App',
      'Implement local caching layer and conflict detection when mobile device regains network connectivity.',
      'URGENT',
      'user-arjun',
      1000.0,
      1,
      JSON.stringify(['Mobile', 'Offline']),
      '2026-11-20'
    );

    insertTask.run(
      'task-mob-2',
      'col-board-mobile-dev-prog',
      'board-mobile-dev',
      'tenant-hyderabad',
      'Push Notifications via Firebase Cloud Messaging',
      'Deliver real-time task assignment alerts and mention notifications to mobile devices.',
      'MEDIUM',
      'user-priya',
      1000.0,
      1,
      JSON.stringify(['Mobile', 'Notifications']),
      '2026-11-16'
    );

    insertTask.run(
      'task-mob-3',
      'col-board-mobile-dev-done',
      'board-mobile-dev',
      'tenant-hyderabad',
      'Biometric FaceID / Fingerprint Login',
      'Native biometric authentication integration with biometric keychain storage.',
      'LOW',
      'user-arjun',
      1000.0,
      1,
      JSON.stringify(['Security', 'Mobile']),
      '2026-11-02'
    );

    // CRM Development Tasks (Bangalore)
    insertTask.run(
      'task-crm-1',
      'col-board-crm-dev-prog',
      'board-crm-dev',
      'tenant-bangalore',
      'Lead Scoring & Stage Progression Automation',
      'Automatic qualification of enterprise inbound inquiries based on team size and domain signals.',
      'HIGH',
      'user-sneha',
      1000.0,
      1,
      JSON.stringify(['CRM', 'Sales']),
      '2026-11-14'
    );

    insertTask.run(
      'task-crm-2',
      'col-board-crm-dev-test',
      'board-crm-dev',
      'tenant-bangalore',
      'Stripe Enterprise Invoicing Webhook Handler',
      'Process recurring subscription webhooks with idempotent event deduplication.',
      'URGENT',
      'user-sneha',
      1000.0,
      1,
      JSON.stringify(['Billing', 'Payments']),
      '2026-11-11'
    );

    // AI Automation Tasks (Hyderabad)
    insertTask.run(
      'task-ai-1',
      'col-board-ai-auto-todo',
      'board-ai-auto',
      'tenant-hyderabad',
      'RAG Knowledge Base Ingestion Pipeline',
      'Chunk and embed internal documentation into vector storage for autonomous employee answers.',
      'HIGH',
      'user-rahul',
      1000.0,
      1,
      JSON.stringify(['AI', 'RAG']),
      '2026-11-22'
    );

    // Singapore Task (Isolated Tenant)
    insertTask.run(
      'task-sg-1',
      'col-board-singapore-todo',
      'board-singapore',
      'tenant-singapore',
      'Regional Payment Gateway Integration',
      'PayNow and GrabPay integration for regional settlement.',
      'HIGH',
      'user-david',
      1000.0,
      1,
      JSON.stringify(['Finance', 'APAC']),
      '2026-11-30'
    );

    // 8. Activity Logs
    const insertLog = db.prepare(`
      INSERT INTO activity_logs (id, tenant_id, board_id, user_id, action_type, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const tMinus10m = new Date(now.getTime() - 10 * 60000).toISOString();
    const tMinus30m = new Date(now.getTime() - 30 * 60000).toISOString();
    const tMinus2h = new Date(now.getTime() - 120 * 60000).toISOString();
    const tMinus1d = new Date(now.getTime() - 1440 * 60000).toISOString();

    insertLog.run('log-1', 'tenant-hyderabad', 'board-web-dev', 'user-rahul', 'BOARD_CREATED', 'BOARD', 'board-web-dev', JSON.stringify({ name: 'Website Development' }), tMinus1d);
    insertLog.run('log-2', 'tenant-hyderabad', 'board-web-dev', 'user-priya', 'TASK_CREATED', 'TASK', 'task-web-1', JSON.stringify({ title: 'Design Responsive Design System Tokens', priority: 'HIGH' }), tMinus2h);
    insertLog.run('log-3', 'tenant-hyderabad', 'board-web-dev', 'user-arjun', 'TASK_MOVED', 'TASK', 'task-web-5', JSON.stringify({ fromColumn: 'IN PROGRESS', toColumn: 'TESTING', taskTitle: 'Cross-Browser End-to-End Regression Tests' }), tMinus30m);
    insertLog.run('log-4', 'tenant-hyderabad', 'board-web-dev', 'user-rahul', 'TASK_CREATED', 'TASK', 'task-web-2', JSON.stringify({ title: 'Implement OAuth2 & SSO Authentication', priority: 'URGENT' }), tMinus10m);
    insertLog.run('log-5', 'tenant-bangalore', 'board-crm-dev', 'user-sneha', 'TASK_CREATED', 'TASK', 'task-crm-1', JSON.stringify({ title: 'Lead Scoring & Stage Progression Automation' }), tMinus1d);
  });

  console.log('✅ WorkSphere database seeded successfully with ABC Technologies (Hyderabad, Bangalore, Chennai).');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
