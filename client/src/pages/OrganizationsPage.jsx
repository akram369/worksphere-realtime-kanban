import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Plus, GitBranch, Users, Calendar, X, Trash2, Edit } from 'lucide-react';
import { api } from '../services/api';

export function OrganizationsPage() {
  const { organizations, setOrganizations, currentOrg, switchOrg, userRole, addToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageOrg = userRole === 'ORG_ADMIN';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await api.createOrganization({
        name: name.trim(),
        slug: slug.trim().toLowerCase()
      });

      const updated = await api.getOrganizations();
      setOrganizations(updated);
      addToast(`Created organization "${created.name}"`, 'info');
      setIsModalOpen(false);
      setName('');
      setSlug('');
    } catch (err) {
      addToast(`Failed to create org: ${err.message}`, 'conflict');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Management</h1>
          <p className="page-subtitle">Configure top-level enterprise entities, root tenancy rules, and cross-branch policies.</p>
        </div>

        {canManageOrg && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={15} />
            <span>New Organization</span>
          </button>
        )}
      </div>

      {/* Organizations Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Slug / Identifier</th>
              <th>Branches (Tenants)</th>
              <th>Total Users</th>
              <th>Created Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map(org => {
              const isActive = org.id === currentOrg?.id;

              return (
                <tr key={org.id} style={{ backgroundColor: isActive ? '#f8fafc' : 'transparent' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="brand-icon-box" style={{ width: '28px', height: '28px' }}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{org.name}</div>
                        {isActive && <span className="badge badge-blue">Active Context</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {org.slug}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GitBranch size={14} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 600 }}>{org.tenant_count || 1} branches</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span>{org.user_count || 4} personnel</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {!isActive ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => switchOrg(org.id)}
                      >
                        Switch To
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 600 }}>Current</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Org Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Create New Organization</span>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Apex Global Technologies"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization Slug (Unique ID)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. apex-global"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  <Building2 size={14} />
                  <span>{isSubmitting ? 'Creating...' : 'Create Organization'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
