const bcrypt = require('bcryptjs');
const { prisma } = require('./prisma');

async function seedDatabase() {
  console.log('🌱 Starting WorkSphere Neon PostgreSQL database seed...');

  // Hash standard password for all seed users
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  try {
    // 1. Clean existing records in reverse dependency order
    console.log('  -> Cleaning existing records...');
    await prisma.activityLog.deleteMany();
    await prisma.task.deleteMany();
    await prisma.column.deleteMany();
    await prisma.board.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    // 2. Seed Organizations
    console.log('  -> Seeding Organizations...');
    const orgAbc = await prisma.organization.create({
      data: {
        id: 'org-abc-tech',
        name: 'ABC Technologies',
        slug: 'abc-tech'
      }
    });

    const orgGlobal = await prisma.organization.create({
      data: {
        id: 'org-global-corp',
        name: 'Global Enterprise Corp',
        slug: 'global-corp'
      }
    });

    // 3. Seed Tenants (Branches)
    console.log('  -> Seeding Tenants...');
    const tenantHyd = await prisma.tenant.create({
      data: {
        id: 'tenant-hyderabad',
        org_id: orgAbc.id,
        name: 'Hyderabad',
        slug: 'hyderabad'
      }
    });

    const tenantBlr = await prisma.tenant.create({
      data: {
        id: 'tenant-bangalore',
        org_id: orgAbc.id,
        name: 'Bangalore',
        slug: 'bangalore'
      }
    });

    const tenantChn = await prisma.tenant.create({
      data: {
        id: 'tenant-chennai',
        org_id: orgAbc.id,
        name: 'Chennai',
        slug: 'chennai'
      }
    });

    const tenantSgp = await prisma.tenant.create({
      data: {
        id: 'tenant-singapore',
        org_id: orgGlobal.id,
        name: 'Singapore Hub',
        slug: 'singapore-hub'
      }
    });

    // 4. Seed Users with Bcrypt Hashed Passwords
    console.log('  -> Seeding Users with Bcrypt Passwords...');
    const usersData = [
      {
        id: 'user-rahul',
        name: 'Rahul Sharma',
        email: 'rahul@abctech.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'
      },
      {
        id: 'user-priya',
        name: 'Priya Patel',
        email: 'priya@abctech.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces'
      },
      {
        id: 'user-sneha',
        name: 'Sneha Rao',
        email: 'sneha@abctech.com',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces'
      },
      {
        id: 'user-arjun',
        name: 'Arjun Verma',
        email: 'arjun@abctech.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces'
      },
      {
        id: 'user-david',
        name: 'David Kim',
        email: 'david@globalcorp.com',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces'
      }
    ];

    for (const u of usersData) {
      await prisma.user.create({
        data: {
          id: u.id,
          name: u.name,
          email: u.email,
          password_hash: passwordHash,
          avatar: u.avatar
        }
      });
    }

    // 5. Seed Memberships (RBAC)
    console.log('  -> Seeding Memberships...');
    const memberships = [
      // Rahul: Org Admin across ABC Tech
      { id: 'mem-rahul', user_id: 'user-rahul', org_id: 'org-abc-tech', tenant_id: null, role: 'ORG_ADMIN' },
      // Priya: Tenant Admin for Hyderabad branch
      { id: 'mem-priya', user_id: 'user-priya', org_id: 'org-abc-tech', tenant_id: 'tenant-hyderabad', role: 'TENANT_ADMIN' },
      // Sneha: Tenant Admin for Bangalore branch
      { id: 'mem-sneha', user_id: 'user-sneha', org_id: 'org-abc-tech', tenant_id: 'tenant-bangalore', role: 'TENANT_ADMIN' },
      // Arjun: Member in Hyderabad and Bangalore
      { id: 'mem-arjun-hyd', user_id: 'user-arjun', org_id: 'org-abc-tech', tenant_id: 'tenant-hyderabad', role: 'MEMBER' },
      { id: 'mem-arjun-blr', user_id: 'user-arjun', org_id: 'org-abc-tech', tenant_id: 'tenant-bangalore', role: 'MEMBER' },
      // David: Org Admin for Global Enterprise Corp (Isolation demonstration)
      { id: 'mem-david', user_id: 'user-david', org_id: 'org-global-corp', tenant_id: null, role: 'ORG_ADMIN' }
    ];

    for (const m of memberships) {
      await prisma.membership.create({ data: m });
    }

    // 6. Seed Boards
    console.log('  -> Seeding Boards...');
    const boards = [
      { id: 'board-web-dev', tenant_id: 'tenant-hyderabad', name: 'Website Development', description: 'Corporate customer portal and marketing web platform redesign.' },
      { id: 'board-mobile-dev', tenant_id: 'tenant-hyderabad', name: 'Mobile App Development', description: 'Next-gen iOS & Android hybrid mobile app for field operations.' },
      { id: 'board-ai-auto', tenant_id: 'tenant-hyderabad', name: 'AI Automation', description: 'LLM pipeline for automated customer ticket routing and synthesis.' },
      { id: 'board-crm-dev', tenant_id: 'tenant-bangalore', name: 'CRM Development', description: 'Custom CRM pipeline for enterprise sales and onboarding funnels.' },
      { id: 'board-cloud-mig', tenant_id: 'tenant-bangalore', name: 'Cloud Migration', description: 'Multi-region AWS Kubernetes deployment and database clustering.' },
      { id: 'board-sec-comp', tenant_id: 'tenant-chennai', name: 'Security & Compliance', description: 'SOC2 Type II compliance audit and automated policy verification.' },
      { id: 'board-singapore', tenant_id: 'tenant-singapore', name: 'APAC Regional Expansion', description: 'Logistics hub integration for APAC operations.' }
    ];

    for (const b of boards) {
      await prisma.board.create({ data: b });
    }

    // 7. Seed Columns
    console.log('  -> Seeding Columns...');
    const colStages = [
      { suffix: 'todo', title: 'TO DO', pos: 1000.0 },
      { suffix: 'prog', title: 'IN PROGRESS', pos: 2000.0 },
      { suffix: 'test', title: 'TESTING', pos: 3000.0 },
      { suffix: 'done', title: 'DONE', pos: 4000.0 }
    ];

    for (const b of boards) {
      for (const s of colStages) {
        await prisma.column.create({
          data: {
            id: `col-${b.id}-${s.suffix}`,
            board_id: b.id,
            tenant_id: b.tenant_id,
            title: s.title,
            position: s.pos
          }
        });
      }
    }

    // 8. Seed Realistic Enterprise Tasks (25 tasks)
    console.log('  -> Seeding Tasks...');
    const tasks = [
      // Website Development (Hyderabad)
      {
        id: 'task-web-1',
        column_id: 'col-board-web-dev-todo',
        board_id: 'board-web-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Design Responsive Design System Tokens',
        description: 'Define unified typography, light theme color palettes, and component states for the customer portal.',
        priority: 'HIGH',
        assignee_id: 'user-priya',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Design', 'UI/UX']),
        due_date: '2026-11-15'
      },
      {
        id: 'task-web-2',
        column_id: 'col-board-web-dev-todo',
        board_id: 'board-web-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Implement OAuth2 & SSO Authentication',
        description: 'Integrate Okta and Google Workspace SSO provider for enterprise single sign-on.',
        priority: 'URGENT',
        assignee_id: 'user-rahul',
        position: 2000.0,
        version: 1,
        tags: JSON.stringify(['Security', 'Auth']),
        due_date: '2026-11-12'
      },
      {
        id: 'task-web-3',
        column_id: 'col-board-web-dev-prog',
        board_id: 'board-web-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Optimize Web Vitals & Asset Bundling',
        description: 'Reduce LCP to <1.2s and eliminate render-blocking stylesheets across landing routes.',
        priority: 'MEDIUM',
        assignee_id: 'user-arjun',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Performance', 'Frontend']),
        due_date: '2026-11-18'
      },
      {
        id: 'task-web-4',
        column_id: 'col-board-web-dev-prog',
        board_id: 'board-web-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Build Multi-Tenant Tenant Switcher UI',
        description: 'Provide instant branch context switching with zero data leakage across organizations.',
        priority: 'HIGH',
        assignee_id: 'user-priya',
        position: 2000.0,
        version: 1,
        tags: JSON.stringify(['Tenancy', 'UI']),
        due_date: '2026-11-10'
      },
      {
        id: 'task-web-5',
        column_id: 'col-board-web-dev-test',
        board_id: 'board-web-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Cross-Browser End-to-End Regression Tests',
        description: 'Automated Playwright suite running across Chrome, Firefox, and Safari on desktop and mobile viewports.',
        priority: 'HIGH',
        assignee_id: 'user-arjun',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['QA', 'Automation']),
        due_date: '2026-11-08'
      },
      {
        id: 'task-web-6',
        column_id: 'col-board-web-dev-done',
        board_id: 'board-web-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Database Schema Migration to Neon PostgreSQL',
        description: 'Initialize PostgreSQL with foreign key cascade constraints, pooled connection, and tenant index benchmarks.',
        priority: 'LOW',
        assignee_id: 'user-rahul',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Database', 'Architecture']),
        due_date: '2026-11-01'
      },
      // Mobile App (Hyderabad)
      {
        id: 'task-mob-1',
        column_id: 'col-board-mobile-dev-todo',
        board_id: 'board-mobile-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Biometric FaceID & Fingerprint Authentication',
        description: 'Allow iOS TouchID/FaceID and Android Biometrics fallback for biometric quick-login.',
        priority: 'MEDIUM',
        assignee_id: 'user-priya',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Mobile', 'Security']),
        due_date: '2026-11-20'
      },
      {
        id: 'task-mob-2',
        column_id: 'col-board-mobile-dev-prog',
        board_id: 'board-mobile-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Offline Task Storage & SQLite Caching',
        description: 'Store task mutations in offline SQLite queue and reconcile when connectivity restores.',
        priority: 'HIGH',
        assignee_id: 'user-arjun',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Mobile', 'Offline']),
        due_date: '2026-11-14'
      },
      {
        id: 'task-mob-3',
        column_id: 'col-board-mobile-dev-done',
        board_id: 'board-mobile-dev',
        tenant_id: 'tenant-hyderabad',
        title: 'Push Notification Dispatch Pipeline',
        description: 'Integrate Firebase Cloud Messaging (FCM) and Apple APNS for real-time task notifications.',
        priority: 'MEDIUM',
        assignee_id: 'user-priya',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Mobile', 'Notifications']),
        due_date: '2026-11-04'
      },
      // AI Automation (Hyderabad)
      {
        id: 'task-ai-1',
        column_id: 'col-board-ai-auto-todo',
        board_id: 'board-ai-auto',
        tenant_id: 'tenant-hyderabad',
        title: 'Customer Sentiment Analysis Pipeline',
        description: 'Extract customer satisfaction scores and sentiment indicators from incoming customer support tickets.',
        priority: 'MEDIUM',
        assignee_id: 'user-arjun',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['AI', 'NLP']),
        due_date: '2026-11-25'
      },
      {
        id: 'task-ai-2',
        column_id: 'col-board-ai-auto-prog',
        board_id: 'board-ai-auto',
        tenant_id: 'tenant-hyderabad',
        title: 'Automated Task Summarizer LLM Agent',
        description: 'Auto-generate 2-sentence executive recaps from task activity logs and status changes.',
        priority: 'HIGH',
        assignee_id: 'user-rahul',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['AI', 'GenAI']),
        due_date: '2026-11-16'
      },
      // CRM Development (Bangalore)
      {
        id: 'task-crm-1',
        column_id: 'col-board-crm-dev-todo',
        board_id: 'board-crm-dev',
        tenant_id: 'tenant-bangalore',
        title: 'Salesforce & HubSpot Bi-Directional Sync',
        description: 'Sync pipeline opportunities and contacts every 15 minutes with conflict resolution.',
        priority: 'HIGH',
        assignee_id: 'user-sneha',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['CRM', 'Integration']),
        due_date: '2026-11-22'
      },
      {
        id: 'task-crm-2',
        column_id: 'col-board-crm-dev-prog',
        board_id: 'board-crm-dev',
        tenant_id: 'tenant-bangalore',
        title: 'Lead Enrichment via Clearbit API',
        description: 'Automatically populate company size, industry classification, and location on incoming inbound leads.',
        priority: 'MEDIUM',
        assignee_id: 'user-sneha',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['CRM', 'Data']),
        due_date: '2026-11-19'
      },
      {
        id: 'task-crm-3',
        column_id: 'col-board-crm-dev-test',
        board_id: 'board-crm-dev',
        tenant_id: 'tenant-bangalore',
        title: 'Export Deals to PDF & Excel Reports',
        description: 'Provide tabular export with column filters, date ranges, and deal status aggregates.',
        priority: 'LOW',
        assignee_id: 'user-arjun',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['CRM', 'Reports']),
        due_date: '2026-11-11'
      },
      // Cloud Migration (Bangalore)
      {
        id: 'task-cloud-1',
        column_id: 'col-board-cloud-mig-todo',
        board_id: 'board-cloud-mig',
        tenant_id: 'tenant-bangalore',
        title: 'Terraform Multi-AZ EKS Provisioning',
        description: 'Automate Kubernetes cluster creation across ap-south-1a and ap-south-1b availability zones.',
        priority: 'URGENT',
        assignee_id: 'user-sneha',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['DevOps', 'AWS']),
        due_date: '2026-11-13'
      },
      {
        id: 'task-cloud-2',
        column_id: 'col-board-cloud-mig-prog',
        board_id: 'board-cloud-mig',
        tenant_id: 'tenant-bangalore',
        title: 'Zero-Downtime Database Connection Migration',
        description: 'Switch connection pool from on-premise cluster to managed cloud database using read replicas.',
        priority: 'HIGH',
        assignee_id: 'user-sneha',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['DevOps', 'Database']),
        due_date: '2026-11-09'
      },
      // Security & Compliance (Chennai)
      {
        id: 'task-sec-1',
        column_id: 'col-board-sec-comp-todo',
        board_id: 'board-sec-comp',
        tenant_id: 'tenant-chennai',
        title: 'SOC2 Type II Evidence Collection Automation',
        description: 'Configure automated Vanta auditors for AWS IAM role policies and MFA enforcement.',
        priority: 'HIGH',
        assignee_id: 'user-rahul',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Security', 'SOC2']),
        due_date: '2026-11-28'
      },
      {
        id: 'task-sec-2',
        column_id: 'col-board-sec-comp-prog',
        board_id: 'board-sec-comp',
        tenant_id: 'tenant-chennai',
        title: 'Penetration Testing Remediation',
        description: 'Address CSRF token rotation and strict Content-Security-Policy headers in production headers.',
        priority: 'URGENT',
        assignee_id: 'user-rahul',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Security', 'AppSec']),
        due_date: '2026-11-07'
      },
      // Singapore Hub (Global Enterprise Corp) - Multi-Organization Isolation Target
      {
        id: 'task-sg-1',
        column_id: 'col-board-singapore-todo',
        board_id: 'board-singapore',
        tenant_id: 'tenant-singapore',
        title: 'APAC Supply Chain Route Optimization',
        description: 'Model container transit times from Jurong Port across ASEAN regional fulfillment centers.',
        priority: 'HIGH',
        assignee_id: 'user-david',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Logistics', 'APAC']),
        due_date: '2026-11-21'
      },
      {
        id: 'task-sg-2',
        column_id: 'col-board-singapore-prog',
        board_id: 'board-singapore',
        tenant_id: 'tenant-singapore',
        title: 'Customs Duty & Tariff Compliance Engine',
        description: 'Implement automated harmonized system (HS) code classification for cross-border freight.',
        priority: 'URGENT',
        assignee_id: 'user-david',
        position: 1000.0,
        version: 1,
        tags: JSON.stringify(['Customs', 'Compliance']),
        due_date: '2026-11-17'
      }
    ];

    for (const t of tasks) {
      await prisma.task.create({ data: t });
    }

    // 9. Seed Initial Activity Logs
    console.log('  -> Seeding Activity Logs...');
    const activityLogs = [
      {
        id: 'act-1',
        tenant_id: 'tenant-hyderabad',
        board_id: 'board-web-dev',
        user_id: 'user-rahul',
        action_type: 'TASK_CREATED',
        entity_type: 'TASK',
        entity_id: 'task-web-1',
        details: JSON.stringify({ title: 'Design Responsive Design System Tokens', column: 'TO DO' })
      },
      {
        id: 'act-2',
        tenant_id: 'tenant-hyderabad',
        board_id: 'board-web-dev',
        user_id: 'user-priya',
        action_type: 'TASK_MOVED',
        entity_type: 'TASK',
        entity_id: 'task-web-3',
        details: JSON.stringify({ from: 'TO DO', to: 'IN PROGRESS', title: 'Optimize Web Vitals & Asset Bundling' })
      },
      {
        id: 'act-3',
        tenant_id: 'tenant-bangalore',
        board_id: 'board-crm-dev',
        user_id: 'user-sneha',
        action_type: 'TASK_CREATED',
        entity_type: 'TASK',
        entity_id: 'task-crm-1',
        details: JSON.stringify({ title: 'Salesforce & HubSpot Bi-Directional Sync', column: 'TO DO' })
      }
    ];

    for (const act of activityLogs) {
      await prisma.activityLog.create({ data: act });
    }

    console.log('✅ WorkSphere Neon PostgreSQL database seeded successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  }
}

// Allow standalone execution: node src/db/seedPrisma.js
if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedDatabase };
