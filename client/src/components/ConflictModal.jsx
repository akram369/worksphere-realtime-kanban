import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, RefreshCw, X, GitMerge, Check } from 'lucide-react';
import { api } from '../services/api';

export function ConflictModal() {
  const { activeConflict, setActiveConflict, addToast, setBoardData } = useApp();

  if (!activeConflict) return null;

  const { currentTask, expectedVersion, localDraft } = activeConflict;

  const handleForceOverwrite = async () => {
    try {
      const updated = await api.updateTask(currentTask.id, {
        expectedVersion: currentTask.version,
        ...localDraft
      });
      addToast(`Conflict resolved: Overwrote server with your changes (v${updated.version})`, 'info');
      setActiveConflict(null);
    } catch (err) {
      addToast(`Resolution failed: ${err.message}`, 'conflict');
    }
  };

  const handleAcceptServer = () => {
    setBoardData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          tasks: col.tasks.map(t => t.id === currentTask.id ? { ...t, ...currentTask } : t)
        }))
      };
    });
    addToast('Discarded local changes and synced with server', 'info');
    setActiveConflict(null);
  };

  const handleMerge = async () => {
    try {
      const mergedDescription = `${localDraft.description || ''}\n\n--- [Merged Server Update v${currentTask.version}] ---\n${currentTask.description || ''}`;
      const updated = await api.updateTask(currentTask.id, {
        expectedVersion: currentTask.version,
        title: localDraft.title || currentTask.title,
        description: mergedDescription,
        priority: localDraft.priority || currentTask.priority,
        assigneeId: localDraft.assigneeId || currentTask.assignee_id,
        tags: Array.from(new Set([...(localDraft.tags || []), ...(currentTask.tags || [])]))
      });
      addToast(`Conflict resolved: Merged both edits into v${updated.version}`, 'info');
      setActiveConflict(null);
    } catch (err) {
      addToast(`Merge failed: ${err.message}`, 'conflict');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '720px' }}>
        <div className="modal-header" style={{ backgroundColor: 'var(--color-danger-bg)', borderBottom: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="var(--color-danger)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--color-danger)' }}>
                Optimistic Concurrency Conflict (HTTP 409)
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Another collaborator modified this task before your save was committed.
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setActiveConflict(null)}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Your local draft was based on <strong>v{expectedVersion}</strong>, but the server state has advanced to <strong>v{currentTask?.version}</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
            {/* Left: Your Local Draft */}
            <div style={{ border: '1px solid var(--accent-primary-border)', backgroundColor: 'var(--accent-primary-light)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                Your Local Changes (Pending)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Title:</strong> {localDraft?.title || '(Empty)'}</div>
                <div><strong>Priority:</strong> {localDraft?.priority}</div>
                <div><strong>Description:</strong></div>
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: '110px', overflowY: 'auto', background: 'white', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  {localDraft?.description || '(No description)'}
                </div>
              </div>
            </div>

            {/* Right: Server State */}
            <div style={{ border: '1px solid var(--color-danger-border)', backgroundColor: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--color-danger)', marginBottom: '8px' }}>
                Latest Server State (v{currentTask?.version})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Title:</strong> {currentTask?.title}</div>
                <div><strong>Priority:</strong> {currentTask?.priority}</div>
                <div><strong>Description:</strong></div>
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: '110px', overflowY: 'auto', background: 'white', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  {currentTask?.description || '(No description)'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAcceptServer}
          >
            <RefreshCw size={13} />
            <span>Discard & Accept Server</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleMerge}
            >
              <GitMerge size={13} color="var(--accent-primary)" />
              <span>Merge Both</span>
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleForceOverwrite}
            >
              <span>Overwrite Server (Force)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
