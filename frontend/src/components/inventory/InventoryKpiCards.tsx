import React from 'react'
import { Package, Layers, AlertTriangle, AlertCircle } from 'lucide-react'
import type { InventoryOverviewResponse, InventoryStatus } from '../../api/types'

interface InventoryKpiCardsProps {
  overview: InventoryOverviewResponse | null
  isLoading: boolean
  onFilterByStatus?: (status: InventoryStatus | '') => void
  currentStatusFilter?: InventoryStatus | ''
}

export const InventoryKpiCards: React.FC<InventoryKpiCardsProps> = ({
  overview,
  isLoading,
  onFilterByStatus,
  currentStatusFilter,
}) => {
  if (isLoading || !overview) {
    return (
      <div className="digexa-inventory-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="digexa-inventory-kpi-card">
            <div className="digexa-inventory-kpi-card__header">
              <div className="digexa-skeleton-box" style={{ width: '80px', height: '14px' }} />
              <div className="digexa-skeleton-box" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
            </div>
            <div className="digexa-skeleton-box" style={{ width: '60px', height: '32px', marginBottom: '8px' }} />
            <div className="digexa-skeleton-box" style={{ width: '120px', height: '12px' }} />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      id: 'total-products',
      title: 'Total Products',
      value: overview.totalProducts.toLocaleString(),
      sub: 'Catalog items tracked',
      icon: <Package size={20} />,
      variant: 'emerald',
      filterStatus: '' as const,
    },
    {
      id: 'units-in-stock',
      title: 'Total Units in Stock',
      value: overview.totalUnitsInStock.toLocaleString(),
      sub: 'Aggregate inventory volume',
      icon: <Layers size={20} />,
      variant: 'blue',
      filterStatus: '' as const,
    },
    {
      id: 'low-stock',
      title: 'Low Stock',
      value: overview.lowStockProducts.toLocaleString(),
      sub: 'At or below threshold',
      icon: <AlertTriangle size={20} />,
      variant: 'amber',
      filterStatus: 'LOW_STOCK' as const,
    },
    {
      id: 'out-of-stock',
      title: 'Out of Stock',
      value: overview.outOfStockProducts.toLocaleString(),
      sub: 'Immediate restock required',
      icon: <AlertCircle size={20} />,
      variant: 'red',
      filterStatus: 'OUT_OF_STOCK' as const,
    },
  ]

  return (
    <div className="digexa-inventory-kpi-grid">
      {cards.map((card) => {
        const isSelected = card.filterStatus && currentStatusFilter === card.filterStatus
        const isClickable = Boolean(card.filterStatus && onFilterByStatus)

        return (
          <div
            key={card.id}
            className={`digexa-inventory-kpi-card digexa-inventory-kpi-card--${card.variant}`}
            style={{
              cursor: isClickable ? 'pointer' : 'default',
              boxShadow: isSelected ? '0 0 0 2px #50c45e, 0 4px 12px rgba(80, 196, 94, 0.15)' : undefined,
            }}
            onClick={() => {
              if (isClickable && onFilterByStatus) {
                onFilterByStatus(isSelected ? '' : card.filterStatus)
              }
            }}
            title={isClickable ? `Click to filter by ${card.title}` : undefined}
          >
            <div className="digexa-inventory-kpi-card__header">
              <span className="digexa-inventory-kpi-card__title">{card.title}</span>
              <div
                className={`digexa-inventory-kpi-card__icon-wrap digexa-inventory-kpi-card__icon-wrap--${card.variant}`}
              >
                {card.icon}
              </div>
            </div>
            <div
              className={`digexa-inventory-kpi-card__value ${
                card.variant === 'amber'
                  ? 'digexa-inventory-kpi-card__value--amber'
                  : card.variant === 'red'
                  ? 'digexa-inventory-kpi-card__value--red'
                  : ''
              }`}
            >
              {card.value}
            </div>
            <div className="digexa-inventory-kpi-card__sub">{card.sub}</div>
          </div>
        )
      })}
    </div>
  )
}

