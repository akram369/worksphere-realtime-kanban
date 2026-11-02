import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Activity,
  Filter,
  Clock,
  ArrowRight,
  PlusCircle,
  Edit3,
  MoveRight,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export function ActivityPage() {
  const { activityLogs, currentTenant } = useApp();
  const [filterType, setFilterType] = useState('ALL');

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'TASK_CREATED': return <PlusCircle size={15} color="var(--color-success)" />;
      case 'TASK_MOVED': return <MoveRight size={15} color="var(--accent-primary)" />;
      case 'TASK_UPDATED': return <Edit3 size={15} color="var(--color-warning)" />;
      case 'TASK_DELETED': return <Trash2 size={15} color="var(--color-danger)" />;
      default: return <Activity size={15} color="var(--accent-primary)" />;
    }
  };

  const filteredLogs = activityLogs.filter(log => {
    if (filterType === 'ALL') return true;
    if (filterType === 'CREATION') return log.action_type.includes('CREATED');
    if (filterType === 'MOVEMENT') return log.action_type.includes('MOVED');
    if (filterType === 'UPDATES') return log.action_type.includes('UPDATED');
    if (filterType === 'DELETIONS') return log.action_type.includes('DELETED');
    return true;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Audit Trail</h1>
          <p className="page-subtitle">Real-time chronological activity ledger for {currentTenant?.name}.</p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'ALL', label: 'All Activities' },
            { id: 'CREATION', label: 'Task Creation' },
            { id: 'MOVEMENT', label: 'Movements' },
            { id: 'UPDATES', label: 'Updates' },
            { id: 'DELETIONS', label: 'Deletions' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`btn btn-sm ${filterType === f.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="table-container" style={{ padding: '16px' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            No activity logs matching this filter in {currentTenant?.name}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredLogs.map(log => {
              const details = log.details || {};

              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <img
                    src={log.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
                    alt={log.user_name || 'System'}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{log.user_name || 'System'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {getActionIcon(log.action_type)}
                          <strong style={{ color: 'var(--text-secondary)' }}>{log.action_type.replace('_', ' ')}</strong>
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {details.title || details.name || details.taskTitle || log.entity_id}
                    </div>

                    {details.fromColumn && details.toColumn && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Workflow transition: <em>{details.fromColumn}</em> → <em>{details.toColumn}</em>
                      </div>
                    )}

                    {details.version && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                        Optimistic Concurrency: version bumped to v{details.version}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
