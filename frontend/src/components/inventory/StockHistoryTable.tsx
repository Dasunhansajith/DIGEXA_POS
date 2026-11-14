import React from 'react'
import { History, ChevronLeft, ChevronRight, User as UserIcon, ArrowRight } from 'lucide-react'
import type { InventoryAdjustmentResponse, InventoryProductResponse } from '../../api/types'

interface StockHistoryTableProps {
  adjustments: InventoryAdjustmentResponse[]
  isLoading: boolean
  products: InventoryProductResponse[]
  selectedProductId?: number
  onProductFilterChange: (productId?: number) => void
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
}

export const StockHistoryTable: React.FC<StockHistoryTableProps> = ({
  adjustments,
  isLoading,
  products,
  selectedProductId,
  onProductFilterChange,
  currentPage,
  pageSize,
  onPageChange,
}) => {
  const getReasonLabel = (reason: string): string => {
    switch (reason) {
      case 'STOCK_RECEIVED':
        return 'Stock Received'
      case 'DAMAGED':
        return 'Damaged'
      case 'EXPIRED':
        return 'Expired'
      case 'MANUAL_CORRECTION':
        return 'Manual Correction'
      default:
        return reason.replace(/_/g, ' ')
    }
  }

  const formatDateTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return new Intl.DateTimeFormat('en-LK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(date)
    } catch {
      return dateStr
    }
  }

  return (
    <div className="digexa-history-section">
      {/* Header & Product Filter */}
      <div className="digexa-history-header">
        <div className="digexa-history-title-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: '#059669' }} />
            <h3 className="digexa-history-title">Stock Movement History</h3>
          </div>
          <p className="digexa-history-subtitle">
            Immutable audit trail of all manual adjustments and deliveries.
          </p>
        </div>

        <div className="digexa-inventory-select-wrap">
          <label
            htmlFor="history-product-filter"
            style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}
          >
            Filter by Product:
          </label>
          <select
            id="history-product-filter"
            className="digexa-inventory-select"
            value={selectedProductId || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : undefined
              onProductFilterChange(val)
            }}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.productName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="digexa-inventory-table-wrapper">
        <table className="digexa-inventory-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Product</th>
              <th>User</th>
              <th>Adjustment</th>
              <th>Quantity Shift</th>
              <th>Reason</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '130px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '150px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '100px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '60px', height: '22px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '90px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '110px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '120px', height: '16px' }} />
                  </td>
                </tr>
              ))
            ) : adjustments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                  No stock adjustment movements recorded yet.
                </td>
              </tr>
            ) : (
              adjustments.map((item) => {
                const isPos = item.adjustmentQuantity > 0
                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {formatDateTime(item.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {item.productName || `Product #${item.productId}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155' }}>
                        <UserIcon size={14} style={{ color: '#94a3b8' }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                          {item.userFullName || `User #${item.userId}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`digexa-adj-qty ${
                          isPos ? 'digexa-adj-qty--pos' : 'digexa-adj-qty--neg'
                        }`}
                      >
                        {isPos ? `+${item.adjustmentQuantity}` : item.adjustmentQuantity}
                      </span>
                    </td>
                    <td>
                      <div className="digexa-qty-shift">
                        <span>{item.previousQuantity}</span>
                        <ArrowRight size={13} className="digexa-qty-shift__arrow" />
                        <strong style={{ color: '#0f172a' }}>{item.newQuantity}</strong>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        {getReasonLabel(item.reason)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: item.note ? '#475569' : '#94a3b8' }}>
                        {item.note || '—'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="digexa-pagination-bar">
        <span className="digexa-page-indicator">
          Page {currentPage + 1}
        </span>
        <button
          type="button"
          className="digexa-page-btn"
          disabled={currentPage === 0 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </button>
        <button
          type="button"
          className="digexa-page-btn"
          disabled={adjustments.length < pageSize || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

