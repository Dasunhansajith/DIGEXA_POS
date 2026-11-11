import React from 'react'
import {
  LayoutDashboard,
  Laptop,
  Package,
  Boxes,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Store,
} from 'lucide-react'
import { BrandLogo } from '../common/BrandLogo'
import type { AuthUser } from '../../api/types'

export type NavItemKey =
  | 'dashboard'
  | 'terminal'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'reports'
  | 'settings'

interface SidebarProps {
  activeItem: NavItemKey
  onNavigate: (item: NavItemKey) => void
  user: AuthUser | null
  onSignOut: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem,
  onNavigate,
  user,
  onSignOut,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: Array<{
    key: NavItemKey
    label: string
    icon: React.ReactNode
    badge?: string
    isAvailable: boolean
  }> = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      isAvailable: true,
    },
    {
      key: 'terminal',
      label: 'POS Terminal',
      icon: <Laptop size={18} />,
      badge: 'Live',
      isAvailable: true,
    },
    {
      key: 'products',
      label: 'Products',
      icon: <Package size={18} />,
      isAvailable: true,
    },
    {
      key: 'inventory',
      label: 'Inventory',
      icon: <Boxes size={18} />,
      isAvailable: false,
    },
    {
      key: 'sales',
      label: 'Sales',
      icon: <TrendingUp size={18} />,
      isAvailable: false,
    },
    {
      key: 'customers',
      label: 'Customers',
      icon: <Users size={18} />,
      isAvailable: false,
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <BarChart3 size={18} />,
      isAvailable: false,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      isAvailable: false,
    },
  ]

  const getInitials = (name?: string) => {
    if (!name) return 'ME'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const handleItemClick = (item: (typeof navItems)[0]) => {
    if (item.isAvailable) {
      onNavigate(item.key)
      if (onCloseMobile) onCloseMobile()
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="digexa-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`digexa-sidebar ${isMobileOpen ? 'digexa-sidebar--mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="digexa-sidebar__brand">
          <BrandLogo size="md" />
          <span className="digexa-sidebar__env-tag">POS SaaS</span>
        </div>

        {/* Shop Badge */}
        <div className="digexa-sidebar__shop-card">
          <div className="digexa-sidebar__shop-icon">
            <Store size={16} />
          </div>
          <div className="digexa-sidebar__shop-details">
            <span className="digexa-sidebar__shop-title">Shop #{user?.shopId ?? 1}</span>
            <span className="digexa-sidebar__shop-status">
              <span className="digexa-status-dot" /> Online Sync
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="digexa-sidebar__nav" aria-label="Main menu">
          <div className="digexa-sidebar__nav-section-title">Workspace</div>
          <ul className="digexa-sidebar__nav-list">
            {navItems.map((item) => {
              const isActive = activeItem === item.key
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`digexa-nav-item ${
                      isActive ? 'digexa-nav-item--active' : ''
                    } ${!item.isAvailable ? 'digexa-nav-item--disabled' : ''}`}
                    onClick={() => handleItemClick(item)}
                    aria-current={isActive ? 'page' : undefined}
                    disabled={!item.isAvailable}
                    title={!item.isAvailable ? `${item.label} (Coming soon)` : item.label}
                  >
                    <span className="digexa-nav-item__icon">{item.icon}</span>
                    <span className="digexa-nav-item__label">{item.label}</span>
                    {item.badge && (
                      <span className="digexa-nav-item__badge">{item.badge}</span>
                    )}
                    {!item.isAvailable && !item.badge && (
                      <span className="digexa-nav-item__soon">Soon</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Footer Profile & Sign out */}
        <div className="digexa-sidebar__footer">
          <div className="digexa-user-card">
            <div className="digexa-user-card__avatar">
              {getInitials(user?.fullName)}
            </div>
            <div className="digexa-user-card__info">
              <span className="digexa-user-card__name">
                {user?.fullName || 'POS Merchant'}
              </span>
              <span className="digexa-user-card__email" title={user?.email}>
                {user?.email || 'authenticated'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="digexa-logout-btn"
            onClick={onSignOut}
            title="Sign out of POS session"
            aria-label="Logout"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

