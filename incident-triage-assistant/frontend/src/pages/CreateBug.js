import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Alert from '../components/Alert';

const initialForm = {
  title: '',
  description: '',
  stepsToReproduce: '',
  errorMessage: '',
  severity: 'Medium',
  environment: 'Production',
  reporter: '',
};

export default function CreateBug() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [createdBugId, setCreatedBugId] = useState(null);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setTriageResult(null);
    try {
      const res = await api.post('/bugs', form);
      setTriageResult(res.data.triage);
      setCreatedBugId(res.data.bug._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit bug');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="page-header">
          <h1>Create Bug</h1>
          <p>Submit a bug report and let AI triage it instantly</p>
        </header>

        <Alert type="error" message={error} onClose={() => setError('')} />

        <div className="split-layout">
          <form className="card form-card" onSubmit={handleSubmit}>
            <label className="field-label">Bug Title *</label>
            <input
              className="field-input"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Login button is not working"
              required
            />

            <label className="field-label">Bug Description *</label>
            <textarea
              className="field-input"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the issue in detail"
              required
            />

            <label className="field-label">Steps to Reproduce</label>
            <textarea
              className="field-input"
              name="stepsToReproduce"
              rows={3}
              value={form.stepsToReproduce}
              onChange={handleChange}
              placeholder="1. Go to... 2. Click... 3. See error"
            />

            <label className="field-label">Error Message</label>
            <input
              className="field-input"
              name="errorMessage"
              value={form.errorMessage}
              onChange={handleChange}
              placeholder="Paste any error/stack trace text"
            />

            <div className="field-row">
              <div>
                <label className="field-label">Severity</label>
                <select className="field-input" name="severity" value={form.severity} onChange={handleChange}>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div>
                <label className="field-label">Environment</label>
                <select className="field-input" name="environment" value={form.environment} onChange={handleChange}>
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                </select>
              </div>
            </div>

            <label className="field-label">Reporter Name *</label>
            <input
              className="field-input"
              name="reporter"
              value={form.reporter}
              onChange={handleChange}
              placeholder="Your name"
              required
            />

            <button className="btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Analyzing with AI...' : '🤖 Analyze Bug with AI'}
            </button>
          </form>

          <div className="card result-card">
            <h3>AI Triage Result</h3>
            {!triageResult && !submitting && (
              <p className="muted">Submit the form to see the AI-generated triage result here.</p>
            )}
            {submitting && <p className="muted">Running AI triage...</p>}
            {triageResult && (
              <div className="triage-result">
                <ResultRow label="Category" value={triageResult.category} />
                <ResultRow label="Severity" value={triageResult.severity} />
                <ResultRow label="Priority" value={triageResult.priority} badge />
                <ResultRow label="Root Cause" value={triageResult.rootCause} />
                <ResultRow label="Suggested Team" value={triageResult.suggestedTeam} />
                <ResultRow label="Suggested Assignee" value={triageResult.suggestedAssignee} />
                <ResultRow label="Recommended Action" value={triageResult.recommendedAction} />
                <ResultRow label="Confidence Score" value={`${triageResult.confidenceScore}%`} />
                <div className="engine-tag">Engine: {triageResult.engine}</div>

                <button className="btn-secondary btn-block" onClick={() => navigate(`/bugs/${createdBugId}`)}>
                  View Full Bug Details →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
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
