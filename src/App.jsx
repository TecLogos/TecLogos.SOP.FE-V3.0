import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './shared/layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import SetPasswordPage from './pages/SetPasswordPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSopsPage from './pages/admin/AdminSopsPage'
import AdminSopFormPage from './pages/admin/AdminSopFormPage'
import AdminSopTrackingPage from './pages/admin/AdminSopTrackingPage'
import AdminEmployeesPage from './pages/admin/AdminEmployeesPage'
import AdminEmployeeFormPage from './pages/admin/AdminEmployeeFormPage'
import { AdminWorkflowPage } from './pages/admin/AdminWorkflowPage'
import AdminWorkflowFormPage from './pages/admin/AdminWorkflowFormPage'
import AdminGroupsPage from './pages/admin/AdminGroupsPage'
import AdminGroupFormPage from './pages/admin/AdminGroupFormPage'
import { ApproverDashboard, ApproverPendingPage } from './pages/approver/ApproverPages'
import { PageLoader } from './shared/components/Loaders'

const ROLE_HOME = {
  Admin:      '/admin/dashboard',
  Initiator:  '/initiator/dashboard',
  Supervisor: '/supervisor/dashboard',
  Approver:   '/approver/dashboard',
}

function Protected({ allowedRoles, children }) {
  const { user, loading, role } = useAuth()
  const location = useLocation()

  // Still loading auth state — show spinner, never redirect prematurely
  if (loading) return <PageLoader />

  // Not authenticated
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  // Authenticated but role not yet resolved (fetchMe in flight) — wait
  if (!role) return <PageLoader />

  // Authenticated but wrong role for this section
  if (allowedRoles && !allowedRoles.includes(role)) {
    const home = ROLE_HOME[role] || '/login'
    return <Navigate to={home} replace />
  }

  return children
}

function RoleRedirect() {
  const { user, loading, role } = useAuth()
  if (loading) return <PageLoader />
  if (!user)   return <Navigate to="/login" replace />
  // Wait for role to resolve before redirecting
  if (!role)   return <PageLoader />
  return <Navigate to={ROLE_HOME[role] || '/initiator/dashboard'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/"             element={<RoleRedirect />} />

        {/* Admin */}
        <Route path="/admin" element={
          <Protected allowedRoles={['Admin']}><MainLayout /></Protected>
        }>
          <Route path="dashboard"          element={<AdminDashboard />} />
          <Route path="sops"               element={<AdminSopsPage />} />
          <Route path="sops/new"           element={<AdminSopFormPage />} />
          <Route path="sops/view/:id"      element={<AdminSopFormPage />} />
          <Route path="sops/edit/:id"      element={<AdminSopFormPage />} />
          <Route path="sops/:id/tracking"  element={<AdminSopTrackingPage />} />

          <Route path="employees"          element={<AdminEmployeesPage />} />
          <Route path="employees/new"      element={<AdminEmployeeFormPage />} />
          <Route path="employees/view/:id" element={<AdminEmployeeFormPage />} />
          <Route path="employees/edit/:id" element={<AdminEmployeeFormPage />} />

          <Route path="groups"               element={<AdminGroupsPage />} />
          <Route path="groups/new"           element={<AdminGroupFormPage />} />
          <Route path="groups/view/:id"      element={<AdminGroupFormPage />} />
          <Route path="groups/edit/:id"      element={<AdminGroupFormPage />} />

          <Route path="workflow"           element={<AdminWorkflowPage />} />
          <Route path="workflow/new"       element={<AdminWorkflowFormPage />} />
          <Route path="workflow/view/:id"  element={<AdminWorkflowFormPage />} />
          <Route path="workflow/edit/:id"  element={<AdminWorkflowFormPage />} />

          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Approver */}
        <Route path="/approver">
          <Route path="dashboard" element={<ApproverDashboard />} />
          <Route path="pending"   element={<ApproverPendingPage />} />
          <Route path="pending/:id/tracking" element={<AdminSopTrackingPage />} />
          <Route index element={<Navigate to="/approver/dashboard" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
