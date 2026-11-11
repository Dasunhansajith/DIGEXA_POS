import React from 'react'
import { Package, Boxes, AlertTriangle, AlertOctagon } from 'lucide-react'
import type { ProductResponse } from '../../api/types'

interface ProductStatsProps {
  products: ProductResponse[]
  isLoading?: boolean
}

export const ProductStats: React.FC<ProductStatsProps> = ({ products, isLoading = false }) => {
  // Real backend calculations
  const totalProducts = products.length
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0)
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length
  const outOfStockCount = products.filter((p) => p.stock <= 0).length

  const stats = [
    {
      id: 'total-products',
      label: 'Total Products',
      value: isLoading ? '—' : totalProducts.toLocaleString(),
      subtext: 'Catalog SKUs',
      icon: <Package size={20} />,
      colorClass: 'digexa-stat-card--primary',
    },
    {
      id: 'total-stock',
      label: 'Total Stock Units',
      value: isLoading ? '—' : totalStockUnits.toLocaleString(),
      subtext: 'Available in inventory',
      icon: <Boxes size={20} />,
      colorClass: 'digexa-stat-card--neutral',
    },
    {
      id: 'low-stock',
      label: 'Low Stock Products',
      value: isLoading ? '—' : lowStockCount.toLocaleString(),
      subtext: 'Stock ≤ 10 units',
      icon: <AlertTriangle size={20} />,
      colorClass: lowStockCount > 0 ? 'digexa-stat-card--warning' : 'digexa-stat-card--neutral',
      badge: lowStockCount > 0 ? 'Needs Attention' : 'Healthy',
    },
    {
      id: 'out-of-stock',
      label: 'Out of Stock Products',
      value: isLoading ? '—' : outOfStockCount.toLocaleString(),
      subtext: '0 units remaining',
      icon: <AlertOctagon size={20} />,
      colorClass: outOfStockCount > 0 ? 'digexa-stat-card--danger' : 'digexa-stat-card--neutral',
      badge: outOfStockCount > 0 ? 'Action Required' : 'All In Stock',
    },
  ]

  return (
    <div className="digexa-stats-grid">
      {stats.map((stat) => (
        <div key={stat.id} className={`digexa-stat-card ${stat.colorClass}`}>
          <div className="digexa-stat-card__header">
            <span className="digexa-stat-card__label">{stat.label}</span>
            <div className="digexa-stat-card__icon">{stat.icon}</div>
          </div>
          <div className="digexa-stat-card__body">
            <span className="digexa-stat-card__value">{stat.value}</span>
            <div className="digexa-stat-card__footer">
              <span className="digexa-stat-card__subtext">{stat.subtext}</span>
              {stat.badge && (
                <span className="digexa-stat-card__badge">{stat.badge}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

