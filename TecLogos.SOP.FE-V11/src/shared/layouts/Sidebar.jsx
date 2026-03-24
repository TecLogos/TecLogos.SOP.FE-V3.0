import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, Settings, FileStack,
  UsersRound , CheckCircle,
} from 'lucide-react'
import { GrGroup } from "react-icons/gr";
import { useAuth } from '../../context/AuthContext'

// ── Nav config per role ────────────────────────────────────────────────────
// Admin:      Dashboard + full management
// All others: Single "Pending Approvals" page only — no dashboard
const navByRole = {
  Admin: [
    { label: 'Dashboard',       to: '/admin/dashboard', icon: Home },
    { label: 'Manage SOPs',     to: '/admin/sops',      icon: FileStack },
    { label: 'Employees',       to: '/admin/employees', icon: UsersRound  },
    { label: 'Employee Groups', to: '/admin/groups',    icon: GrGroup   },
    { label: 'Workflow Setup',  to: '/admin/workflow',  icon: Settings },
  ],
  Approver: [
    { label: 'Pending Approvals', to: '/pending/approvals', icon: CheckCircle },
  ],
  Supervisor: [
    { label: 'Pending Approvals', to: '/pending/approvals', icon: CheckCircle },
  ],
  Initiator: [
    { label: 'Pending Approvals', to: '/pending/approvals', icon: CheckCircle },
  ],
}

function Sidebar({ onClose }) {
  const { role, user } = useAuth()
  const links = navByRole[role] || []

  // Display name from user profile
  const displayName = user?.FullName ?? user?.fullName ?? user?.Email ?? user?.email ?? ''
  const initials    = displayName
    ? displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className="h-full w-62 bg-gray-100 text-slate-800 border-r border-gray-200 shadow-sm flex flex-col overflow-y-auto">
      {/* Mobile close */}
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden mx-4 mt-3 text-right w-full text-gray-400 text-xs hover:text-gray-600"
        >
          Close ✕
        </button>
      )}

      {/* User pill */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{displayName || 'User'}</p>
            <p className="text-[10px] text-gray-400 truncate">{role}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group border
               ${isActive
                 ? 'bg-white border-gray-200 shadow-sm text-slate-900'
                 : 'border-transparent hover:bg-white hover:border-gray-200 text-slate-600 hover:text-slate-900'
               }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex items-center justify-center w-7 h-7 rounded-md shadow-sm transition-colors
                  ${isActive
                    ? 'bg-slate-800 text-white'
                    : 'bg-white/80 group-hover:bg-white text-slate-500 group-hover:text-slate-800'
                  }`}>
                  <Icon size={15} />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <p className="text-xs text-slate-400 text-center select-none">TecLogos SOP System</p>
      </div>
    </aside>
  )
}

export default memo(Sidebar)
