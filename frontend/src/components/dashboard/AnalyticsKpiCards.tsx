import React from 'react'
import {
  Banknote,
  ShoppingBag,
  Package,
  TrendingUp,
} from 'lucide-react'
import type { AnalyticsOverviewResponse } from '../../api/types'
import { formatLKR } from '../pos/types'

interface AnalyticsKpiCardsProps {
  overview: AnalyticsOverviewResponse | null
  isLoading?: boolean
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({
  overview,
  isLoading = false,
}) => {
  const cards = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: overview ? formatLKR(overview.totalRevenue) : 'Rs. 0.00',
      subtitle: 'Total gross sales earnings',
      icon: <Banknote size={24} />,
      theme: 'emerald',
      tag: 'Gross Sales',
    },
    {
      id: 'transactions',
      title: 'Total Transactions',
      value: overview ? overview.totalTransactions.toLocaleString() : '0',
      subtitle: 'Completed checkout receipts',
      icon: <ShoppingBag size={24} />,
      theme: 'blue',
      tag: 'Orders',
    },
    {
      id: 'items',
      title: 'Items Sold',
      value: overview ? overview.itemsSold.toLocaleString() : '0',
      subtitle: 'Total inventory units moved',
      icon: <Package size={24} />,
      theme: 'purple',
      tag: 'Inventory Volume',
    },
    {
      id: 'atv',
      title: 'Average Basket Value',
      value: overview ? formatLKR(overview.averageTransactionValue) : 'Rs. 0.00',
      subtitle: 'Avg revenue per transaction',
      icon: <TrendingUp size={24} />,
      theme: 'amber',
      tag: 'ATV Benchmark',
    },
  ]

  return (
    <div className="digexa-kpi-grid">
      {cards.map((card) => (
        <div key={card.id} className={`digexa-kpi-card digexa-kpi-card--${card.theme}`}>
          {isLoading ? (
            <div className="digexa-kpi-skeleton">
              <div className="digexa-kpi-skeleton__top">
                <div className="digexa-skeleton-line digexa-skeleton-line--short" />
                <div className="digexa-skeleton-circle" />
              </div>
              <div className="digexa-skeleton-line digexa-skeleton-line--big" />
              <div className="digexa-skeleton-line digexa-skeleton-line--sub" />
            </div>
          ) : (
            <>
              <div className="digexa-kpi-card__top">
                <span className="digexa-kpi-card__title">{card.title}</span>
                <div className={`digexa-kpi-card__icon digexa-kpi-card__icon--${card.theme}`}>
                  {card.icon}
                </div>
              </div>

              <div className="digexa-kpi-card__main">
                <div className="digexa-kpi-card__value">{card.value}</div>
                <div className="digexa-kpi-card__meta">
                  <span className={`digexa-kpi-tag digexa-kpi-tag--${card.theme}`}>
                    {card.tag}
                  </span>
                  <span className="digexa-kpi-card__subtitle">{card.subtitle}</span>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
