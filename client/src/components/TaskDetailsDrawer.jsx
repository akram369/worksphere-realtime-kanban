import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Trash2,
  Save,
  Calendar,
  User,
  Tag,
  Clock,
  Layers,
  AlertCircle,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { api } from '../services/api';

export function TaskDetailsDrawer() {
  const {
    activeDrawerTask,
    setActiveDrawerTask,
    boardData,
    allUsers,
    addToast,
    pushUndoAction,
    sendPresenceActivity,
    setActiveConflict,
    activityLogs,
    currentTenant,
    userRole
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [columnId, setColumnId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeDrawerTask) {
      setTitle(activeDrawerTask.title || '');
      setDescription(activeDrawerTask.description || '');
      setPriority(activeDrawerTask.priority || 'MEDIUM');
      setColumnId(activeDrawerTask.column_id || '');
      setAssigneeId(activeDrawerTask.assignee_id || '');
      setDueDate(activeDrawerTask.due_date || '');
      setTags(activeDrawerTask.tags || []);
      setTagInput('');

      sendPresenceActivity(activeDrawerTask.id, false);
    } else {
      sendPresenceActivity(null, false);
    }
  }, [activeDrawerTask, sendPresenceActivity]);

  if (!activeDrawerTask) return null;

  const handleFieldChange = () => {
    sendPresenceActivity(activeDrawerTask.id, true);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
        handleFieldChange();
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
    handleFieldChange();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    const previousSnapshot = { ...activeDrawerTask };

    try {
      // If column changed, handle column move
      if (columnId !== activeDrawerTask.column_id) {
        await api.moveTask(activeDrawerTask.id, {
          targetColumnId: columnId,
          prevPos: null,
          nextPos: null
        });
      }

      const updated = await api.updateTask(activeDrawerTask.id, {
        expectedVersion: activeDrawerTask.version,
        title: title.trim(),
        description,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        tags
      });

      addToast(`Task "${updated.title}" updated`, 'info');
      setActiveDrawerTask(null);

      // Register undo action
      pushUndoAction({
        description: `Revert edit on "${updated.title}"`,
        undo: async () => {
          await api.updateTask(activeDrawerTask.id, {
            expectedVersion: updated.version,
            title: previousSnapshot.title,
            description: previousSnapshot.description,
            priority: previousSnapshot.priority,
            assigneeId: previousSnapshot.assignee_id,
            dueDate: previousSnapshot.due_date,
            tags: previousSnapshot.tags
          });
        },
        redo: async () => {
          await api.updateTask(activeDrawerTask.id, {
            expectedVersion: previousSnapshot.version,
            title: title.trim(),
            description,
            priority,
            assigneeId: assigneeId || null,
            dueDate: dueDate || null,
            tags
          });
        }
      });
    } catch (err) {
      if (err.status === 409) {
        // Concurrency conflict detected!
        setActiveDrawerTask(null);
        setActiveConflict({
          ...err.data,
          localDraft: {
            title,
            description,
            priority,
            assigneeId,
            dueDate,
            tags
          }
        });
      } else {
        addToast(err.message, 'conflict');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete task "${activeDrawerTask.title}"?`)) return;

    try {
      await api.deleteTask(activeDrawerTask.id);
      addToast('Task deleted successfully', 'info');
      setActiveDrawerTask(null);
    } catch (err) {
      addToast(err.message, 'conflict');
    }
  };

  // Filter audit logs for this specific task
  const taskLogs = activityLogs.filter(l => l.entity_id === activeDrawerTask.id);

  return (
    <div className="drawer-overlay" onClick={() => setActiveDrawerTask(null)}>
      <div className="drawer-panel-right" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Task Details
            </span>
            <span className="badge badge-gray" style={{ fontFamily: 'var(--font-mono)' }}>
              v{activeDrawerTask.version}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn-icon"
              onClick={handleDelete}
              title="Delete task"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 size={15} />
            </button>
            <button className="btn-icon" onClick={() => setActiveDrawerTask(null)}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="drawer-body">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => { setTitle(e.target.value); handleFieldChange(); }}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={description}
                onChange={(e) => { setDescription(e.target.value); handleFieldChange(); }}
                placeholder="Describe this task, goals, requirements..."
              />
            </div>

            {/* Status & Priority Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Status (Column)</label>
                <select
                  className="form-select"
                  value={columnId}
                  onChange={(e) => { setColumnId(e.target.value); handleFieldChange(); }}
                >
                  {boardData?.columns?.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => { setPriority(e.target.value); handleFieldChange(); }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (P0)</option>
                </select>
              </div>
            </div>

            {/* Assignee & Due Date Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select
                  className="form-select"
                  value={assigneeId}
                  onChange={(e) => { setAssigneeId(e.target.value); handleFieldChange(); }}
                >
                  <option value="">Unassigned</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); handleFieldChange(); }}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="form-group">
              <label className="form-label">Tags (Type and press Enter)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Add label (e.g. Design, Frontend)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="badge badge-gray"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleRemoveTag(t)}
                      title="Click to remove"
                    >
                      #{t} <X size={10} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata Information */}
            <div style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.76rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div><strong>Task ID:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{activeDrawerTask.id}</span></div>
              <div><strong>Tenant:</strong> {currentTenant?.name}</div>
              <div><strong>Created:</strong> {new Date(activeDrawerTask.created_at).toLocaleString()}</div>
              <div><strong>Last Updated:</strong> {new Date(activeDrawerTask.updated_at || activeDrawerTask.created_at).toLocaleString()}</div>
            </div>

            {/* Task Activity Logs */}
            {taskLogs.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} />
                  <span>Audit History for Task</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {taskLogs.map(log => (
                    <div key={log.id} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f8fafc' }}>
                      <strong>{log.user_name || 'System'}</strong>: {log.action_type.replace('_', ' ')}
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({new Date(log.created_at).toLocaleTimeString()})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="drawer-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveDrawerTask(null)}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
