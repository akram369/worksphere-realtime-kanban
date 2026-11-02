import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Kanban } from 'lucide-react';
import { api } from '../services/api';

export function CreateBoardModal() {
  const {
    isCreateBoardModalOpen,
    setIsCreateBoardModalOpen,
    currentTenant,
    setBoards,
    setCurrentBoard,
    addToast
  } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isCreateBoardModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const newBoard = await api.createBoard({
        name: name.trim(),
        description: description.trim()
      });

      setBoards(prev => [newBoard, ...prev]);
      setCurrentBoard(newBoard);
      addToast(`Board "${newBoard.name}" created with standard workflow columns`, 'info');
      setIsCreateBoardModalOpen(false);
      setName('');
      setDescription('');
    } catch (err) {
      addToast(`Failed to create board: ${err.message}`, 'conflict');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsCreateBoardModalOpen(false)}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Create Board in {currentTenant?.name}</div>
          <button className="btn-icon" onClick={() => setIsCreateBoardModalOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project / Board Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Infrastructure Modernization"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describe project objectives and scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCreateBoardModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isCreating}>
              <Kanban size={14} />
              <span>{isCreating ? 'Creating...' : 'Create Project Board'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
