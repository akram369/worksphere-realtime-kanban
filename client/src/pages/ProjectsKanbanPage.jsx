import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Kanban,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';

export function ProjectsKanbanPage() {
  const {
    boards,
    currentBoard,
    setCurrentBoard,
    boardData,
    setBoardData,
    currentTenant,
    userRole,
    addToast,
    pushUndoAction,
    setActiveDrawerTask,
    setIsCreateTaskModalOpen,
    setCreateTaskColumnId,
    setIsCreateBoardModalOpen,
    onlineUsers,
    currentUser
  } = useApp();

  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const canManageBoard = ['ORG_ADMIN', 'TENANT_ADMIN'].includes(userRole);

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDragOverColId(columnId);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColId(null);
    }
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColId(null);
    if (!draggedTask || !boardData) return;

    // Snapshot original state for rollback
    const previousBoardData = JSON.parse(JSON.stringify(boardData));
    const originalColumnId = draggedTask.column_id;
    const targetColumn = boardData.columns.find(c => c.id === targetColumnId);
    if (!targetColumn) return;

    // Calculate fractional position
    const siblingTasks = targetColumn.tasks.filter(t => t.id !== draggedTask.id);
    let prevPos = null;
    let nextPos = null;

    if (siblingTasks.length > 0) {
      prevPos = siblingTasks[siblingTasks.length - 1].position;
      nextPos = null;
    }

    // 1. Optimistic Local Update
    const updatedBoardData = {
      ...boardData,
      columns: boardData.columns.map(col => {
        if (col.id === originalColumnId && originalColumnId !== targetColumnId) {
          return { ...col, tasks: col.tasks.filter(t => t.id !== draggedTask.id) };
        }
        if (col.id === targetColumnId) {
          const filtered = col.tasks.filter(t => t.id !== draggedTask.id);
          const moving = { ...draggedTask, column_id: targetColumnId };
          return { ...col, tasks: [...filtered, moving] };
        }
        return col;
      })
    };

    setBoardData(updatedBoardData);

    // 2. Dispatch to server
    try {
      await api.moveTask(draggedTask.id, {
        targetColumnId,
        prevPos,
        nextPos
      });

      // Register undo action
      pushUndoAction({
        description: `Move "${draggedTask.title}" back to ${previousBoardData.columns.find(c => c.id === originalColumnId)?.title}`,
        undo: async () => {
          await api.moveTask(draggedTask.id, {
            targetColumnId: originalColumnId,
            prevPos: null,
            nextPos: null
          });
          setBoardData(previousBoardData);
        },
        redo: async () => {
          await api.moveTask(draggedTask.id, {
            targetColumnId,
            prevPos,
            nextPos
          });
          setBoardData(updatedBoardData);
        }
      });
    } catch (err) {
      console.error('Task move error:', err);
      setBoardData(previousBoardData);
      addToast(`Move failed: ${err.message}`, 'conflict');
    } finally {
      setDraggedTask(null);
    }
  };

  if (!boardData) {
    return (
      <div className="page-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {boards.length === 0 ? 'No projects exist in this branch. Create one above!' : 'Loading project board...'}
        </div>
      </div>
    );
  }

  // Filter tasks in columns
  const getFilteredTasks = (tasks) => {
    return tasks.filter(t => {
      const matchPrio = filterPriority === 'ALL' || t.priority === filterPriority;
      const matchSearch = !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchPrio && matchSearch;
    });
  };

  return (
    <div className="page-container" style={{ paddingBottom: '32px' }}>
      {/* Board Header Card */}
      <div className="kanban-board-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Project Switcher Dropdown */}
            <select
              value={currentBoard?.id || ''}
              onChange={(e) => {
                const b = boards.find(x => x.id === e.target.value);
                if (b) setCurrentBoard(b);
              }}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {boards.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <span className="badge badge-gray">{currentTenant?.name}</span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '640px' }}>
            {currentBoard?.description || 'Active project board workflow.'}
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Quick Filter */}
          <select
            className="form-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent (P0)</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Quick Search */}
          <div className="global-search-box" style={{ width: '180px' }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input-field"
              placeholder="Filter cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Add Task Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setCreateTaskColumnId(boardData.columns[0]?.id || null);
              setIsCreateTaskModalOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Add Task</span>
          </button>

          {canManageBoard && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCreateBoardModalOpen(true)}
              title="Create new project board"
            >
              <Plus size={14} />
              <span>New Board</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="kanban-board-columns">
        {boardData.columns.map(column => {
          const columnTasks = getFilteredTasks(column.tasks);
          const isOver = dragOverColId === column.id;

          return (
            <div
              key={column.id}
              className="kanban-column-box"
              style={{
                backgroundColor: isOver ? '#eff6ff' : 'var(--bg-column)',
                borderColor: isOver ? 'var(--accent-primary)' : 'var(--border-subtle)'
              }}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="kanban-column-header">
                <div className="column-title-label">
                  <span>{column.title}</span>
                  <span className="badge badge-gray">{columnTasks.length}</span>
                </div>

                <button
                  className="btn-icon"
                  style={{ width: '24px', height: '24px' }}
                  onClick={() => {
                    setCreateTaskColumnId(column.id);
                    setIsCreateTaskModalOpen(true);
                  }}
                  title="Add task to this column"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Cards List */}
              <div className="kanban-cards-list">
                {columnTasks.map(task => {
                  const viewers = onlineUsers.filter(u => u.activeTaskId === task.id && u.userId !== currentUser?.id);
                  const isBeingEdited = viewers.some(u => u.isEditing);

                  return (
                    <div
                      key={task.id}
                      className={`kanban-card ${draggedTask?.id === task.id ? 'is-dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={() => setActiveDrawerTask(task)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={`badge ${
                          task.priority === 'URGENT' ? 'badge-red' :
                          task.priority === 'HIGH' ? 'badge-amber' :
                          task.priority === 'MEDIUM' ? 'badge-blue' : 'badge-gray'
                        }`}>
                          {task.priority === 'URGENT' && <AlertCircle size={10} />}
                          {task.priority}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            v{task.version}
                          </span>
                          {viewers.length > 0 && (
                            <span
                              className="badge badge-blue"
                              style={{ fontSize: '0.65rem' }}
                              title={viewers.map(v => v.name).join(', ')}
                            >
                              {viewers.length} active
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="card-title-text">{task.title}</div>

                      {task.description && (
                        <div className="card-desc-snippet">{task.description}</div>
                      )}

                      {task.tags && task.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {task.tags.map((t, idx) => (
                            <span key={idx} className="badge badge-gray" style={{ fontSize: '0.66rem' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="card-meta-row">
                        {task.due_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} />
                            <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        ) : <div />}

                        {task.assignee_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={`Assigned to ${task.assignee_name}`}>
                            <img
                              src={task.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
                              alt={task.assignee_name}
                              style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span style={{ fontSize: '0.74rem' }}>{task.assignee_name.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div style={{
                    padding: '24px 10px',
                    textAlign: 'center',
                    color: 'var(--text-subtle)',
                    fontSize: '0.78rem',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    No tasks in {column.title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
