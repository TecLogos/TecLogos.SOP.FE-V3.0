import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, FileText, Users, Shield, Settings,
  LogOut, ChevronRight, FileStack, UserCheck, CheckCircle, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

const navByRole = {
  Admin: [
    { to: '/admin/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/admin/sops',       label: 'Manage SOPs',      icon: FileStack },
    { to: '/admin/employees',  label: 'Employees',        icon: Users },
    { to: '/admin/groups',     label: 'Employee Groups',  icon: Shield },
    { to: '/admin/roles',      label: 'Roles',            icon: BookOpen },
    { to: '/admin/workflow',   label: 'Workflow Setup',   icon: Settings },
  ],
  Initiator: [
    { to: '/initiator/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
    { to: '/initiator/sops',      label: 'My SOPs',     icon: FileText },
  ],
  Supervisor: [
    { to: '/supervisor/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/supervisor/pending',   label: 'Pending SOPs', icon: UserCheck },
  ],
  Approver: [
    { to: '/approver/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/approver/pending',   label: 'Pending SOPs', icon: CheckCircle },
  ],
}

export default function Sidebar() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const links = navByRole[role] || []

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-surface-950 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
            <FileStack size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">TecLogos</p>
            <p className="text-[10px] text-surface-400 font-mono uppercase tracking-widest">SOP System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
               ${isActive
                 ? 'bg-brand-600 text-white shadow-glow'
                 : 'text-surface-400 hover:text-white hover:bg-surface-800'}`
            }>
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-surface-800">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 bg-brand-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-surface-500 truncate">{role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-400 
                     hover:text-red-400 hover:bg-surface-800 rounded-xl transition-all">
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
