import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Tag, AlertCircle, Edit3, Eye } from 'lucide-react';

export function TaskCard({ task, onDragStart, onDragEnd }) {
  const { setActiveModalTask, onlineUsers, currentUser } = useApp();

  // Check if any other user is currently viewing or editing this task
  const viewers = onlineUsers.filter(u => u.activeTaskId === task.id && u.userId !== currentUser?.id);
  const isBeingEdited = viewers.some(u => u.isEditing);

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => setActiveModalTask(task)}
    >
      <div className="card-top-row">
        <span className={`priority-chip prio-${task.priority}`}>
          {task.priority === 'URGENT' && <AlertCircle size={10} />}
          {task.priority}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Version badge for OCC visibility */}
          <span className="version-chip" title="Optimistic Concurrency Control Version">
            v{task.version}
          </span>

          {/* Collaborator viewing/editing indicator */}
          {viewers.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 5px',
                borderRadius: '4px',
                background: isBeingEdited ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: isBeingEdited ? '#fda4af' : '#7dd3fc',
                fontSize: '0.68rem',
                fontWeight: 600
              }}
              title={viewers.map(v => `${v.name} (${isBeingEdited ? 'Editing' : 'Viewing'})`).join(', ')}
            >
              {isBeingEdited ? <Edit3 size={10} /> : <Eye size={10} />}
              <span>{viewers.length}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card-title">{task.title}</div>

      {task.tags && task.tags.length > 0 && (
        <div className="card-tags">
          {task.tags.map((tag, idx) => (
            <span key={idx} className="tag-badge">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="card-bottom-row">
        {task.due_date ? (
          <div className="due-date-badge">
            <Calendar size={12} />
            <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        ) : <div />}

        {task.assignee_name && (
          <div className="card-assignee" title={`Assigned to ${task.assignee_name}`}>
            <img
              src={task.assignee_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces'}
              alt={task.assignee_name}
              className="assignee-avatar-sm"
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {task.assignee_name.split(' ')[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
