import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const openSidebar  = useCallback(() => setSidebarOpen(true),  [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="h-screen flex flex-col surface">
      {/* Header */}
      <Header onMenuClick={openSidebar} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeSidebar}
            />
            <div className="relative h-full w-64 bg-gray-100 border-r border-gray-200 shadow-2xl animate-slide-in">
              <Sidebar onClose={closeSidebar} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main
          id="app-scroll-container"
          className="flex-1 overflow-y-auto surface"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
