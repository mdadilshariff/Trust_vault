import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { authApi } from './api'
import { useAuthStore } from './store/auth'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import UploadPage from './pages/UploadPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import SharedWithMePage from './pages/SharedWithMePage'
import AuditPage from './pages/AuditPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import UserManagementPage from './pages/UserManagementPage'
import IntegrityPage from './pages/IntegrityPage'
import { AccessDeniedPage, NotFoundPage } from './pages/ErrorPages'

export default function App() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // Restore session on mount
    authApi.me()
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))

    // Handle 401 events from axios interceptor
    const handler = () => { setUser(null) }
    window.addEventListener('tv:unauthorized', handler)
    return () => window.removeEventListener('tv:unauthorized', handler)
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: '"JetBrains Mono", monospace',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#18181b' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#18181b' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="/not-found"     element={<NotFoundPage />} />

        {/* Protected — regular users */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard"        element={<DashboardPage />} />
            <Route path="/documents"        element={<DocumentsPage />} />
            <Route path="/documents/:id"    element={<DocumentDetailPage />} />
            <Route path="/upload"           element={<UploadPage />} />
            <Route path="/shared"           element={<SharedWithMePage />} />
            <Route path="/audit/my"         element={<AuditPage adminMode={false} />} />

            {/* Admin-only */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin"            element={<AdminDashboardPage />} />
              <Route path="/admin/users"      element={<UserManagementPage />} />
              <Route path="/admin/audit"      element={<AuditPage adminMode />} />
              <Route path="/admin/integrity"  element={<IntegrityPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
