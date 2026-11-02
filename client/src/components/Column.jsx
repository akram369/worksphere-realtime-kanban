import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export function Column({
  column,
  onTaskDrop,
  draggedTask,
  setDraggedTask
}) {
  const { setCreateTaskColumnId, userRole, addToast, boardData, setBoardData } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropIndex, setDropIndex] = useState(null);

  const canManageColumn = ['ORG_ADMIN', 'TENANT_ADMIN'].includes(userRole);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);

    // Calculate hover index based on cursor Y position relative to cards
    const container = e.currentTarget.querySelector('.column-cards-container');
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('.task-card'));
    const mouseY = e.clientY;

    let targetIdx = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (mouseY < mid) {
        targetIdx = i;
        break;
      }
    }
    setDropIndex(targetIdx);
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving column element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setDropIndex(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const targetIdx = dropIndex;
    setDropIndex(null);

    if (!draggedTask) return;

    // Determine prevPos and nextPos from targetIdx
    const tasks = column.tasks.filter(t => t.id !== draggedTask.id);
    let prevPos = null;
    let nextPos = null;

    if (tasks.length === 0) {
      prevPos = null;
      nextPos = null;
    } else if (targetIdx === 0) {
      prevPos = null;
      nextPos = tasks[0].position;
    } else if (targetIdx >= tasks.length) {
      prevPos = tasks[tasks.length - 1].position;
      nextPos = null;
    } else {
      prevPos = tasks[targetIdx - 1].position;
      nextPos = tasks[targetIdx].position;
    }

    onTaskDrop({
      taskId: draggedTask.id,
      targetColumnId: column.id,
      prevPos,
      nextPos
    });
  };

  const handleDeleteColumn = async () => {
    if (!window.confirm(`Delete column "${column.title}" and all its tasks?`)) return;
    try {
      await api.deleteColumn(column.id);
      addToast(`Column "${column.title}" deleted`, 'info');
    } catch (err) {
      addToast(err.message, 'conflict');
    }
  };

  return (
    <div
      className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title-group">
          <span className="column-title">{column.title}</span>
          <span className="column-badge">{column.tasks.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            onClick={() => setCreateTaskColumnId(column.id)}
            title="Add task to this column"
          >
            <Plus size={15} />
          </button>

          {canManageColumn && (
            <button
              className="btn-icon"
              onClick={handleDeleteColumn}
              title="Delete column (Tenant Admin only)"
            >
              <Trash2 size={14} color="#f43f5e" />
            </button>
          )}
        </div>
      </div>

      <div className="column-cards-container">
        {column.tasks.map((task, idx) => (
          <React.Fragment key={task.id}>
            {isDragOver && dropIndex === idx && (
              <div className="drop-placeholder">Drop Here</div>
            )}
            <TaskCard
              task={task}
              onDragStart={(e, t) => {
                setDraggedTask(t);
                e.dataTransfer.setData('text/plain', t.id);
              }}
              onDragEnd={() => {
                setDraggedTask(null);
                setIsDragOver(false);
                setDropIndex(null);
              }}
            />
          </React.Fragment>
        ))}

        {isDragOver && (dropIndex === null || dropIndex >= column.tasks.length) && (
          <div className="drop-placeholder">Drop Here</div>
        )}

        {column.tasks.length === 0 && !isDragOver && (
          <div style={{
            padding: '28px 12px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            border: '1px dashed rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)'
          }}>
            No tasks in this column
          </div>
        )}
      </div>
    </div>
  );
}
