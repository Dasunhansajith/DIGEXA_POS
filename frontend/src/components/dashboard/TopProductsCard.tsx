import React from 'react'
import { Award, Package, Flame } from 'lucide-react'
import type { TopProductResponse } from '../../api/types'
import { formatLKR } from '../pos/types'

interface TopProductsCardProps {
  products: TopProductResponse[]
  isLoading?: boolean
  periodLabel?: string
}

export const TopProductsCard: React.FC<TopProductsCardProps> = ({
  products,
  isLoading = false,
  periodLabel = 'Selected Period',
}) => {
  const maxUnits = products.length > 0 ? Math.max(...products.map((p) => p.quantitySold), 1) : 1

  const getRankBadgeClass = (index: number) => {
    switch (index) {
      case 0:
        return 'digexa-rank-badge--gold'
      case 1:
        return 'digexa-rank-badge--silver'
      case 2:
        return 'digexa-rank-badge--bronze'
      default:
        return 'digexa-rank-badge--default'
    }
  }

  return (
    <div className="digexa-top-products-card">
      <div className="digexa-top-products-card__header">
        <div className="digexa-top-products-card__title-group">
          <div className="digexa-top-products-card__icon-badge">
            <Flame size={20} />
          </div>
          <div>
            <h3 className="digexa-top-products-card__title">Top 5 Best Sellers</h3>
            <p className="digexa-top-products-card__subtitle">
              Ranked by total quantity sold ({periodLabel})
            </p>
          </div>
        </div>
      </div>

      <div className="digexa-top-products-card__body">
        {isLoading ? (
          <div className="digexa-top-products-loading">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="digexa-top-product-skeleton">
                <div className="digexa-skeleton-circle" />
                <div className="digexa-skeleton-lines">
                  <div className="digexa-skeleton-line digexa-skeleton-line--long" />
                  <div className="digexa-skeleton-line digexa-skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="digexa-top-products-empty">
            <Package size={36} className="text-slate-300" />
            <p className="digexa-top-products-empty-title">No Product Sales Yet</p>
            <p className="digexa-top-products-empty-sub">
              Complete sales at the register to see your best performing items here.
            </p>
          </div>
        ) : (
          <div className="digexa-top-products-list">
            {products.slice(0, 5).map((item, index) => {
              const percentage = Math.round((item.quantitySold / maxUnits) * 100)

              return (
                <div key={item.productId ?? `${item.productName}-${index}`} className="digexa-top-product-item">
                  {/* Rank Indicator */}
                  <div className={`digexa-rank-badge ${getRankBadgeClass(index)}`}>
                    {index === 0 ? <Award size={14} /> : `#${index + 1}`}
                  </div>

                  {/* Product Details & Volume */}
                  <div className="digexa-top-product-info">
                    <div className="digexa-top-product-header">
                      <span className="digexa-top-product-name" title={item.productName}>
                        {item.productName}
                      </span>
                      <span className="digexa-top-product-revenue">
                        {formatLKR(item.totalRevenue)}
                      </span>
                    </div>

                    <div className="digexa-top-product-sub">
                      <span className="digexa-top-product-category">
                        {item.category || 'General Product'}
                      </span>
                      <span className="digexa-top-product-units">
                        <strong>{item.quantitySold}</strong> {item.quantitySold === 1 ? 'unit sold' : 'units sold'}
                      </span>
                    </div>

                    {/* Proportional Volume Bar */}
                    <div className="digexa-top-product-progress">
                      <div
                        className="digexa-top-product-progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
