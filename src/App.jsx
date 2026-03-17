import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './shared/layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import SetPasswordPage from './pages/SetPasswordPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSopsPage from './pages/admin/AdminSopsPage'
import AdminEmployeesPage from './pages/admin/AdminEmployeesPage'
import { AdminWorkflowPage, AdminRolesPage } from './pages/admin/AdminWorkflowPage'
import AdminGroupsPage from './pages/admin/AdminGroupsPage'
import { InitiatorDashboard, InitiatorSopsPage } from './pages/initiator/InitiatorPages'
import { SupervisorDashboard, SupervisorPendingPage } from './pages/supervisor/SupervisorPages'
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

  if (loading) return <PageLoader />
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />
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
  return <Navigate to={ROLE_HOME[role] || '/login'} replace />
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
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="sops"      element={<AdminSopsPage />} />
          <Route path="employees" element={<AdminEmployeesPage />} />
          <Route path="groups"    element={<AdminGroupsPage />} />
          <Route path="roles"     element={<AdminRolesPage />} />
          <Route path="workflow"  element={<AdminWorkflowPage />} />
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Initiator */}
        <Route path="/initiator" element={
          <Protected allowedRoles={['Initiator']}><MainLayout /></Protected>
        }>
          <Route path="dashboard" element={<InitiatorDashboard />} />
          <Route path="sops"      element={<InitiatorSopsPage />} />
          <Route index element={<Navigate to="/initiator/dashboard" replace />} />
        </Route>

        {/* Supervisor */}
        <Route path="/supervisor" element={
          <Protected allowedRoles={['Supervisor']}><MainLayout /></Protected>
        }>
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="pending"   element={<SupervisorPendingPage />} />
          <Route index element={<Navigate to="/supervisor/dashboard" replace />} />
        </Route>

        {/* Approver */}
        <Route path="/approver" element={
          <Protected allowedRoles={['Approver']}><MainLayout /></Protected>
        }>
          <Route path="dashboard" element={<ApproverDashboard />} />
          <Route path="pending"   element={<ApproverPendingPage />} />
          <Route index element={<Navigate to="/approver/dashboard" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
