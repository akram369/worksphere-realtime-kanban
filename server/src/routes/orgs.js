const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');

// List all organizations
router.get('/', async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            tenants: true,
            memberships: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = orgs.map(o => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      created_at: o.created_at,
      tenant_count: o._count.tenants,
      user_count: o._count.memberships
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch organizations', details: err.message });
  }
});

// Create new organization
router.post('/', async (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const orgId = `org-${uuidv4().slice(0, 8)}`;
  try {
    const [created] = await prisma.$transaction([
      prisma.organization.create({
        data: {
          id: orgId,
          name: name.trim(),
          slug: slug.toLowerCase().trim()
        }
      }),
      prisma.membership.create({
        data: {
          id: `mem-${uuidv4().slice(0, 8)}`,
          user_id: req.user.id,
          org_id: orgId,
          tenant_id: null,
          role: 'ORG_ADMIN'
        }
      })
    ]);

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update organization
router.put('/:orgId', async (req, res) => {
  const { orgId } = req.params;
  const { name, slug } = req.body;

  try {
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(slug ? { slug: slug.toLowerCase().trim() } : {})
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete organization
router.delete('/:orgId', async (req, res) => {
  const { orgId } = req.params;
  try {
    await prisma.organization.delete({ where: { id: orgId } });
    res.json({ success: true, orgId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List tenants (branches) for an organization
router.get('/:orgId/tenants', async (req, res) => {
  const { orgId } = req.params;
  try {
    const tenants = await prisma.tenant.findMany({
      where: { org_id: orgId },
      include: {
        _count: {
          select: {
            boards: true,
            tasks: true,
            memberships: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = tenants.map(t => ({
      id: t.id,
      org_id: t.org_id,
      name: t.name,
      slug: t.slug,
      created_at: t.created_at,
      board_count: t._count.boards,
      task_count: t._count.tasks,
      user_count: t._count.memberships
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tenants', details: err.message });
  }
});

// Create a new tenant/branch
router.post('/:orgId/tenants', async (req, res) => {
  const { orgId } = req.params;
  const { name, slug } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Tenant name and slug are required' });
  }

  const tenantId = `tenant-${uuidv4().slice(0, 8)}`;
  const defaultBoardId = `board-${uuidv4().slice(0, 8)}`;

  try {
    const newTenant = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          id: tenantId,
          org_id: orgId,
          name: name.trim(),
          slug: slug.toLowerCase().trim()
        }
      });

      await tx.board.create({
        data: {
          id: defaultBoardId,
          tenant_id: tenantId,
          name: 'General Operations',
          description: 'Default branch project board'
        }
      });

      const colStages = [
        { suffix: '1', title: 'TO DO', pos: 1000.0 },
        { suffix: '2', title: 'IN PROGRESS', pos: 2000.0 },
        { suffix: '3', title: 'TESTING', pos: 3000.0 },
        { suffix: '4', title: 'DONE', pos: 4000.0 }
      ];

      for (const stage of colStages) {
        await tx.column.create({
          data: {
            id: `col-${defaultBoardId}-${stage.suffix}`,
            board_id: defaultBoardId,
            tenant_id: tenantId,
            title: stage.title,
            position: stage.pos
          }
        });
      }

      return tenant;
    });

    res.status(201).json(newTenant);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update tenant/branch
router.put('/:orgId/tenants/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { name, slug } = req.body;

  try {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(slug ? { slug: slug.toLowerCase().trim() } : {})
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete tenant/branch
router.delete('/:orgId/tenants/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  try {
    await prisma.tenant.delete({ where: { id: tenantId } });
    res.json({ success: true, tenantId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
