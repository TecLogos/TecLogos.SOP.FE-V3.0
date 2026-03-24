import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './shared/layouts/MainLayout'
import { PageLoader } from './shared/components/Loaders'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminSopsPage = lazy(() => import('./pages/admin/AdminSopsPage'))
const AdminSopFormPage = lazy(() => import('./pages/admin/AdminSopFormPage'))
const AdminSopTrackingPage = lazy(() => import('./pages/admin/AdminSopTrackingPage'))
const AdminEmployeesPage = lazy(() => import('./pages/admin/AdminEmployeesPage'))
const AdminEmployeeFormPage = lazy(() => import('./pages/admin/AdminEmployeeFormPage'))
const AdminWorkflowPage = lazy(() => import('./pages/admin/AdminWorkflowPage').then(m => ({ default: m.AdminWorkflowPage })))
const AdminWorkflowFormPage = lazy(() => import('./pages/admin/AdminWorkflowFormPage'))
const AdminGroupsPage = lazy(() => import('./pages/admin/AdminGroupsPage'))
const AdminGroupFormPage = lazy(() => import('./pages/admin/AdminGroupFormPage'))

// Shared single pending approvals page (all non-admin roles)
const PendingApprovalsPage = lazy(() => import('./pages/pending/PendingApprovalsPage'))

const ROLE_HOME = {
  Admin: '/admin/dashboard',
  Initiator: '/pending/approvals',
  Supervisor: '/pending/approvals',
  Approver: '/pending/approvals',
}

function Protected({ allowedRoles, children }) {
  const { user, loading, role } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!role) return <PageLoader />

  if (allowedRoles && !allowedRoles.includes(role)) {
    const home = ROLE_HOME[role] || '/login'
    return <Navigate to={home} replace />
  }

  return children
}

function RoleRedirect() {
  const { user, loading, role } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!role) return <PageLoader />
  return <Navigate to={ROLE_HOME[role] || '/pending/approvals'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={(
              <Protected allowedRoles={['Admin']}>
                <MainLayout />
              </Protected>
            )}
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="sops" element={<AdminSopsPage />} />
            <Route path="sops/new" element={<AdminSopFormPage />} />
            <Route path="sops/view/:id" element={<AdminSopFormPage />} />
            <Route path="sops/edit/:id" element={<AdminSopFormPage />} />
            <Route path="sops/:id/tracking" element={<AdminSopTrackingPage />} />

            <Route path="employees" element={<AdminEmployeesPage />} />
            <Route path="employees/new" element={<AdminEmployeeFormPage />} />
            <Route path="employees/view/:id" element={<AdminEmployeeFormPage />} />
            <Route path="employees/edit/:id" element={<AdminEmployeeFormPage />} />

            <Route path="groups" element={<AdminGroupsPage />} />
            <Route path="groups/new" element={<AdminGroupFormPage />} />
            <Route path="groups/view/:id" element={<AdminGroupFormPage />} />
            <Route path="groups/edit/:id" element={<AdminGroupFormPage />} />

            <Route path="workflow" element={<AdminWorkflowPage />} />
            <Route path="workflow/new" element={<AdminWorkflowFormPage />} />
            <Route path="workflow/view/:id" element={<AdminWorkflowFormPage />} />
            <Route path="workflow/edit/:id" element={<AdminWorkflowFormPage />} />

            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Pending Approvals */}
          <Route
            path="/pending"
            element={(
              <Protected allowedRoles={['Approver', 'Supervisor', 'Initiator']}>
                <MainLayout />
              </Protected>
            )}
          >
            <Route path="approvals" element={<PendingApprovalsPage />} />
            <Route index element={<Navigate to="/pending/approvals" replace />} />
          </Route>

          {/* Legacy role routes */}
          <Route path="/approver/*" element={<Navigate to="/pending/approvals" replace />} />
          <Route path="/supervisor/*" element={<Navigate to="/pending/approvals" replace />} />
          <Route path="/initiator/*" element={<Navigate to="/pending/approvals" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
