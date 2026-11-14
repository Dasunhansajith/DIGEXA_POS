import React from 'react'
import { ShoppingBag, TrendingUp, Calculator } from 'lucide-react'
import type { SalesSummaryResponse } from '../../api/types'

interface SalesKpiCardsProps {
  summary: SalesSummaryResponse | null
  isLoading: boolean
}

export const SalesKpiCards: React.FC<SalesKpiCardsProps> = ({ summary, isLoading }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(val || 0)
  }

  if (isLoading || !summary) {
    return (
      <div className="digexa-sales-kpi-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="digexa-sales-kpi-card">
            <div className="digexa-sales-kpi-card__header">
              <div className="digexa-skeleton-box" style={{ width: '80px', height: '14px' }} />
              <div className="digexa-skeleton-box" style={{ width: '38px', height: '38px', borderRadius: '10px' }} />
            </div>
            <div className="digexa-skeleton-box" style={{ width: '120px', height: '32px', marginBottom: '8px' }} />
            <div className="digexa-skeleton-box" style={{ width: '100px', height: '12px' }} />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      id: 'total-sales',
      title: 'Total Transactions',
      value: summary.totalSales.toLocaleString(),
      sub: 'Completed checkout orders',
      icon: <ShoppingBag size={20} />,
      variant: 'emerald',
    },
    {
      id: 'total-revenue',
      title: 'Total Revenue (LKR)',
      value: formatCurrency(summary.totalRevenue),
      sub: 'Net revenue from filtered sales',
      icon: <TrendingUp size={20} />,
      variant: 'blue',
    },
    {
      id: 'average-sale',
      title: 'Average Sale Value',
      value: formatCurrency(summary.averageSale),
      sub: 'Mean basket size per transaction',
      icon: <Calculator size={20} />,
      variant: 'violet',
    },
  ]

  return (
    <div className="digexa-sales-kpi-grid">
      {cards.map((card) => (
        <div key={card.id} className={`digexa-sales-kpi-card digexa-sales-kpi-card--${card.variant}`}>
          <div className="digexa-sales-kpi-card__header">
            <span className="digexa-sales-kpi-card__title">{card.title}</span>
            <div className={`digexa-sales-kpi-card__icon-wrap digexa-sales-kpi-card__icon-wrap--${card.variant}`}>
              {card.icon}
            </div>
          </div>
          <div className="digexa-sales-kpi-card__value">{card.value}</div>
          <div className="digexa-sales-kpi-card__sub">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}

