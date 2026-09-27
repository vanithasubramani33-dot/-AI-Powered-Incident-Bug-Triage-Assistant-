import React from 'react';

export default function StatCard({ label, value, accent = 'default', icon }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{value ?? 0}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
