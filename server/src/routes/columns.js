const express = require('express');
const router = express.Router();
const { tenantContextMiddleware } = require('../middleware/tenantContext');
const { requireTenantAdmin } = require('../middleware/rbac');
const { KanbanService } = require('../services/kanbanService');

router.use(tenantContextMiddleware);

// Create column (Tenant Admin or Org Admin)
router.post('/', requireTenantAdmin, async (req, res) => {
  const { boardId, title } = req.body;
  if (!boardId || !title || !title.trim()) {
    return res.status(400).json({ error: 'boardId and title are required' });
  }

  try {
    const column = await KanbanService.createColumn({
      tenantId: req.tenantId,
      boardId,
      title: title.trim(),
      userId: req.user.id
    });

    res.status(201).json(column);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create column', details: err.message });
  }
});

// Update column title
router.put('/:columnId', requireTenantAdmin, async (req, res) => {
  const { columnId } = req.params;
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }

  try {
    const column = await KanbanService.updateColumn({
      columnId,
      tenantId: req.tenantId,
      title: title.trim(),
      userId: req.user.id
    });

    if (!column) {
      return res.status(404).json({ error: 'Column not found or unauthorized' });
    }

    res.json(column);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update column', details: err.message });
  }
});

// Delete column
router.delete('/:columnId', requireTenantAdmin, async (req, res) => {
  const { columnId } = req.params;

  try {
    const column = await KanbanService.deleteColumn({
      columnId,
      tenantId: req.tenantId,
      userId: req.user.id
    });

    if (!column) {
      return res.status(404).json({ error: 'Column not found or unauthorized' });
    }

    res.json({ success: true, deletedColumn: column });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete column', details: err.message });
  }
});

module.exports = router;
