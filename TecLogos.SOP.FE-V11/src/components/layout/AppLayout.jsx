import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Bell, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, role } = useAuth()

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay — no backdrop-blur to avoid visual artifacts */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-surface-900/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60">
            <Sidebar />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white rounded-xl shadow-lg text-surface-500"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Topbar — solid white, no backdrop-blur (prevents blur artifacts under modal) */}
        <header className="sticky top-0 z-20 bg-white border-b border-surface-200">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-surface-500 hover:bg-surface-100"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:block">
              <p className="text-xs text-surface-500">
                Signed in as <span className="font-semibold text-surface-700">{role}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors relative">
                <Bell size={18} />
              </button>
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
