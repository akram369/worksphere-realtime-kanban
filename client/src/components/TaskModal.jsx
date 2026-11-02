import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Trash2, Save, AlertTriangle, Calendar, User, Tag, Clock } from 'lucide-react';
import { api } from '../services/api';

export function TaskModal() {
  const {
    activeModalTask,
    setActiveModalTask,
    allUsers,
    addToast,
    pushUndoAction,
    sendPresenceActivity,
    setActiveConflict,
    activityLogs
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when activeModalTask changes
  useEffect(() => {
    if (activeModalTask) {
      setTitle(activeModalTask.title || '');
      setDescription(activeModalTask.description || '');
      setPriority(activeModalTask.priority || 'MEDIUM');
      setAssigneeId(activeModalTask.assignee_id || '');
      setDueDate(activeModalTask.due_date || '');
      setTags(activeModalTask.tags || []);
      setTagInput('');

      // Notify others via WebSocket that this user is viewing this task
      sendPresenceActivity(activeModalTask.id, false);
    } else {
      sendPresenceActivity(null, false);
    }
  }, [activeModalTask, sendPresenceActivity]);

  if (!activeModalTask) return null;

  const handleFieldChange = () => {
    // Notify others that this user is editing
    sendPresenceActivity(activeModalTask.id, true);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
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
    const previousSnapshot = { ...activeModalTask };

    try {
      const updated = await api.updateTask(activeModalTask.id, {
        expectedVersion: activeModalTask.version, // Concurrency control token
        title: title.trim(),
        description,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        tags
      });

      addToast(`Task updated to v${updated.version}`, 'info');
      setActiveModalTask(null);

      // Undo action
      pushUndoAction({
        description: `Revert edit on "${updated.title}"`,
        undo: async () => {
          await api.updateTask(activeModalTask.id, {
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
          await api.updateTask(activeModalTask.id, {
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
        setActiveModalTask(null);
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
    if (!window.confirm(`Delete task "${activeModalTask.title}"?`)) return;

    try {
      await api.deleteTask(activeModalTask.id);
      addToast(`Task deleted`, 'info');
      setActiveModalTask(null);
    } catch (err) {
      addToast(err.message, 'conflict');
    }
  };

  // Filter audit logs for this specific task
  const taskLogs = activityLogs.filter(l => l.entity_id === activeModalTask.id);

  return (
    <div className="modal-overlay" onClick={() => setActiveModalTask(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="modal-title">Task Details</span>
            <span className="version-chip" title="Optimistic Concurrency Control Version">
              Version: v{activeModalTask.version}
            </span>
          </div>
          <button className="btn-icon" onClick={() => setActiveModalTask(null)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Task Title</label>
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
              <label className="form-label">Description (Markdown Supported)</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={description}
                onChange={(e) => { setDescription(e.target.value); handleFieldChange(); }}
                placeholder="Add technical context, specifications, or checklist..."
              />
            </div>

            {/* Row: Priority & Assignee */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
            </div>

            {/* Row: Due Date & Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); handleFieldChange(); }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (Press Enter)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Frontend, Performance"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </div>
            </div>

            {/* Active Tags list */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="tag-badge"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleRemoveTag(tag)}
                    title="Click to remove"
                  >
                    #{tag} <X size={10} />
                  </span>
                ))}
              </div>
            )}

            {/* Task Audit History */}
            {taskLogs.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} />
                  <span>Audit History for this Task</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {taskLogs.slice(0, 4).map(log => (
                    <div key={log.id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <strong>{log.user_name || 'System'}</strong>: {log.action_type} ({new Date(log.created_at).toLocaleTimeString()})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              style={{ marginRight: 'auto' }}
            >
              <Trash2 size={14} />
              <span>Delete Task</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveModalTask(null)}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
