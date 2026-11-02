import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Search,
  Bell,
  Undo2,
  Redo2,
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  User,
  Check
} from 'lucide-react';

export function TopNavbar() {
  const {
    currentOrg,
    currentTenant,
    currentBoard,
    wsStatus,
    onlineUsers,
    undoStack,
    redoStack,
    handleUndo,
    handleRedo,
    setIsEdgeCaseModalOpen,
    searchQuery,
    setSearchQuery,
    unreadNotifications,
    setUnreadNotifications,
    activityLogs,
    allUsers,
    currentUser,
    switchUser,
    userRole
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/overview': return 'Overview Dashboard';
      case '/my-tasks': return 'My Assigned Tasks';
      case '/projects': return currentBoard?.name || 'Projects / Kanban Boards';
      case '/activity': return 'Tenant Activity History';
      case '/team': return 'Team Members';
      case '/organizations': return 'Organization Management';
      case '/branches': return 'Branch / Tenant Management';
      case '/users-management': return 'User Directory & Access Control';
      case '/settings': return 'System Settings';
      case '/help': return 'Help & Knowledge Base';
      case '/profile': return 'My Profile';
      default: return 'WorkSphere';
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ORG_ADMIN': return 'badge-amber';
      case 'TENANT_ADMIN': return 'badge-blue';
      default: return 'badge-green';
    }
  };

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        {/* Breadcrumb Trail */}
        <div className="breadcrumb-trail">
          <span className="breadcrumb-item">{currentOrg?.name || 'Organization'}</span>
          <ChevronRight size={13} />
          <span className="breadcrumb-item">{currentTenant?.name || 'Branch'}</span>
          <ChevronRight size={13} />
          <span className="breadcrumb-current">{getPageTitle()}</span>
        </div>
      </div>

      <div className="top-navbar-right">
        {/* Global Search Bar */}
        <div className="global-search-box">
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input-field"
            placeholder="Search tasks, members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button
            className="btn-icon"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            style={{ opacity: undoStack.length === 0 ? 0.35 : 1 }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="btn-icon"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            style={{ opacity: redoStack.length === 0 ? 0.35 : 1 }}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Real-time Connection Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: '#ffffff',
            fontSize: '0.74rem',
            fontWeight: 600
          }}
          title={`WebSocket Status: ${wsStatus}`}
        >
          {wsStatus === 'CONNECTED' ? (
            <>
              <div className="presence-dot-live" />
              <span style={{ color: 'var(--color-success)' }}>Live Sync</span>
            </>
          ) : wsStatus === 'RECONNECTING' ? (
            <>
              <RefreshCw size={12} color="var(--color-warning)" />
              <span style={{ color: 'var(--color-warning)' }}>Reconnecting</span>
            </>
          ) : (
            <>
              <WifiOff size={12} color="var(--color-danger)" />
              <span style={{ color: 'var(--color-danger)' }}>Offline</span>
            </>
          )}
        </div>

        {/* Online Presence Avatars */}
        {onlineUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 4px' }} title={`${onlineUsers.length} collaborator(s) online`}>
            {onlineUsers.slice(0, 4).map((u, i) => (
              <img
                key={u.userId}
                src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
                alt={u.name}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  marginLeft: i === 0 ? 0 : '-8px',
                  objectFit: 'cover'
                }}
              />
            ))}
          </div>
        )}

        {/* Edge Cases & Tests Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsEdgeCaseModalOpen(true)}
          style={{ borderColor: 'var(--accent-primary-border)', color: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary-light)' }}
        >
          <ShieldAlert size={14} />
          <span>Edge Cases & Tests</span>
        </button>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setUnreadNotifications(0);
            }}
            title="Notifications"
          >
            <Bell size={15} />
            {unreadNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                backgroundColor: 'var(--color-danger)',
                color: 'white',
                fontSize: '0.62rem',
                fontWeight: 700,
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '320px',
              backgroundColor: 'white',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '12px',
              zIndex: 40
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, fontSize: '0.84rem' }}>
                <span>Branch Notifications</span>
                <span className="badge badge-gray">{activityLogs.length} total</span>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {activityLogs.slice(0, 6).map(log => (
                  <div key={log.id} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f8fafc' }}>
                    <strong>{log.user_name || 'System'}</strong>: {log.action_type.replace('_', ' ')}
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Simulator Pill */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px 4px 6px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="Switch User / Simulate Roles"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
              alt={currentUser?.name}
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser?.name?.split(' ')[0]}</span>
            <span className={`badge ${getRoleBadgeClass(userRole)}`}>{userRole}</span>
          </div>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '38px',
              right: 0,
              width: '260px',
              backgroundColor: 'white',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '8px',
              zIndex: 40
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 8px' }}>
                Simulate Role / User
              </div>
              {allUsers.map(u => {
                const isSelected = u.id === currentUser?.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setShowUserMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={u.avatar} alt={u.name} style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={14} color="var(--accent-primary)" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
