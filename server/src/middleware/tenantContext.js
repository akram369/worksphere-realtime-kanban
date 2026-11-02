const { prisma } = require('../db/prisma');

/**
 * Tenant Context & Strict Isolation Middleware
 * 
 * Enforces server-side verification:
 * 1. User identity is derived strictly from the verified JWT (req.user).
 * 2. Resolves requested tenantId and verifies the tenant exists in PostgreSQL.
 * 3. Enforces that the user has an active membership authorizing access to this tenant:
 *    - An ORG_ADMIN of the tenant's parent organization has authorized access across all its branches.
 *    - A TENANT_ADMIN or MEMBER assigned explicitly to this tenant has access.
 *    - Any other user or cross-organization caller is immediately blocked with HTTP 403 Forbidden.
 */
async function tenantContextMiddleware(req, res, next) {
  let tenantId = req.headers['x-tenant-id'] || 
                 req.params.tenantId || 
                 req.query.tenantId || 
                 req.body?.tenantId;

  // Infer tenantId from boardId if not explicitly provided
  const boardId = req.params.boardId || req.body?.boardId || req.query.boardId;
  if (!tenantId && boardId) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { tenant_id: true }
    });
    if (board) {
      tenantId = board.tenant_id;
    }
  }

  // Infer tenantId from taskId if not explicitly provided
  const taskId = req.params.taskId || req.body?.taskId;
  if (!tenantId && taskId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { tenant_id: true }
    });
    if (task) {
      tenantId = task.tenant_id;
    }
  }

  if (!tenantId) {
    return res.status(400).json({
      error: 'Missing Tenant Context: tenantId must be provided in header, parameter, or inferred from entity'
    });
  }

  try {
    // 1. Verify tenant exists in PostgreSQL and fetch its parent organization
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        tenantId
      });
    }

    // 2. Strict RBAC & Data Isolation Check in PostgreSQL
    const membership = await prisma.membership.findFirst({
      where: {
        user_id: req.user.id,
        org_id: tenant.org_id,
        OR: [
          { tenant_id: tenant.id },
          { tenant_id: null, role: 'ORG_ADMIN' }
        ]
      },
      orderBy: {
        role: 'asc' // ORG_ADMIN comes first
      }
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access Denied: Cross-tenant / cross-organization boundary violation',
        reason: `User ${req.user.email} (${req.user.id}) is not authorized for tenant ${tenant.name} (${tenant.id})`,
        tenantId: tenant.id,
        userId: req.user.id
      });
    }

    // Attach verified tenant context and role to request
    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.userRole = membership.role;
    req.membership = membership;

    next();
  } catch (err) {
    console.error('[TenantContext] Error verifying tenant context:', err);
    res.status(500).json({
      error: 'Internal Server Error during tenant authorization verification',
      details: err.message
    });
  }
}

module.exports = { tenantContextMiddleware };
