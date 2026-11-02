import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  GitBranch,
  X,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export function TeamPage() {
  const { allUsers, setAllUsers, currentOrg, currentTenant, tenants, userRole, addToast } = useApp();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [selectedTenantId, setSelectedTenantId] = useState(currentTenant?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageTeam = ['ORG_ADMIN', 'TENANT_ADMIN'].includes(userRole);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await api.inviteUser({
        name: name.trim(),
        email: email.trim(),
        role,
        tenantId: selectedTenantId,
        orgId: currentOrg?.id
      });

      const updated = await api.getUsers();
      setAllUsers(updated);
      addToast(`Invited ${name.trim()} successfully`, 'info');
      setIsInviteOpen(false);
      setName('');
      setEmail('');
    } catch (err) {
      addToast(`Invite failed: ${err.message}`, 'conflict');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserMembership(userId, {
        role: newRole,
        tenantId: currentTenant?.id,
        orgId: currentOrg?.id
      });
      const updated = await api.getUsers();
      setAllUsers(updated);
      addToast(`Updated role to ${newRole}`, 'info');
    } catch (err) {
      addToast(err.message, 'conflict');
    }
  };

  const handleRemoveUser = async (userId, userName) => {
    if (!window.confirm(`Remove user ${userName}?`)) return;

    try {
      await api.removeUser(userId);
      const updated = await api.getUsers();
      setAllUsers(updated);
      addToast(`Removed ${userName}`, 'info');
    } catch (err) {
      addToast(err.message, 'conflict');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members & Access Control</h1>
          <p className="page-subtitle">Manage personnel, roles, and branch assignments across {currentOrg?.name}.</p>
        </div>

        {canManageTeam && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsInviteOpen(true)}
          >
            <UserPlus size={15} />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Team Members Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branch Assignment</th>
              <th>Assigned Tasks</th>
              {canManageTeam && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {allUsers.map(member => {
              const membership = member.memberships?.find(m => m.org_id === currentOrg?.id);
              const memberRole = membership?.role || 'MEMBER';
              const branchName = membership?.tenant_name || (memberRole === 'ORG_ADMIN' ? 'All Branches (Org-Wide)' : 'Unassigned');

              return (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
                        alt={member.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{member.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {member.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                  <td>
                    {canManageTeam && userRole === 'ORG_ADMIN' ? (
                      <select
                        className="form-select"
                        value={memberRole}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        style={{ padding: '3px 8px', fontSize: '0.76rem', fontWeight: 600 }}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="TENANT_ADMIN">Tenant Admin</option>
                        <option value="ORG_ADMIN">Org Admin</option>
                      </select>
                    ) : (
                      <span className={`badge ${
                        memberRole === 'ORG_ADMIN' ? 'badge-amber' :
                        memberRole === 'TENANT_ADMIN' ? 'badge-blue' : 'badge-green'
                      }`}>
                        {memberRole}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                      <GitBranch size={13} color="var(--text-muted)" />
                      <span>{branchName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-gray">{member.taskCount || 0} active</span>
                  </td>
                  {canManageTeam && (
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleRemoveUser(member.id, member.name)}
                        title="Remove member"
                        style={{ marginLeft: 'auto', color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="modal-backdrop" onClick={() => setIsInviteOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Invite New Team Member</span>
              <button className="btn-icon" onClick={() => setIsInviteOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInvite}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Vikram Chandra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="vikram@abctech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="MEMBER">Member (Standard collaborator)</option>
                      <option value="TENANT_ADMIN">Tenant Admin (Branch lead)</option>
                      {userRole === 'ORG_ADMIN' && (
                        <option value="ORG_ADMIN">Org Admin (Full org access)</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Branch Assignment</label>
                    <select
                      className="form-select"
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  <UserPlus size={14} />
                  <span>{isSubmitting ? 'Inviting...' : 'Send Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
