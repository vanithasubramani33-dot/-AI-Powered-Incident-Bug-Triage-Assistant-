import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Alert from '../components/Alert';

const CATEGORIES = ['Frontend/UI', 'Backend/API', 'Database', 'Authentication', 'Performance', 'Security', 'Deployment', 'Other'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function BugList() {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', category: '', priority: '', status: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await api.get('/bugs', { params });
      setBugs(res.data.bugs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bugs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(load, 300); // debounce search
    return () => clearTimeout(timeout);
  }, [load]);

  function handleFilterChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="page-header">
          <h1>Bug List</h1>
          <p>Search, filter, and track all reported bugs</p>
        </header>

        <Alert type="error" message={error} />

        <div className="filter-bar">
          <input
            className="field-input"
            name="search"
            placeholder="Search title, description, error..."
            value={filters.search}
            onChange={handleFilterChange}
          />
          <select className="field-input" name="category" value={filters.category} onChange={handleFilterChange}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="field-input" name="priority" value={filters.priority} onChange={handleFilterChange}>
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="field-input" name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <Loader label="Loading bugs..." />
        ) : (
          <div className="card table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bug ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assigned Team</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {bugs.length === 0 && (
                  <tr><td colSpan={8} className="empty-row">No bugs found.</td></tr>
                )}
                {bugs.map((bug) => (
                  <tr key={bug._id}>
                    <td><Link to={`/bugs/${bug._id}`} className="bug-link">#{bug._id.slice(-6)}</Link></td>
                    <td className="title-cell">{bug.title}</td>
                    <td>{bug.category || '—'}</td>
                    <td><span className={`priority-badge priority-${bug.priority}`}>{bug.priority || '—'}</span></td>
                    <td>{bug.severity}</td>
                    <td><span className={`status-badge status-${bug.status?.replace(' ', '-')}`}>{bug.status}</span></td>
                    <td>{bug.assignedTeam || '—'}</td>
                    <td>{new Date(bug.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
