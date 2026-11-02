import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  GitBranch, 
  User, 
  Activity, 
  Undo2, 
  Redo2, 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Plus
} from 'lucide-react';

export function Navbar() {
  const {
    organizations,
    currentOrg,
    switchOrg,
    tenants,
    currentTenant,
    switchTenant,
    allUsers,
    currentUser,
    switchUser,
    userRole,
    wsStatus,
    undoStack,
    redoStack,
    handleUndo,
    handleRedo,
    setIsDrawerOpen,
    unreadLogsCount,
    setUnreadLogsCount,
    setIsEdgeCaseModalOpen,
    setIsCreateBoardOpen
  } = useApp();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ORG_ADMIN': return 'role-org-admin';
      case 'TENANT_ADMIN': return 'role-tenant-admin';
      default: return 'role-member';
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <a href="#" className="brand-badge" onClick={(e) => e.preventDefault()}>
          <div className="brand-icon">
            <Building2 size={20} />
          </div>
          <span>NexusBoard</span>
        </a>

        {/* Organization & Tenant Hierarchy Switcher */}
        <div className="tenant-selector-group">
          {/* Org Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} color="var(--accent-primary)" />
            <select
              className="select-control"
              value={currentOrg?.id || ''}
              onChange={(e) => switchOrg(e.target.value)}
              title="Switch Organization"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <span className="selector-separator">/</span>

          {/* Tenant / Branch Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={16} color="var(--accent-cyan)" />
            <select
              className="select-control"
              value={currentTenant?.id || ''}
              onChange={(e) => switchTenant(e.target.value)}
              title="Switch Tenant / Branch"
            >
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Undo / Redo controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            style={{ opacity: undoStack.length === 0 ? 0.35 : 1 }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            style={{ opacity: redoStack.length === 0 ? 0.35 : 1 }}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* WebSocket Live Sync Badge */}
        <div 
          className="presence-container" 
          style={{ cursor: 'pointer', padding: '4px 10px' }}
          title={`WebSocket Status: ${wsStatus}`}
        >
          {wsStatus === 'CONNECTED' ? (
            <>
              <div className="live-pulse-dot" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399' }}>Live Sync</span>
            </>
          ) : wsStatus === 'RECONNECTING' ? (
            <>
              <RefreshCw size={13} className="spin-icon" color="#fbbf24" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fbbf24' }}>Reconnecting...</span>
            </>
          ) : (
            <>
              <WifiOff size={13} color="#f43f5e" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f43f5e' }}>Offline</span>
            </>
          )}
        </div>

        {/* Edge Cases & Concurrency Tester Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsEdgeCaseModalOpen(true)}
          style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.1)' }}
        >
          <ShieldAlert size={15} color="#818cf8" />
          <span>Edge Cases & Tests</span>
        </button>

        {/* Activity Feed Toggle */}
        <button
          className="btn-icon"
          style={{ position: 'relative' }}
          onClick={() => {
            setIsDrawerOpen(prev => !prev);
            setUnreadLogsCount(0);
          }}
          title="Activity Logs & Audit Trail"
        >
          <Activity size={17} />
          {unreadLogsCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--accent-rose)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 800,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)'
            }}>
              {unreadLogsCount > 9 ? '9+' : unreadLogsCount}
            </span>
          )}
        </button>

        {/* User Switcher Pill for Multi-Tenant Role Simulation */}
        <div className="user-switcher" title="Simulate different users and roles">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces'}
            alt={currentUser?.name}
            className="user-avatar"
          />
          <div className="user-info-text">
            <select
              value={currentUser?.id || ''}
              onChange={(e) => switchUser(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {allUsers.map(u => (
                <option key={u.id} value={u.id} style={{ background: '#111726' }}>
                  {u.name}
                </option>
              ))}
            </select>
            <span className={`user-role-badge ${getRoleBadgeClass(userRole)}`}>
              {userRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
