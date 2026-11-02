import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Column } from './Column';
import { Plus } from 'lucide-react';
import { api } from '../services/api';

export function KanbanBoard() {
  const {
    boardData,
    setBoardData,
    currentBoard,
    currentTenant,
    userRole,
    addToast,
    pushUndoAction,
    setActiveConflict
  } = useApp();

  const [draggedTask, setDraggedTask] = useState(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const canManageColumn = ['ORG_ADMIN', 'TENANT_ADMIN'].includes(userRole);

  const handleTaskDrop = async ({ taskId, targetColumnId, prevPos, nextPos }) => {
    if (!boardData) return;

    // Find original task and column for snapshot / rollback
    let originalTask = null;
    let originalColumnId = null;
    let originalIndex = -1;

    for (const col of boardData.columns) {
      const idx = col.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        originalTask = col.tasks[idx];
        originalColumnId = col.id;
        originalIndex = idx;
        break;
      }
    }

    if (!originalTask) return;

    // Snapshot state for undo and rollback
    const previousBoardData = JSON.parse(JSON.stringify(boardData));

    // 1. Optimistic Local State Update
    const updatedBoardData = {
      ...boardData,
      columns: boardData.columns.map(col => {
        if (col.id === originalColumnId && originalColumnId !== targetColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter(t => t.id !== taskId)
          };
        }
        if (col.id === targetColumnId) {
          const filtered = col.tasks.filter(t => t.id !== taskId);
          const movingTask = { ...originalTask, column_id: targetColumnId };
          return {
            ...col,
            tasks: [...filtered, movingTask]
          };
        }
        return col;
      })
    };

    setBoardData(updatedBoardData);

    // 2. Perform API request to server
    try {
      const result = await api.moveTask(taskId, {
        targetColumnId,
        prevPos,
        nextPos
      });

      // Register undo action
      pushUndoAction({
        description: `Move "${originalTask.title}" back to ${previousBoardData.columns.find(c => c.id === originalColumnId)?.title}`,
        undo: async () => {
          await api.moveTask(taskId, {
            targetColumnId: originalColumnId,
            prevPos: originalIndex > 0 ? previousBoardData.columns.find(c => c.id === originalColumnId).tasks[originalIndex - 1]?.position : null,
            nextPos: previousBoardData.columns.find(c => c.id === originalColumnId).tasks[originalIndex]?.position || null
          });
          setBoardData(previousBoardData);
        },
        redo: async () => {
          await api.moveTask(taskId, { targetColumnId, prevPos, nextPos });
          setBoardData(updatedBoardData);
        }
      });
    } catch (err) {
      // Rollback optimistic update
      console.error('Task move failed, rolling back:', err);
      setBoardData(previousBoardData);

      if (err.status === 409) {
        setActiveConflict(err.data);
      } else {
        addToast(`Move failed: ${err.message}`, 'conflict');
      }
    }
  };

  const handleCreateColumn = async (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim() || !currentBoard) return;

    try {
      await api.createColumn({
        boardId: currentBoard.id,
        title: newColumnTitle.trim()
      });
      setNewColumnTitle('');
      setIsAddingColumn(false);
      addToast(`Created column "${newColumnTitle.trim()}"`, 'info');
    } catch (err) {
      addToast(err.message, 'conflict');
    }
  };

  if (!boardData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: 'var(--text-secondary)'
      }}>
        {currentBoard ? 'Loading board hierarchy...' : 'No board selected or available.'}
      </div>
    );
  }

  return (
    <main className="board-viewport">
      {boardData.columns.map(column => (
        <Column
          key={column.id}
          column={column}
          onTaskDrop={handleTaskDrop}
          draggedTask={draggedTask}
          setDraggedTask={setDraggedTask}
        />
      ))}

      {/* Add Column Button / Form */}
      {canManageColumn && (
        <div style={{ minWidth: '280px', width: '280px' }}>
          {isAddingColumn ? (
            <form
              onSubmit={handleCreateColumn}
              style={{
                background: 'var(--bg-column)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Column title (e.g. QA Review)"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Add Column
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAddingColumn(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '14px',
                justifyContent: 'center',
                borderStyle: 'dashed'
              }}
              onClick={() => setIsAddingColumn(true)}
            >
              <Plus size={16} />
              <span>Add Column</span>
            </button>
          )}
        </div>
      )}
    </main>
  );
}
