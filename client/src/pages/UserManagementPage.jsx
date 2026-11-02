import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, Shield, Key, CheckCircle, AlertTriangle, Users } from 'lucide-react';

export function UserManagementPage() {
  const { allUsers, currentOrg, userRole } = useApp();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Directory & Role-Based Access Control</h1>
          <p className="page-subtitle">Security governance, permission boundaries, and membership assignments across {currentOrg?.name}.</p>
        </div>
      </div>

      {/* RBAC Matrix Card */}
      <div className="table-container" style={{ padding: '20px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600, fontSize: '0.92rem' }}>
          <Shield size={18} color="var(--accent-primary)" />
          <span>WorkSphere RBAC Permission Matrix</span>
        </div>
        <table className="enterprise-table" style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th>Capability</th>
              <th>ORG_ADMIN</th>
              <th>TENANT_ADMIN</th>
              <th>MEMBER</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Create / Manage Organizations & Branches</td>
              <td><span className="badge badge-green">Full Access</span></td>
              <td><span className="badge badge-gray">No Access</span></td>
              <td><span className="badge badge-gray">No Access</span></td>
            </tr>
            <tr>
              <td>Create / Delete Project Boards</td>
              <td><span className="badge badge-green">Full Access</span></td>
              <td><span className="badge badge-green">Branch Scope</span></td>
              <td><span className="badge badge-gray">No Access</span></td>
            </tr>
            <tr>
              <td>Manage Columns & Workflow</td>
              <td><span className="badge badge-green">Full Access</span></td>
              <td><span className="badge badge-green">Branch Scope</span></td>
              <td><span className="badge badge-gray">No Access</span></td>
            </tr>
            <tr>
              <td>Create, Move, Edit, and Complete Tasks</td>
              <td><span className="badge badge-green">Full Access</span></td>
              <td><span className="badge badge-green">Branch Scope</span></td>
              <td><span className="badge badge-green">Branch Scope</span></td>
            </tr>
            <tr>
              <td>Real-time Collaborative Sync & Presence</td>
              <td><span className="badge badge-green">Active</span></td>
              <td><span className="badge badge-green">Active</span></td>
              <td><span className="badge badge-green">Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Directory Table */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, fontSize: '0.92rem' }}>
          Registered Personnel Directory ({allUsers.length})
        </div>
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Organization</th>
              <th>Tenant Memberships</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={user.avatar} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                    <span style={{ fontWeight: 600 }}>{user.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                <td>{currentOrg?.name}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {user.memberships?.map((m, idx) => (
                      <span key={idx} className="badge badge-gray">
                        {m.role}: {m.tenant_name || 'Org-Wide'}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {new Date(user.created_at || Date.now()).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
