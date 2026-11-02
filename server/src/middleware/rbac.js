/**
 * Role-Based Access Control (RBAC) Guards
 * 
 * Hierarchy:
 * ORG_ADMIN > TENANT_ADMIN > MEMBER
 */

function requireOrgAdmin(req, res, next) {
  if (req.userRole !== 'ORG_ADMIN') {
    return res.status(403).json({
      error: 'Permission Denied: Requires ORG_ADMIN role',
      currentRole: req.userRole
    });
  }
  next();
}

function requireTenantAdmin(req, res, next) {
  if (!['ORG_ADMIN', 'TENANT_ADMIN'].includes(req.userRole)) {
    return res.status(403).json({
      error: 'Permission Denied: Requires TENANT_ADMIN or higher role',
      currentRole: req.userRole
    });
  }
  next();
}

function requireMember(req, res, next) {
  if (!['ORG_ADMIN', 'TENANT_ADMIN', 'MEMBER'].includes(req.userRole)) {
    return res.status(403).json({
      error: 'Permission Denied: Requires active membership',
      currentRole: req.userRole
    });
  }
  next();
}

module.exports = {
  requireOrgAdmin,
  requireTenantAdmin,
  requireMember
};
