import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Users,
  Calendar,
  Activity,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function OverviewPage() {
  const { currentUser, currentTenant, setActiveDrawerTask, setIsCreateTaskModalOpen } = useApp();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api.getOverviewStats()
      .then(data => {
        if (isMounted) {
          setStats(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load overview stats:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentTenant?.id]);

  if (isLoading || !stats) {
    return (
      <div className="page-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading workspace overview...
        </div>
      </div>
    );
  }

  const { summary, myAssignedTasks, upcomingDeadlines, projectProgress, teamAvailability } = stats;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {currentUser?.name?.split(' ')[0] || 'User'}</h1>
          <p className="page-subtitle">Here's what's happening across {currentTenant?.name || 'your workspace'}.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/projects')}
          >
            <span>View Board</span>
            <ArrowRight size={14} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreateTaskModalOpen(true)}
          >
            <Plus size={14} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* 5 Summary Statistics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Projects</span>
            <FolderKanban size={18} color="var(--accent-primary)" />
          </div>
          <div className="metric-value">{summary.totalProjects}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Tasks</span>
            <TrendingUp size={18} color="#0284c7" />
          </div>
          <div className="metric-value">{summary.totalTasks}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">In Progress</span>
            <Clock size={18} color="var(--color-warning)" />
          </div>
          <div className="metric-value">{summary.inProgress}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Completed</span>
            <CheckCircle2 size={18} color="var(--color-success)" />
          </div>
          <div className="metric-value">{summary.completed}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Overdue Tasks</span>
            <AlertTriangle size={18} color="var(--color-danger)" />
          </div>
          <div className="metric-value" style={{ color: summary.overdueTasks > 0 ? 'var(--color-danger)' : 'inherit' }}>
            {summary.overdueTasks}
          </div>
        </div>
      </div>

      {/* Main Grid: My Tasks & Project Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Section 2: My Assigned Tasks */}
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>My Assigned Tasks</span>
            <button
              onClick={() => navigate('/my-tasks')}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              View All ({myAssignedTasks.length})
            </button>
          </div>

          {myAssignedTasks.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No tasks currently assigned to you in this branch.
            </div>
          ) : (
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {myAssignedTasks.map(task => (
                  <tr
                    key={task.id}
                    onClick={() => setActiveDrawerTask(task)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600 }}>{task.title}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{task.project_name}</td>
                    <td>
                      <span className={`badge ${
                        task.priority === 'URGENT' ? 'badge-red' :
                        task.priority === 'HIGH' ? 'badge-amber' :
                        task.priority === 'MEDIUM' ? 'badge-blue' : 'badge-gray'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td><span className="badge badge-gray">{task.status_name}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 5: Project Progress */}
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, fontSize: '0.92rem' }}>
            Project Progress
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {projectProgress.map(proj => (
              <div key={proj.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                  <span>{proj.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{proj.percentage}%</span>
                </div>
                <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${proj.percentage}%`,
                      height: '100%',
                      backgroundColor: proj.percentage === 100 ? 'var(--color-success)' : 'var(--accent-primary)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {proj.completed} of {proj.total} tasks completed
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Upcoming Deadlines & Team Availability */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Section 4: Upcoming Deadlines */}
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="var(--accent-primary)" />
            <span>Upcoming Deadlines</span>
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {upcomingDeadlines.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No pending deadlines this week.
              </div>
            ) : (
              upcomingDeadlines.map(d => (
                <div
                  key={d.id}
                  onClick={() => setActiveDrawerTask(d)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                  className="sidebar-nav-item"
                >
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{d.title}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{d.project_name}</div>
                  </div>
                  <span className="badge badge-amber">{new Date(d.due_date).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 6: Team Availability */}
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--color-success)" />
            <span>Branch Team Availability</span>
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {teamAvailability.map(member => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={member.avatar} alt={member.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{member.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.role}</div>
                  </div>
                </div>
                <span className="badge badge-gray">{member.active_tasks} active tasks</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
