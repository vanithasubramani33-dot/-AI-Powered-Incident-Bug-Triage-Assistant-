import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Alert from '../components/Alert';

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function BugDetails() {
  const { id } = useParams();
  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retriaging, setRetriaging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bugs/${id}`);
      setBug(res.data.bug);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bug');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(e) {
    const status = e.target.value;
    try {
      await api.put(`/bugs/${id}/status`, { status });
      setSuccess('Status updated');
      load();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  }

  async function handleRetriage() {
    setRetriaging(true);
    try {
      await api.post(`/bugs/${id}/triage`);
      setSuccess('AI triage re-run successfully');
      load();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to re-run triage');
    } finally {
      setRetriaging(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="page-header">
          <Link to="/bugs" className="back-link">← Back to Bug List</Link>
          <h1>Bug Details</h1>
        </header>

        <Alert type="error" message={error} onClose={() => setError('')} />
        <Alert type="success" message={success} />

        {loading ? (
          <Loader label="Loading bug details..." />
        ) : !bug ? (
          <p>Bug not found.</p>
        ) : (
          <div className="split-layout">
            <div className="card">
              <div className="detail-title-row">
                <h2>{bug.title}</h2>
                <select className="field-input status-select" value={bug.status} onChange={handleStatusChange}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <DetailBlock label="Description" value={bug.description} />
              <DetailBlock label="Steps to Reproduce" value={bug.stepsToReproduce || 'N/A'} />
              <DetailBlock label="Error Message" value={bug.errorMessage || 'N/A'} mono />

              <div className="field-row">
                <DetailBlock label="Severity" value={bug.severity} />
                <DetailBlock label="Environment" value={bug.environment} />
              </div>
              <div className="field-row">
                <DetailBlock label="Reporter" value={bug.reporter} />
                <DetailBlock label="Created" value={new Date(bug.createdAt).toLocaleString()} />
              </div>
            </div>

            <div className="card result-card">
              <div className="detail-title-row">
                <h3>AI Triage Result</h3>
                <button className="btn-secondary" onClick={handleRetriage} disabled={retriaging}>
                  {retriaging ? 'Re-analyzing...' : '🔄 Re-run AI Triage'}
                </button>
              </div>

              {bug.triageResult ? (
                <div className="triage-result">
                  <ResultRow label="Category" value={bug.category} />
                  <ResultRow label="Priority" value={bug.priority} badge />
                  <ResultRow label="Assigned Team" value={bug.assignedTeam} />
                  <ResultRow label="Assigned To" value={bug.assignedTo} />
                  <ResultRow label="Root Cause" value={bug.triageResult.rootCause} />
                  <ResultRow label="Recommended Action" value={bug.triageResult.recommendedAction} />
                  <ResultRow label="Confidence Score" value={`${bug.triageResult.confidenceScore}%`} />
                  <div className="engine-tag">Engine: {bug.triageResult.engine}</div>
                </div>
              ) : (
                <p className="muted">No triage result yet.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailBlock({ label, value, mono }) {
  return (
    <div className="detail-block">
      <div className="result-label">{label}</div>
      <div className={mono ? 'detail-value mono' : 'detail-value'}>{value}</div>
    </div>
  );
}

function ResultRow({ label, value, badge }) {
  return (
    <div className="result-row">
      <span className="result-label">{label}</span>
      <span className={badge ? `priority-badge priority-${value}` : 'result-value'}>{value}</span>
    </div>
  );
}
