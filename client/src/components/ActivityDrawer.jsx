import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Activity, Clock, ShieldCheck } from 'lucide-react';

export function ActivityDrawer() {
  const { isDrawerOpen, setIsDrawerOpen, activityLogs, currentTenant } = useApp();

  if (!isDrawerOpen) return null;

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getActionBadgeColor = (actionType) => {
    switch (actionType) {
      case 'TASK_CREATED': return '#34d399';
      case 'TASK_MOVED': return '#38bdf8';
      case 'TASK_UPDATED': return '#fbbf24';
      case 'TASK_DELETED': return '#f43f5e';
      default: return '#818cf8';
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
      <div className="drawer-panel">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>Tenant Activity Feed</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Auditing {currentTenant?.name}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {activityLogs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 10px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              No activity recorded in this tenant yet.
            </div>
          ) : (
            activityLogs.map((log) => {
              const details = log.details || {};
              const actionColor = getActionBadgeColor(log.action_type);

              return (
                <div key={log.id} className="log-item">
                  <img
                    src={log.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces'}
                    alt={log.user_name || 'System'}
                    className="log-avatar"
                  />
                  <div className="log-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="log-actor">{log.user_name || 'System'}</span>
                      <span className="log-time" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} />
                        {formatTime(log.created_at)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: actionColor,
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '1px 5px',
                        borderRadius: '3px'
                      }}>
                        {log.action_type.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {details.title || details.name || details.taskTitle || log.entity_id}
                      </span>
                    </div>

                    {details.fromColumn && details.toColumn && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Moved from <em>{details.fromColumn}</em> → <em>{details.toColumn}</em>
                      </div>
                    )}

                    {details.version && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Advanced to v{details.version}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
