const express = require('express');
const router = express.Router();
const { tenantContextMiddleware } = require('../middleware/tenantContext');
const { requireTenantAdmin, requireMember } = require('../middleware/rbac');
const { KanbanService } = require('../services/kanbanService');

// All board operations require active tenant context and valid membership
router.use(tenantContextMiddleware);

// List all boards in tenant
router.get('/', requireMember, async (req, res) => {
  try {
    const boards = await KanbanService.listBoards(req.tenantId);
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list boards', details: err.message });
  }
});

// Create board in tenant (Requires TENANT_ADMIN or ORG_ADMIN)
router.post('/', requireTenantAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Board name is required' });
  }

  try {
    const board = await KanbanService.createBoard({
      tenantId: req.tenantId,
      name: name.trim(),
      description,
      userId: req.user.id
    });

    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create board', details: err.message });
  }
});

// Get board hierarchy (columns + tasks)
router.get('/:boardId', requireMember, async (req, res) => {
  const { boardId } = req.params;
  try {
    const board = await KanbanService.getBoardWithHierarchy(boardId, req.tenantId);

    if (!board) {
      return res.status(404).json({
        error: 'Board not found or does not belong to this tenant',
        boardId,
        tenantId: req.tenantId
      });
    }

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get board', details: err.message });
  }
});

module.exports = router;
