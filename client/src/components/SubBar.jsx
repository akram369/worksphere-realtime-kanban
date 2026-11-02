import React from 'react';
import { useApp } from '../context/AppContext';
import { Kanban, Plus, Users, Eye, Edit3 } from 'lucide-react';

export function SubBar() {
  const {
    boards,
    currentBoard,
    setCurrentBoard,
    userRole,
    onlineUsers,
    setIsCreateBoardOpen,
    currentTenant
  } = useApp();

  const canCreateBoard = ['ORG_ADMIN', 'TENANT_ADMIN'].includes(userRole);

  return (
    <div className="sub-bar">
      <div className="sub-bar-left">
        {/* Board Tabs */}
        <div className="board-nav">
          {boards.map(b => (
            <button
              key={b.id}
              className={`board-tab ${currentBoard?.id === b.id ? 'active' : ''}`}
              onClick={() => setCurrentBoard(b)}
            >
              <Kanban size={15} />
              <span>{b.name}</span>
            </button>
          ))}

          {canCreateBoard && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCreateBoardOpen(true)}
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
              title="Create new board in this tenant"
            >
              <Plus size={14} />
              <span>New Board</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Presence Bar */}
      <div className="presence-container">
        <div className="presence-label">
          <Users size={14} color="var(--accent-emerald)" />
          <span>Tenant Presence ({onlineUsers.length})</span>
        </div>

        <div className="presence-avatars">
          {onlineUsers.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No other users active</span>
          ) : (
            onlineUsers.map(user => {
              const isEditing = user.isEditing;
              const isViewing = user.activeTaskId && !user.isEditing;

              return (
                <div
                  key={user.userId}
                  className="presence-avatar-wrap"
                  title={`${user.name} (${user.role}) ${isEditing ? '• Currently editing a task' : isViewing ? '• Viewing task' : '• Online'}`}
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces'}
                    alt={user.name}
                    className={`presence-avatar-img ${
                      isEditing ? 'presence-editing-ring' : isViewing ? 'presence-active-ring' : ''
                    }`}
                  />
                  {isEditing && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      background: 'var(--accent-rose)',
                      borderRadius: '50%',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Edit3 size={8} color="white" />
                    </div>
                  )}
                  {isViewing && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      background: 'var(--accent-cyan)',
                      borderRadius: '50%',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Eye size={8} color="white" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
