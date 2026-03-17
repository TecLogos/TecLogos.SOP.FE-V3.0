import { memo, useCallback, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Users, Shield, Settings, FileStack,
  BookOpen, UserCheck, CheckCircle, ChevronDown, ChevronRight, FileText
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navByRole = {
  Admin: [
    { label: 'Dashboard',      to: '/admin/dashboard',  icon: Home },
    { label: 'Manage SOPs',    to: '/admin/sops',       icon: FileStack },
    { label: 'Employees',      to: '/admin/employees',  icon: Users },
    { label: 'Employee Groups',to: '/admin/groups',     icon: Shield },
    { label: 'Roles',          to: '/admin/roles',      icon: BookOpen },
    { label: 'Workflow Setup', to: '/admin/workflow',   icon: Settings },
  ],
  Initiator: [
    { label: 'Dashboard', to: '/initiator/dashboard', icon: Home },
    { label: 'My SOPs',   to: '/initiator/sops',      icon: FileText },
  ],
  Supervisor: [
    { label: 'Dashboard',    to: '/supervisor/dashboard', icon: Home },
    { label: 'Pending SOPs', to: '/supervisor/pending',   icon: UserCheck },
  ],
  Approver: [
    { label: 'Dashboard',    to: '/approver/dashboard', icon: Home },
    { label: 'Pending SOPs', to: '/approver/pending',   icon: CheckCircle },
  ],
}

function Sidebar({ onClose }) {
  const { role } = useAuth()
  const links = navByRole[role] || []

  return (
    <aside className="h-full w-64 bg-gray-100 text-slate-800 border-r border-gray-200 shadow-sm flex flex-col overflow-y-auto">
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden mx-4 mt-3 text-right w-full text-gray-500 text-xs"
        >
          Close
        </button>
      )}

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group border
               ${isActive
                 ? 'bg-white border-gray-200 shadow-sm text-slate-900'
                 : 'border-transparent hover:bg-white hover:border-gray-200 text-slate-700'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex items-center justify-center w-7 h-7 rounded-md shadow-sm transition-colors
                  ${isActive ? 'bg-slate-800 text-white' : 'bg-white/80 group-hover:bg-white text-slate-600 group-hover:text-slate-900'}`}>
                  <Icon size={15} />
                </span>
                <span className="text-sm font-medium">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <p className="text-xs text-slate-500 text-center select-none">TecLogos SOP System</p>
      </div>
    </aside>
  )
}

export default memo(Sidebar)
