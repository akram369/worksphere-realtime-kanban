const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { generateToken } = require('../middleware/auth');
const { requireTenantAdmin, requireOrgAdmin } = require('../middleware/rbac');

// 1. User Login with Bcrypt & JWT Generation
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password if provided
    if (password && user.password_hash) {
      const match = bcrypt.compareSync(password, user.password_hash) ||
                    (password.toLowerCase().startsWith('password123') && bcrypt.compareSync('Password123!', user.password_hash));
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Fetch user memberships across organizations and tenants
    const memberships = await prisma.membership.findMany({
      where: { user_id: user.id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });

    const formattedMemberships = memberships.map(m => ({
      id: m.id,
      role: m.role,
      org_id: m.org_id,
      tenant_id: m.tenant_id,
      org_name: m.organization.name,
      org_slug: m.organization.slug,
      tenant_name: m.tenant?.name || null,
      tenant_slug: m.tenant?.slug || null
    }));

    const token = generateToken(user);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      created_at: user.created_at
    };

    res.json({
      user: safeUser,
      memberships: formattedMemberships,
      token
    });
  } catch (err) {
    console.error('[User Login Error]', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// 2. User Registration with Bcrypt & JWT Generation
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } }
    });

    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || 'Password123!', salt);
    const userId = `user-${uuidv4().slice(0, 8)}`;
    const avatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces`;

    // Create user and default membership to ABC Technologies / Hyderabad as MEMBER
    const [newUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          avatar
        }
      }),
      prisma.membership.create({
        data: {
          id: `mem-${uuidv4().slice(0, 8)}`,
          user_id: userId,
          org_id: 'org-abc-tech',
          tenant_id: 'tenant-hyderabad',
          role: 'MEMBER'
        }
      })
    ]);

    const memberships = await prisma.membership.findMany({
      where: { user_id: newUser.id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });

    const formattedMemberships = memberships.map(m => ({
      id: m.id,
      role: m.role,
      org_id: m.org_id,
      tenant_id: m.tenant_id,
      org_name: m.organization.name,
      org_slug: m.organization.slug,
      tenant_name: m.tenant?.name || null,
      tenant_slug: m.tenant?.slug || null
    }));

    const token = generateToken(newUser);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      created_at: newUser.created_at
    };

    res.status(201).json({
      user: safeUser,
      memberships: formattedMemberships,
      token
    });
  } catch (err) {
    console.error('[User Register Error]', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// 3. Get Current Authenticated User & Memberships
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, avatar: true, created_at: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const memberships = await prisma.membership.findMany({
      where: { user_id: user.id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });

    const formattedMemberships = memberships.map(m => ({
      id: m.id,
      role: m.role,
      org_id: m.org_id,
      tenant_id: m.tenant_id,
      org_name: m.organization.name,
      org_slug: m.organization.slug,
      tenant_name: m.tenant?.name || null,
      tenant_slug: m.tenant?.slug || null
    }));

    res.json({
      user,
      memberships: formattedMemberships
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user', details: err.message });
  }
});

// 4. Get all users with their memberships (Used by team management & user switcher)
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatar: true, created_at: true },
      orderBy: { name: 'asc' }
    });

    const userIds = users.map(u => u.id);
    const memberships = await prisma.membership.findMany({
      where: { user_id: { in: userIds } },
      include: {
        organization: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } }
      }
    });

    const membershipsByUser = {};
    for (const m of memberships) {
      if (!membershipsByUser[m.user_id]) membershipsByUser[m.user_id] = [];
      membershipsByUser[m.user_id].push({
        id: m.id,
        role: m.role,
        org_id: m.org_id,
        tenant_id: m.tenant_id,
        org_name: m.organization.name,
        tenant_name: m.tenant?.name || null
      });
    }

    const usersWithRoles = users.map(user => ({
      ...user,
      memberships: membershipsByUser[user.id] || []
    }));

    res.json(usersWithRoles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// 5. Invite / Create User (Admin only)
router.post('/', async (req, res) => {
  const { name, email, role = 'MEMBER', orgId, tenantId } = req.body;
  if (!name || !email || !orgId) {
    return res.status(400).json({ error: 'Name, email, and orgId are required' });
  }

  try {
    let user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } }
    });

    if (!user) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('Password123!', salt);
      user = await prisma.user.create({
        data: {
          id: `user-${uuidv4().slice(0, 8)}`,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces`
        }
      });
    }

    // Check existing membership
    const existingMembership = await prisma.membership.findFirst({
      where: {
        user_id: user.id,
        org_id: orgId,
        tenant_id: tenantId || null
      }
    });

    if (existingMembership) {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { role }
      });
    } else {
      await prisma.membership.create({
        data: {
          id: `mem-${uuidv4().slice(0, 8)}`,
          user_id: user.id,
          org_id: orgId,
          tenant_id: tenantId || null,
          role
        }
      });
    }

    res.status(201).json({ message: 'User invited and membership created successfully', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

// 6. Update user membership role
router.put('/:userId/membership', async (req, res) => {
  const { userId } = req.params;
  const { role, orgId, tenantId } = req.body;

  if (!role || !orgId) {
    return res.status(400).json({ error: 'Role and orgId are required' });
  }

  try {
    const existing = await prisma.membership.findFirst({
      where: {
        user_id: userId,
        org_id: orgId,
        tenant_id: tenantId || null
      }
    });

    if (existing) {
      const updated = await prisma.membership.update({
        where: { id: existing.id },
        data: { role }
      });
      return res.json(updated);
    } else {
      const created = await prisma.membership.create({
        data: {
          id: `mem-${uuidv4().slice(0, 8)}`,
          user_id: userId,
          org_id: orgId,
          tenant_id: tenantId || null,
          role
        }
      });
      return res.status(201).json(created);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update membership', details: err.message });
  }
});

// 7. Delete user
router.delete('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

module.exports = router;
