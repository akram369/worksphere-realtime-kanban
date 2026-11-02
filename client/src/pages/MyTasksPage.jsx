import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export function MyTasksPage() {
  const { currentTenant, setActiveDrawerTask, setIsCreateTaskModalOpen } = useApp();
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, todo, in_progress, completed, overdue, my_assigned
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('dueDate');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyTasks({
        filter: activeTab,
        priority: priorityFilter,
        search,
        sortBy
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load my-tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentTenant?.id, activeTab, priorityFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const tabs = [
    { id: 'all', label: 'All Tasks' },
    { id: 'my_assigned', label: 'Assigned to Me' },
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks & Work Items</h1>
          <p className="page-subtitle">Manage, filter, and track tasks across projects in {currentTenant?.name}.</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setIsCreateTaskModalOpen(true)}
        >
          <Plus size={15} />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="global-search-box" style={{ width: '280px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input-field"
              placeholder="Search by title, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="form-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent (P0)</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} color="var(--text-muted)" />
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            No tasks found matching your filter criteria.
          </div>
        ) : (
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Task Title</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr
                  key={task.id}
                  onClick={() => setActiveDrawerTask(task)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</div>
                    {task.tags && task.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {task.tags.map((t, idx) => (
                          <span key={idx} className="badge badge-gray" style={{ fontSize: '0.66rem' }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
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
                  <td>
                    <span className="badge badge-gray">{task.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td>
                    {task.assignee_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={task.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces'}
                          alt={task.assignee_name}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: '0.8rem' }}>{task.assignee_name}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.78rem' }}>Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
