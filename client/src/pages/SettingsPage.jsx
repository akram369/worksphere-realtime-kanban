import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Lock, Bell, Sliders, Shield, Save, CheckCircle2 } from 'lucide-react';

export function SettingsPage() {
  const { currentUser, currentOrg, currentTenant, userRole, addToast } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const [notificationsSlack, setNotificationsSlack] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    addToast('Profile preferences updated', 'info');
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'account', label: 'Account Settings', icon: Sliders },
    { id: 'notifications', label: 'Notification Preferences', icon: Bell },
    { id: 'workspace', label: 'Workspace Settings', icon: Shield },
    { id: 'security', label: 'Security & 2FA', icon: Lock },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & Preferences</h1>
          <p className="page-subtitle">Manage personal profile, notifications, workspace security, and organization policies.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Navigation Tabs */}
        <div className="table-container" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="sidebar-nav-item"
              style={{
                border: 'none',
                width: '100%',
                textAlign: 'left',
                backgroundColor: activeTab === tab.id ? 'var(--bg-sidebar-active)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 500
              }}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="table-container" style={{ padding: '24px' }}>
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                Profile Information
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
                  alt={currentUser?.name}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <button type="button" className="btn btn-secondary btn-sm">Change Photo</button>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>JPG, GIF or PNG. Max size 2MB</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Active Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${userRole} (${currentOrg?.name})`}
                  disabled
                  style={{ backgroundColor: '#f8fafc', color: 'var(--text-muted)' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                <Save size={14} />
                <span>Save Changes</span>
              </button>
            </form>
          )}

          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                Account Settings
              </div>
              <div className="form-group">
                <label className="form-label">Language & Region</label>
                <select className="form-select">
                  <option>English (India) - en-IN</option>
                  <option>English (US) - en-US</option>
                  <option>English (UK) - en-GB</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="form-select">
                  <option>Asia/Kolkata (IST, UTC+05:30)</option>
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>America/New_York (EST, UTC-05:00)</option>
                </select>
              </div>
              <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => addToast('Account settings saved', 'info')}>
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '540px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                Notification Preferences
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.86rem' }}>
                <input
                  type="checkbox"
                  checked={notificationsEmail}
                  onChange={(e) => setNotificationsEmail(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Email Digests & Task Mentions</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Receive an email when assigned or mentioned on a board.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.86rem' }}>
                <input
                  type="checkbox"
                  checked={notificationsSlack}
                  onChange={(e) => setNotificationsSlack(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Real-time Browser Desktop Notifications</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Show notifications when colleagues move or update tasks.</div>
                </div>
              </label>

              <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => addToast('Notification settings saved', 'info')}>
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '540px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                Workspace Settings ({currentOrg?.name})
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Tenant data isolation is enforced at the database discriminator and query boundary level.
              </p>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Current Org:</strong> {currentOrg?.name} ({currentOrg?.slug})</div>
                <div><strong>Current Active Branch:</strong> {currentTenant?.name} ({currentTenant?.id})</div>
                <div><strong>Data Isolation Engine:</strong> Active (Row-Level Multi-Tenant Filter)</div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '540px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                Security & Two-Factor Authentication
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>Two-Factor Authentication (2FA)</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Enforced for all Organization and Branch administrators.</div>
                </div>
                <span className="badge badge-green">Enforced</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
