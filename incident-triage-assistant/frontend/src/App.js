import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateBug from './pages/CreateBug';
import BugList from './pages/BugList';
import BugDetails from './pages/BugDetails';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/bugs/new" element={<ProtectedRoute><CreateBug /></ProtectedRoute>} />
      <Route path="/bugs/:id" element={<ProtectedRoute><BugDetails /></ProtectedRoute>} />
      <Route path="/bugs" element={<ProtectedRoute><BugList /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
