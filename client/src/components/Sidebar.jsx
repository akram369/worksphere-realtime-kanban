import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  Activity,
  Users,
  Building2,
  GitBranch,
  UserCheck,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Briefcase,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function Sidebar() {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    organizations,
    currentOrg,
    switchOrg,
    tenants,
    currentTenant,
    switchTenant,
    currentUser,
    userRole,
    logout
  } = useApp();

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mainNavItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'My Tasks', to: '/my-tasks', icon: CheckSquare },
    { label: 'Projects / Boards', to: '/projects', icon: Kanban },
    { label: 'Activity', to: '/activity', icon: Activity },
    { label: 'Team Members', to: '/team', icon: Users },
  ];

  const managementNavItems = [
    { label: 'Organizations', to: '/organizations', icon: Building2 },
    { label: 'Branches / Tenants', to: '/branches', icon: GitBranch },
    { label: 'User Management', to: '/users-management', icon: UserCheck },
  ];

  const bottomNavItems = [
    { label: 'Settings', to: '/settings', icon: Settings },
    { label: 'Help & Support', to: '/help', icon: HelpCircle },
  ];

  return (
    <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Top Brand & Hierarchy Selectors */}
      <div className="sidebar-header">
        <div className="brand-row">
          <NavLink to="/" className="brand-logo-wrap">
            <div className="brand-icon-box">
              <Briefcase size={18} />
            </div>
            {!sidebarCollapsed && <span>WorkSphere</span>}
          </NavLink>
          <button
            className="btn-icon"
            style={{ width: '26px', height: '26px' }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="sidebar-context-box">
            {/* Organization Selector */}
            <div className="context-row">
              <Building2 size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <select
                className="context-select"
                value={currentOrg?.id || ''}
                onChange={(e) => switchOrg(e.target.value)}
                title="Select Organization"
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Tenant/Branch Selector */}
            <div className="context-row" style={{ paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <GitBranch size={15} color="#059669" style={{ flexShrink: 0 }} />
              <select
                className="context-select"
                value={currentTenant?.id || ''}
                onChange={(e) => switchTenant(e.target.value)}
                title="Select Branch (Tenant)"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="sidebar-scrollable">
        <div>
          {!sidebarCollapsed && <div className="sidebar-section-title">Workspace</div>}
          <ul className="sidebar-nav-list">
            {mainNavItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={17} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!sidebarCollapsed && <div className="sidebar-section-title">Management</div>}
          <ul className="sidebar-nav-list">
            {managementNavItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={17} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: 'auto' }}>
          {!sidebarCollapsed && <div className="sidebar-section-title">Support</div>}
          <ul className="sidebar-nav-list">
            {bottomNavItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={17} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Card & Logout Bottom Section */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user-card"
          onClick={() => navigate('/profile')}
          title="View Profile"
        >
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
            alt={currentUser?.name}
            className="user-avatar-img"
          />
          {!sidebarCollapsed && (
            <div className="user-text-meta">
              <span className="user-display-name">{currentUser?.name}</span>
              <span className="user-role-label">{userRole}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="sidebar-nav-item"
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--color-danger)' }}
          title="Sign out"
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
