import React, { useState } from 'react'
import { Sidebar, type NavItemKey } from './Sidebar'
import { TopNav } from './TopNav'
import type { AuthUser } from '../../api/types'

interface AppLayoutProps {
  user: AuthUser | null
  activeNav: NavItemKey
  onNavigate: (item: NavItemKey) => void
  onSignOut: () => void
  onAddProductClick?: () => void
  pageTitle?: string
  breadcrumb?: { section: string; page: string }
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  activeNav,
  onNavigate,
  onSignOut,
  onAddProductClick,
  pageTitle,
  breadcrumb,
  children,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="digexa-app-shell">
      {/* Sidebar */}
      <Sidebar
        activeItem={activeNav}
        onNavigate={onNavigate}
        user={user}
        onSignOut={onSignOut}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="digexa-app-main">
        {/* Top Navbar */}
        <TopNav
          user={user}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onAddProductClick={onAddProductClick}
          title={pageTitle}
          breadcrumb={breadcrumb}
        />

        {/* Page Viewport */}
        <main className="digexa-content-viewport">{children}</main>
      </div>
    </div>
  )
}

