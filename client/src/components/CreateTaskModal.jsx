import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Plus } from 'lucide-react';
import { api } from '../services/api';

export function CreateTaskModal() {
  const {
    isCreateTaskModalOpen,
    setIsCreateTaskModalOpen,
    createTaskColumnId,
    setCreateTaskColumnId,
    currentBoard,
    boardData,
    allUsers,
    addToast,
    pushUndoAction
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const isOpen = isCreateTaskModalOpen || !!createTaskColumnId;
  if (!isOpen) return null;

  const targetColId = createTaskColumnId || boardData?.columns?.[0]?.id;

  const handleClose = () => {
    setIsCreateTaskModalOpen(false);
    setCreateTaskColumnId(null);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !currentBoard || !targetColId) return;

    setIsCreating(true);
    try {
      const created = await api.createTask({
        boardId: currentBoard.id,
        columnId: targetColId,
        title: title.trim(),
        description,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        tags
      });

      addToast(`Task "${created.title}" created`, 'info');
      handleClose();

      // Register undo action
      pushUndoAction({
        description: `Delete created task "${created.title}"`,
        undo: async () => {
          await api.deleteTask(created.id);
        },
        redo: async () => {
          await api.createTask({
            boardId: currentBoard.id,
            columnId: targetColId,
            title: created.title,
            description: created.description,
            priority: created.priority,
            assigneeId: created.assignee_id,
            dueDate: created.due_date,
            tags: created.tags
          });
        }
      });
    } catch (err) {
      addToast(`Failed to create task: ${err.message}`, 'conflict');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Create New Task</div>
          <button className="btn-icon" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Task Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Implement distributed cache"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="What needs to be accomplished?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
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
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (Press Enter)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Backend, API"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </div>
            </div>

            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="badge badge-gray"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                  >
                    #{tag} <X size={10} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isCreating}>
              <Plus size={14} />
              <span>{isCreating ? 'Creating...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
