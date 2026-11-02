import React from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Shield, Building2, GitBranch, Calendar, CheckCircle } from 'lucide-react';

export function ProfilePage() {
  const { currentUser, currentOrg, currentTenant, userRole } = useApp();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Personal credentials, authorized memberships, and enterprise directory identity.</p>
        </div>
      </div>

      <div className="table-container" style={{ padding: '28px', maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px' }}>
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
            alt={currentUser?.name}
            style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-subtle)' }}
          />
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currentUser?.name}</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{currentUser?.email}</div>
            <div style={{ marginTop: '6px' }}>
              <span className="badge badge-amber">{userRole}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px', fontSize: '0.86rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={16} color="var(--accent-primary)" />
            <span><strong>Organization:</strong> {currentOrg?.name} ({currentOrg?.slug})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={16} color="#059669" />
            <span><strong>Active Branch / Tenant:</strong> {currentTenant?.name} ({currentTenant?.id})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={16} color="#d97706" />
            <span><strong>Access Privileges:</strong> {
              userRole === 'ORG_ADMIN' ? 'Organization-wide administration across all branch tenants' :
              userRole === 'TENANT_ADMIN' ? 'Branch management, boards and column workflow administration' :
              'Standard task creation, moving, and collaboration'
            }</span>
          </div>
        </div>
      </div>
    </div>
  );
}
