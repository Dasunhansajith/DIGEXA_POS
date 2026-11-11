import React from 'react'
import { Menu, Plus, Store } from 'lucide-react'
import type { AuthUser } from '../../api/types'

interface TopNavProps {
  user: AuthUser | null
  onOpenMobileMenu: () => void
  onAddProductClick?: () => void
  breadcrumb?: { section: string; page: string }
  title?: string
}

export const TopNav: React.FC<TopNavProps> = ({
  user,
  onOpenMobileMenu,
  onAddProductClick,
  breadcrumb = { section: 'Workspace', page: 'Products' },
  title = 'Product Management',
}) => {
  const getInitials = (name?: string) => {
    if (!name) return 'ME'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <header className="digexa-topnav">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="digexa-topnav__left">
        <button
          type="button"
          className="digexa-mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>

        <div className="digexa-breadcrumbs-wrap">
          <nav className="digexa-breadcrumbs" aria-label="Breadcrumb">
            <span className="digexa-breadcrumb__item">{breadcrumb.section}</span>
            <span className="digexa-breadcrumb__sep">/</span>
            <span className="digexa-breadcrumb__item digexa-breadcrumb__item--active">
              {breadcrumb.page}
            </span>
          </nav>
          <h1 className="digexa-page-title">{title}</h1>
        </div>
      </div>

      {/* Right: Shop Pill & Actions */}
      <div className="digexa-topnav__right">
        {/* Active Shop Badge */}
        <div className="digexa-shop-badge">
          <Store size={14} className="digexa-shop-badge__icon" />
          <span className="digexa-shop-badge__name">Shop #{user?.shopId ?? 1}</span>
          <span className="digexa-shop-badge__dot" />
        </div>

        {/* Quick Add Product Button */}
        {onAddProductClick && (
          <button
            type="button"
            className="digexa-btn digexa-btn--primary digexa-btn--sm"
            onClick={onAddProductClick}
          >
            <Plus size={15} />
            <span className="hidden-mobile">New Product</span>
          </button>
        )}

        {/* User Avatar Chip */}
        <div
          className="digexa-user-avatar-chip"
          title={`${user?.fullName || 'User'} (${user?.role || 'OWNER'})`}
        >
          <span className="digexa-user-avatar-chip__initials">
            {getInitials(user?.fullName)}
          </span>
        </div>
      </div>
    </header>
  )
}
