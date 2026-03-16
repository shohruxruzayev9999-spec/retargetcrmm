// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Loyihalar from './pages/Loyihalar';
import ProjectDetail from './pages/ProjectDetail';
import Xodimlar from './pages/Xodimlar';
import Syomka from './pages/Syomka';
import Uchrashuvlar from './pages/Uchrashuvlar';
import Bildirishnomalar from './pages/Bildirishnomalar';
import Hisobotlar from './pages/Hisobotlar';
import Workflow from './pages/Workflow';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppProvider>
              <Layout />
            </AppProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Loyihalar />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route
          path="employees"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager', 'supervisor']}>
              <Xodimlar />
            </ProtectedRoute>
          }
        />
        <Route path="shoots" element={<Syomka />} />
        <Route path="meetings" element={<Uchrashuvlar />} />
        <Route path="notifications" element={<Bildirishnomalar />} />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'investor']}>
              <Hisobotlar />
            </ProtectedRoute>
          }
        />
        <Route path="workflow" element={<Workflow />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
