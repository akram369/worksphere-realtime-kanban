import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GitBranch, Plus, Building2, Users, FolderKanban, CheckCircle2, X } from 'lucide-react';
import { api } from '../services/api';

export function BranchesPage() {
  const { currentOrg, tenants, setTenants, currentTenant, switchTenant, userRole, addToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageBranches = userRole === 'ORG_ADMIN';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !currentOrg) return;

    setIsSubmitting(true);
    try {
      const created = await api.createTenant(currentOrg.id, {
        name: name.trim(),
        slug: slug.trim().toLowerCase()
      });

      const updated = await api.getTenants(currentOrg.id);
      setTenants(updated);
      addToast(`Created branch "${created.name}"`, 'info');
      setIsModalOpen(false);
      setName('');
      setSlug('');
    } catch (err) {
      addToast(`Failed to create branch: ${err.message}`, 'conflict');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Branch / Tenant Management</h1>
          <p className="page-subtitle">Manage branch locations, data partitions, and isolated workspaces in {currentOrg?.name}.</p>
        </div>

        {canManageBranches && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={15} />
            <span>Add Branch</span>
          </button>
        )}
      </div>

      {/* Branches Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Branch / Tenant</th>
              <th>Organization</th>
              <th>Personnel</th>
              <th>Active Projects</th>
              <th>Isolation Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(branch => {
              const isActive = branch.id === currentTenant?.id;

              return (
                <tr key={branch.id} style={{ backgroundColor: isActive ? '#f8fafc' : 'transparent' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="brand-icon-box" style={{ width: '28px', height: '28px', backgroundColor: '#059669' }}>
                        <GitBranch size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{branch.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {branch.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={13} color="var(--text-muted)" />
                      <span>{currentOrg?.name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span>{branch.user_count || 4} members</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FolderKanban size={14} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 600 }}>{branch.board_count || 1} boards</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={11} />
                      <span>Isolated</span>
                    </span>
                  </td>
                  <td>
                    {!isActive ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => switchTenant(branch.id)}
                      >
                        Switch To
                      </button>
                    ) : (
                      <span className="badge badge-blue">Active Context</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Branch Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Create Branch Tenant</span>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Pune Tech Center"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Identifier / Slug</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. pune-center"
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
                  <GitBranch size={14} />
                  <span>{isSubmitting ? 'Creating...' : 'Create Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
