import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Loader from '../components/Loader';
import Alert from '../components/Alert';

const COLORS = ['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#a855f7', '#ec4899', '#64748b'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/bugs/stats/dashboard');
        setStats(res.data.stats);
        setCharts(res.data.charts);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="page-header">
          <h1>Dashboard</h1>
          <p>Overview of all reported bugs and AI triage activity</p>
        </header>

        <Alert type="error" message={error} />

        {loading ? (
          <Loader label="Loading dashboard..." />
        ) : (
          <>
            <div className="stat-grid">
              <StatCard label="Total Bugs" value={stats.totalBugs} icon="🐞" accent="default" />
              <StatCard label="Critical Bugs" value={stats.criticalBugs} icon="🔥" accent="critical" />
              <StatCard label="High Priority" value={stats.highPriorityBugs} icon="⚠️" accent="high" />
              <StatCard label="Open Bugs" value={stats.openBugs} icon="📂" accent="open" />
              <StatCard label="Resolved Bugs" value={stats.resolvedBugs} icon="✅" accent="resolved" />
            </div>

            <div className="chart-grid">
              <div className="chart-card">
                <h3>Bugs by Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Bugs by Priority</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={charts.byPriority} dataKey="count" nameKey="label" outerRadius={95} label>
                      {charts.byPriority.map((entry, idx) => (
                        <Cell key={entry.label} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Bugs by Status</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.byStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="label" type="category" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
