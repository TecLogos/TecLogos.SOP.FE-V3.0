import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './shared/layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import SetPasswordPage from './pages/SetPasswordPage'

// Admin pages
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

// Shared single pending approvals page (all non-admin roles)
import PendingApprovalsPage from './pages/pending/PendingApprovalsPage'

import { PageLoader } from './shared/components/Loaders'

// Role → home path mapping
// Only Admin gets a dashboard; all others go straight to pending list
const ROLE_HOME = {
  Admin:      '/admin/dashboard',
  Initiator:  '/pending/approvals',
  Supervisor: '/pending/approvals',
  Approver:   '/pending/approvals',
}

function Protected({ allowedRoles, children }) {
  const { user, loading, role } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />
  if (!role)   return <PageLoader />

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
  if (!role)   return <PageLoader />
  return <Navigate to={ROLE_HOME[role] || '/pending/approvals'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/"             element={<RoleRedirect />} />

        {/* ── Admin (has dashboard + full management) ── */}
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

          <Route path="groups"             element={<AdminGroupsPage />} />
          <Route path="groups/new"         element={<AdminGroupFormPage />} />
          <Route path="groups/view/:id"    element={<AdminGroupFormPage />} />
          <Route path="groups/edit/:id"    element={<AdminGroupFormPage />} />

          <Route path="workflow"           element={<AdminWorkflowPage />} />
          <Route path="workflow/new"       element={<AdminWorkflowFormPage />} />
          <Route path="workflow/view/:id"  element={<AdminWorkflowFormPage />} />
          <Route path="workflow/edit/:id"  element={<AdminWorkflowFormPage />} />

          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* ── Shared Pending Approvals (Approver, Supervisor, Initiator) ──
            Single dynamic page — backend filters pending SOPs by userId
            No dashboard for non-admin roles; this IS their home page       */}
        <Route path="/pending" element={
          <Protected allowedRoles={['Approver', 'Supervisor', 'Initiator']}>
            <MainLayout />
          </Protected>
        }>
          <Route path="approvals" element={<PendingApprovalsPage />} />
          <Route index element={<Navigate to="/pending/approvals" replace />} />
        </Route>

        {/* Legacy approver routes — redirect to unified pending page */}
        <Route path="/approver/*"   element={<Navigate to="/pending/approvals" replace />} />
        <Route path="/supervisor/*" element={<Navigate to="/pending/approvals" replace />} />
        <Route path="/initiator/*"  element={<Navigate to="/pending/approvals" replace />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
