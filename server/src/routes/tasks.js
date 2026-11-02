const express = require('express');
const router = express.Router();
const { tenantContextMiddleware } = require('../middleware/tenantContext');
const { requireMember } = require('../middleware/rbac');
const { KanbanService } = require('../services/kanbanService');
const { prisma } = require('../db/prisma');

router.use(tenantContextMiddleware);

// 1. Overview Dashboard Statistics (Strictly Scoped by Verified Tenant)
router.get('/overview-stats', requireMember, async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const [totalProjects, totalTasks, inProgress, completed, overdueTasks] = await Promise.all([
      prisma.board.count({ where: { tenant_id: tenantId } }),
      prisma.task.count({ where: { tenant_id: tenantId } }),
      prisma.task.count({
        where: {
          tenant_id: tenantId,
          column: { title: { contains: 'PROGRESS', mode: 'insensitive' } }
        }
      }),
      prisma.task.count({
        where: {
          tenant_id: tenantId,
          column: { title: { contains: 'DONE', mode: 'insensitive' } }
        }
      }),
      prisma.task.count({
        where: {
          tenant_id: tenantId,
          due_date: { not: null, lt: todayStr },
          NOT: {
            column: { title: { contains: 'DONE', mode: 'insensitive' } }
          }
        }
      })
    ]);

    // My assigned tasks in this tenant
    const myTasksRaw = await prisma.task.findMany({
      where: { tenant_id: tenantId, assignee_id: userId },
      include: {
        board: { select: { name: true } },
        column: { select: { title: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 6
    });

    const myAssignedTasks = myTasksRaw.map(t => ({
      ...t,
      project_name: t.board?.name || null,
      status_name: t.column?.title || null
    }));

    // Upcoming deadlines in this tenant
    const deadlinesRaw = await prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        due_date: { not: null },
        NOT: {
          column: { title: { contains: 'DONE', mode: 'insensitive' } }
        }
      },
      include: {
        board: { select: { name: true } },
        column: { select: { title: true } }
      },
      orderBy: { due_date: 'asc' },
      take: 5
    });

    const upcomingDeadlines = deadlinesRaw.map(t => ({
      ...t,
      project_name: t.board?.name || null,
      status_name: t.column?.title || null
    }));

    // Project progress breakdown
    const boards = await prisma.board.findMany({
      where: { tenant_id: tenantId },
      include: {
        tasks: {
          include: { column: { select: { title: true } } }
        }
      }
    });

    const projectProgress = boards.map(b => {
      const total = b.tasks.length;
      const completedCount = b.tasks.filter(t => t.column?.title?.toUpperCase().includes('DONE')).length;
      return {
        id: b.id,
        name: b.name,
        total,
        completed: completedCount,
        percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0
      };
    });

    // Team availability
    const memberships = await prisma.membership.findMany({
      where: {
        OR: [
          { tenant_id: tenantId },
          { org_id: req.tenant.org_id, role: 'ORG_ADMIN' }
        ]
      },
      include: {
        user: {
          include: {
            assigned_tasks: {
              where: { tenant_id: tenantId }
            }
          }
        }
      }
    });

    const teamAvailability = memberships.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role,
      active_tasks: m.user.assigned_tasks.length
    }));

    res.json({
      summary: {
        totalProjects,
        totalTasks,
        inProgress,
        completed,
        overdueTasks
      },
      myAssignedTasks,
      upcomingDeadlines,
      projectProgress,
      teamAvailability
    });
  } catch (err) {
    console.error('[Tasks Stats Error]', err);
    res.status(500).json({ error: 'Failed to fetch overview stats', details: err.message });
  }
});

// 2. My Tasks Full Listing with Filters
router.get('/my-tasks', requireMember, async (req, res) => {
  const { filter, priority, search, sortBy } = req.query;
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const where = { tenant_id: tenantId };

    if (filter === 'todo') {
      where.column = { title: { contains: 'TO DO', mode: 'insensitive' } };
    } else if (filter === 'in_progress') {
      where.column = { title: { contains: 'PROGRESS', mode: 'insensitive' } };
    } else if (filter === 'completed') {
      where.column = { title: { contains: 'DONE', mode: 'insensitive' } };
    } else if (filter === 'overdue') {
      where.due_date = { not: null, lt: todayStr };
      where.NOT = { column: { title: { contains: 'DONE', mode: 'insensitive' } } };
    } else if (filter === 'my_assigned') {
      where.assignee_id = userId;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    let orderBy = [{ created_at: 'desc' }];
    if (sortBy === 'priority') {
      orderBy = [{ priority: 'asc' }];
    } else if (sortBy === 'title') {
      orderBy = [{ title: 'asc' }];
    } else if (sortBy === 'due_date') {
      orderBy = [{ due_date: 'asc' }];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        board: { select: { name: true } },
        column: { select: { title: true } },
        assignee: { select: { name: true, avatar: true } }
      },
      orderBy
    });

    const formatted = tasks.map(t => {
      let tags = [];
      try {
        tags = t.tags ? JSON.parse(t.tags) : [];
      } catch (e) {
        tags = [];
      }
      return {
        ...t,
        project_name: t.board?.name || null,
        status: t.column?.title || null,
        assignee_name: t.assignee?.name || null,
        assignee_avatar: t.assignee?.avatar || null,
        tags
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('[My Tasks Error]', err);
    res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
  }
});

// 3. Create Task
router.post('/', requireMember, async (req, res) => {
  const { boardId, columnId, title, description, priority, assigneeId, tags, dueDate, targetPosition } = req.body;

  if (!boardId || !columnId || !title || !title.trim()) {
    return res.status(400).json({ error: 'boardId, columnId, and title are required' });
  }

  try {
    const task = await KanbanService.createTask({
      tenantId: req.tenantId,
      boardId,
      columnId,
      title: title.trim(),
      description,
      priority,
      assigneeId,
      tags,
      dueDate,
      userId: req.user.id,
      targetPosition
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Update Task with Optimistic Concurrency Control (OCC)
router.put('/:taskId', requireMember, async (req, res) => {
  const { taskId } = req.params;
  const { expectedVersion, ...updates } = req.body;

  try {
    const result = await KanbanService.updateTask({
      taskId,
      tenantId: req.tenantId,
      expectedVersion,
      updates,
      userId: req.user.id
    });

    if (result.conflict) {
      return res.status(409).json(result);
    }

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    res.json(result.task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
});

// 5. Move Task (Transactional Drag & Drop Position and Column Update)
router.post('/:taskId/move', requireMember, async (req, res) => {
  const { taskId } = req.params;
  const { targetColumnId, prevPos, nextPos, expectedVersion } = req.body;

  if (!targetColumnId) {
    return res.status(400).json({ error: 'targetColumnId is required' });
  }

  try {
    const result = await KanbanService.moveTask({
      taskId,
      tenantId: req.tenantId,
      targetColumnId,
      prevPos,
      nextPos,
      userId: req.user.id,
      expectedVersion
    });

    if (result.conflict) {
      return res.status(409).json(result);
    }

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    res.json(result.task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to move task', details: err.message });
  }
});

// 6. Delete Task
router.delete('/:taskId', requireMember, async (req, res) => {
  const { taskId } = req.params;

  try {
    const result = await KanbanService.deleteTask({
      taskId,
      tenantId: req.tenantId,
      userId: req.user.id
    });

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task', details: err.message });
  }
});

module.exports = router;
