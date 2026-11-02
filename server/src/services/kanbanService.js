const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { FractionalIndexService } = require('./fractionalIndexService');
const { ActivityLogService } = require('./activityLogService');
const { realtimeServer } = require('../websocket/socketServer');

class KanbanService {
  /**
   * Fetch complete board data (columns + tasks) strictly scoped by tenant
   */
  static async getBoardWithHierarchy(boardId, tenantId) {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        tenant_id: tenantId
      },
      include: {
        tenant: {
          include: {
            organization: true
          }
        },
        columns: {
          where: { tenant_id: tenantId },
          orderBy: { position: 'asc' }
        },
        tasks: {
          where: { tenant_id: tenantId },
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!board) return null;

    const parsedTasks = board.tasks.map(t => {
      let tags = [];
      try {
        tags = t.tags ? JSON.parse(t.tags) : [];
      } catch (e) {
        tags = [];
      }
      return {
        ...t,
        assignee_name: t.assignee?.name || null,
        assignee_email: t.assignee?.email || null,
        assignee_avatar: t.assignee?.avatar || null,
        tags
      };
    });

    // Group tasks under columns
    const columnsWithTasks = board.columns.map(col => ({
      ...col,
      tasks: parsedTasks.filter(t => t.column_id === col.id)
    }));

    return {
      id: board.id,
      tenant_id: board.tenant_id,
      name: board.name,
      description: board.description,
      created_at: board.created_at,
      updated_at: board.updated_at,
      tenant_name: board.tenant.name,
      org_name: board.tenant.organization.name,
      columns: columnsWithTasks
    };
  }

  /**
   * List all boards in tenant
   */
  static async listBoards(tenantId) {
    const boards = await prisma.board.findMany({
      where: { tenant_id: tenantId },
      include: {
        _count: {
          select: {
            tasks: true,
            columns: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return boards.map(b => ({
      ...b,
      task_count: b._count.tasks,
      column_count: b._count.columns
    }));
  }

  /**
   * Create a new board with default workflow columns
   */
  static async createBoard({ tenantId, name, description, userId }) {
    const boardId = `board-${uuidv4().slice(0, 8)}`;

    const newBoard = await prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          id: boardId,
          tenant_id: tenantId,
          name,
          description: description || ''
        }
      });

      const defaultCols = [
        { suffix: 'backlog', title: 'Backlog', pos: 1000.0 },
        { suffix: 'prog', title: 'In Progress', pos: 2000.0 },
        { suffix: 'review', title: 'In Review', pos: 3000.0 },
        { suffix: 'done', title: 'Done', pos: 4000.0 }
      ];

      for (const col of defaultCols) {
        await tx.column.create({
          data: {
            id: `col-${uuidv4().slice(0, 8)}`,
            board_id: boardId,
            tenant_id: tenantId,
            title: col.title,
            position: col.pos
          }
        });
      }

      return board;
    });

    await ActivityLogService.log({
      tenantId,
      boardId,
      userId,
      actionType: 'BOARD_CREATED',
      entityType: 'BOARD',
      entityId: boardId,
      details: { name, description }
    });

    return KanbanService.getBoardWithHierarchy(boardId, tenantId);
  }

