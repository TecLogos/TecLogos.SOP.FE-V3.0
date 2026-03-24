import { memo, useCallback } from 'react'
import { Menu, Power } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

function Header({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, role, logout } = useAuth()

  const handleLogout = useCallback(async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const handleHome = useCallback(() => navigate('/'), [navigate])

  // /me returns { FullName, Email, ... }  (PascalCase from C# JSON)
  const displayName = user?.FullName ?? user?.fullName ?? user?.email ?? user?.Email ?? ''
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-30 h-14 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-500 hover:text-slate-900 hover:bg-gray-200 rounded-md p-1.5 transition"
        >
          <Menu size={22} />
        </button>
        <div onClick={handleHome} className="flex items-center gap-2.5 cursor-pointer select-none">
         
          <div className="hidden sm:block">
            <p className="text-lg font-bold text-red-600 leading-none">TecLogos</p>
            <p className="text-sm text-slate-500 uppercase tracking-widest font-mono">SOP System</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden md:flex flex-row items-center gap-2 mr-2">
            <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 text-xs font-bold">
              {initials}
            </div>
            <span className="text-sm font-semibold text-gray-700">{displayName}</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs font-semibold text-gray-500 tracking-wide">{role}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-semibold text-sm shadow-sm"
        >
          <Power size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}

export default memo(Header)
