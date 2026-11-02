const express = require('express');
const router = express.Router();
const { prisma } = require('../db/prisma');
const { tenantContextMiddleware } = require('../middleware/tenantContext');

// Get tenant details & members (requires verified tenant context)
router.get('/:tenantId', tenantContextMiddleware, async (req, res) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: {
        OR: [
          { tenant_id: req.tenant.id },
          { org_id: req.tenant.org_id, role: 'ORG_ADMIN' }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: {
        role: 'asc'
      }
    });

    const members = memberships.map(m => ({
      membership_id: m.id,
      role: m.role,
      joined_at: m.created_at,
      user_id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar
    }));

    res.json({
      tenant: req.tenant,
      currentRole: req.userRole,
      members
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tenant details', details: err.message });
  }
});

module.exports = router;