  /**
   * Get single task with joined details
   */
  static async getTaskById(taskId, tenantId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        tenant_id: tenantId
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        column: {
          select: { id: true, title: true }
        }
      }
    });

    if (!task) return null;

    let tags = [];
    try {
      tags = task.tags ? JSON.parse(task.tags) : [];
    } catch (e) {
      tags = [];
    }

    return {
      ...task,
      assignee_name: task.assignee?.name || null,
      assignee_email: task.assignee?.email || null,
      assignee_avatar: task.assignee?.avatar || null,
      column_title: task.column?.title || null,
      tags
    };
  }

  /**
   * Create a new task with fractional indexing
   */
  static async createTask({ tenantId, boardId, columnId, title, description, priority, assigneeId, tags, dueDate, userId, targetPosition }) {
    const taskId = `task-${uuidv4().slice(0, 8)}`;

    let position = targetPosition;
    if (position === undefined || position === null) {
      const lastTask = await prisma.task.findFirst({
        where: { column_id: columnId, tenant_id: tenantId },
        orderBy: { position: 'desc' },
        select: { position: true }
      });

      position = (lastTask && lastTask.position !== null) ? lastTask.position + 1000.0 : 1000.0;
    }

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]');
    const prio = priority || 'MEDIUM';

    await prisma.task.create({
      data: {
        id: taskId,
        column_id: columnId,
        board_id: boardId,
        tenant_id: tenantId,
        title,
        description: description || '',
        priority: prio,
        assignee_id: assigneeId || null,
        position,
        version: 1,
        tags: tagsJson,
        due_date: dueDate || null
      }
    });

    const createdTask = await KanbanService.getTaskById(taskId, tenantId);

    await ActivityLogService.log({
      tenantId,
      boardId,
      userId,
      actionType: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: taskId,
      details: { title, priority: prio, columnId }
    });

    realtimeServer.broadcastToTenant(tenantId, 'TASK_CREATED', createdTask);

    return createdTask;
  }

  /**
   * Update task with Optimistic Concurrency Control (OCC)
   */
  static async updateTask({ taskId, tenantId, expectedVersion, updates, userId }) {
    const currentTask = await KanbanService.getTaskById(taskId, tenantId);
    if (!currentTask) {
      return { error: 'Task not found or does not belong to this tenant', status: 404 };
    }

    // OCC Check: Mid-air collision detection
    if (expectedVersion !== undefined && expectedVersion !== null) {
      if (currentTask.version !== parseInt(expectedVersion, 10)) {
        return {
          conflict: true,
          status: 409,
          currentTask,
          expectedVersion: parseInt(expectedVersion, 10),
          message: `Concurrency Conflict: Task was modified by another user (Server: v${currentTask.version}, Client: v${expectedVersion})`
        };
      }
    }

    const title = updates.title !== undefined ? updates.title : currentTask.title;
    const description = updates.description !== undefined ? updates.description : currentTask.description;
    const priority = updates.priority !== undefined ? updates.priority : currentTask.priority;
    const assigneeId = updates.assigneeId !== undefined ? updates.assigneeId : currentTask.assignee_id;
    const dueDate = updates.dueDate !== undefined ? updates.dueDate : currentTask.due_date;
    const tagsJson = updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(currentTask.tags);
    const newVersion = currentTask.version + 1;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        priority,
        assignee_id: assigneeId || null,
        tags: tagsJson,
        due_date: dueDate || null,
        version: newVersion
      }
    });

    const updatedTask = await KanbanService.getTaskById(taskId, tenantId);

    await ActivityLogService.log({
      tenantId,
      boardId: currentTask.board_id,
      userId,
      actionType: 'TASK_UPDATED',
      entityType: 'TASK',
      entityId: taskId,
      details: {
        title,
        priority,
        version: newVersion,
        previousVersion: currentTask.version
      }
    });

    realtimeServer.broadcastToTenant(tenantId, 'TASK_UPDATED', updatedTask);

    return { task: updatedTask, status: 200 };
  }

  /**
   * Move task (transactional drag & drop reordering)
   * Supports changing column and fractional position
   */
  static async moveTask({ taskId, tenantId, targetColumnId, prevPos, nextPos, userId, expectedVersion }) {
    const currentTask = await KanbanService.getTaskById(taskId, tenantId);
    if (!currentTask) {
      return { error: 'Task not found or access denied', status: 404 };
    }

    // Verify target column belongs to same tenant
    const targetColumn = await prisma.column.findFirst({
      where: { id: targetColumnId, tenant_id: tenantId }
    });

    if (!targetColumn) {
      return { error: 'Target column not found in this tenant', status: 400 };
    }

    // Concurrency version check if provided
    if (expectedVersion !== undefined && expectedVersion !== null) {
      if (currentTask.version !== parseInt(expectedVersion, 10)) {
        return {
          conflict: true,
          status: 409,
          currentTask,
          expectedVersion: parseInt(expectedVersion, 10),
          message: `Concurrency Conflict: Task state changed prior to move (Server: v${currentTask.version}, Client: v${expectedVersion})`
        };
      }
    }

    const newPosition = FractionalIndexService.calculatePosition(prevPos, nextPos);
    const needsRebalance = FractionalIndexService.needsRebalance(prevPos, nextPos);
    const newVersion = currentTask.version + 1;

    // Execute in atomic PostgreSQL transaction
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          column_id: targetColumnId,
          position: newPosition,
          version: newVersion
        }
      });
    });

    if (needsRebalance) {
      await FractionalIndexService.rebalanceColumn(targetColumnId);
    }

    const movedTask = await KanbanService.getTaskById(taskId, tenantId);

    await ActivityLogService.log({
      tenantId,
      boardId: currentTask.board_id,
      userId,
      actionType: 'TASK_MOVED',
      entityType: 'TASK',
      entityId: taskId,
      details: {
        taskTitle: currentTask.title,
        fromColumn: currentTask.column_title,
        toColumn: targetColumn.title,
        fromColumnId: currentTask.column_id,
        toColumnId: targetColumnId,
        newPosition,
        version: newVersion
      }
    });

    const movePayload = {
      task: movedTask,
      fromColumnId: currentTask.column_id,
      toColumnId: targetColumnId,
      newPosition
    };

    realtimeServer.broadcastToTenant(tenantId, 'TASK_MOVED', movePayload);

    return { task: movedTask, status: 200 };
  }

  /**
   * Delete task
   */
  static async deleteTask({ taskId, tenantId, userId }) {
    const currentTask = await KanbanService.getTaskById(taskId, tenantId);
    if (!currentTask) {
      return { error: 'Task not found or access denied', status: 404 };
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    await ActivityLogService.log({
      tenantId,
      boardId: currentTask.board_id,
      userId,
      actionType: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: taskId,
      details: { title: currentTask.title, columnId: currentTask.column_id }
    });

    realtimeServer.broadcastToTenant(tenantId, 'TASK_DELETED', {
      taskId,
      boardId: currentTask.board_id,
      columnId: currentTask.column_id,
      deletedTask: currentTask
    });

    return { success: true, deletedTask: currentTask };
  }

  /**
   * Column operations
   */
  static async createColumn({ tenantId, boardId, title, userId }) {
    const colId = `col-${uuidv4().slice(0, 8)}`;
    const lastCol = await prisma.column.findFirst({
      where: { board_id: boardId, tenant_id: tenantId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const position = (lastCol && lastCol.position !== null) ? lastCol.position + 1000.0 : 1000.0;

    const newCol = await prisma.column.create({
      data: {
        id: colId,
        board_id: boardId,
        tenant_id: tenantId,
        title,
        position
      }
    });

    await ActivityLogService.log({
      tenantId,
      boardId,
      userId,
      actionType: 'COLUMN_CREATED',
      entityType: 'COLUMN',
      entityId: colId,
      details: { title }
    });

    realtimeServer.broadcastToTenant(tenantId, 'COLUMN_CREATED', { ...newCol, tasks: [] });

    return { ...newCol, tasks: [] };
  }

  static async updateColumn({ columnId, tenantId, title, userId }) {
    const col = await prisma.column.findFirst({
      where: { id: columnId, tenant_id: tenantId }
    });
    if (!col) return null;

    const updated = await prisma.column.update({
      where: { id: columnId },
      data: { title }
    });

    realtimeServer.broadcastToTenant(tenantId, 'COLUMN_UPDATED', updated);

    return updated;
  }

  static async deleteColumn({ columnId, tenantId, userId }) {
    const col = await prisma.column.findFirst({
      where: { id: columnId, tenant_id: tenantId }
    });
    if (!col) return null;

    await prisma.column.delete({
      where: { id: columnId }
    });

    await ActivityLogService.log({
      tenantId,
      boardId: col.board_id,
      userId,
      actionType: 'COLUMN_DELETED',
      entityType: 'COLUMN',
      entityId: columnId,
      details: { title: col.title }
    });

    realtimeServer.broadcastToTenant(tenantId, 'COLUMN_DELETED', {
      columnId,
      boardId: col.board_id
    });

    return col;
  }
}

module.exports = { KanbanService };
