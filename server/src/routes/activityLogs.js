const express = require('express');
const router = express.Router();
const { tenantContextMiddleware } = require('../middleware/tenantContext');
const { requireMember } = require('../middleware/rbac');
const { ActivityLogService } = require('../services/activityLogService');

router.use(tenantContextMiddleware);

// Get activity logs for current tenant
router.get('/', requireMember, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  try {
    const logs = await ActivityLogService.getTenantLogs(req.tenantId, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs', details: err.message });
  }
});

module.exports = router;
