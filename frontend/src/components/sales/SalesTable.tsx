import React from 'react'
import {
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Banknote,
  CreditCard,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import type { PageResponse, SaleResponse } from '../../api/types'

interface SalesTableProps {
  salesPage: PageResponse<SaleResponse> | null
  isLoading: boolean
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onViewDetails: (sale: SaleResponse) => void
  onPrintReceipt: (sale: SaleResponse) => void
}

export const SalesTable: React.FC<SalesTableProps> = ({
  salesPage,
  isLoading,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetails,
  onPrintReceipt,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(val || 0)
  }

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return new Intl.DateTimeFormat('en-LK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(d)
    } catch {
      return dateStr
    }
  }

  const sales = salesPage?.content || []
  const totalElements = salesPage?.totalElements || 0
  const totalPages = salesPage?.totalPages || 1

  const startRecord = totalElements === 0 ? 0 : currentPage * pageSize + 1
  const endRecord = Math.min((currentPage + 1) * pageSize, totalElements)

  return (
    <div className="digexa-sales-table-card">
      <div className="digexa-sales-table-wrapper">
        <table className="digexa-sales-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Date & Time</th>
              <th>Cashier</th>
              <th>Customer</th>
              <th>Payment</th>
              <th style={{ textAlign: 'center' }}>Items</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '130px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '140px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '90px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '110px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '60px', height: '22px' }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="digexa-skeleton-box" style={{ width: '40px', height: '16px', margin: '0 auto' }} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="digexa-skeleton-box" style={{ width: '90px', height: '16px', marginLeft: 'auto' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '80px', height: '20px' }} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="digexa-skeleton-box" style={{ width: '120px', height: '28px', marginLeft: 'auto' }} />
                  </td>
                </tr>
              ))
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="digexa-empty-state">
                    <div className="digexa-empty-state__icon-wrap">
                      <ShoppingBag size={28} />
                    </div>
                    <h3 className="digexa-empty-state__title">No sales transactions found</h3>
                    <p className="digexa-empty-state__desc">
                      No sales match your current timeline, search, or payment method filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id}>
                  {/* Receipt # */}
                  <td>
                    <button
                      type="button"
                      className="digexa-receipt-cell"
                      onClick={() => onViewDetails(sale)}
                      title="View full transaction details"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      <span>{sale.receiptNumber}</span>
                    </button>
                  </td>

                  {/* Date & Time */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontSize: '0.8125rem' }}>
                      <Calendar size={13} style={{ color: '#94a3b8' }} />
                      <span>{formatDateTime(sale.createdAt)}</span>
                    </div>
                  </td>

                  {/* Cashier */}
                  <td>
                    <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.8125rem' }}>
                      {sale.cashierName || 'Cashier'}
                    </span>
                  </td>

                  {/* Customer */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.825rem' }}>
                        {sale.customerName || 'Walk-in Customer'}
                      </span>
                      {sale.customerPhone && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {sale.customerPhone}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Payment Method */}
                  <td>
                    <span
                      className={`digexa-pay-badge ${
                        sale.paymentMethod === 'CASH'
                          ? 'digexa-pay-badge--cash'
                          : 'digexa-pay-badge--card'
                      }`}
                    >
                      {sale.paymentMethod === 'CASH' ? <Banknote size={12} /> : <CreditCard size={12} />}
                      <span>{sale.paymentMethod}</span>
                    </span>
                  </td>

                  {/* Items Count */}
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '6px',
                        fontSize: '0.785rem',
                        fontWeight: 700,
                        color: '#334155',
                      }}
                    >
                      {sale.itemCount !== undefined
                        ? `${sale.itemCount} items`
                        : `${sale.items?.length || 0} items`}
                    </span>
                  </td>

                  {/* Total Amount */}
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.925rem' }}>
                      {formatCurrency(sale.totalAmount)}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span className="digexa-sale-status-pill">
                      <CheckCircle2 size={12} />
                      <span>{sale.status}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="digexa-sales-row-actions">
                      <button
                        type="button"
                        className="digexa-sales-action-btn"
                        onClick={() => onViewDetails(sale)}
                        title="View transaction details"
                      >
                        <FileText size={13} />
                        <span>Details</span>
                      </button>
                      <button
                        type="button"
                        className="digexa-sales-action-btn digexa-sales-action-btn--print"
                        onClick={() => onPrintReceipt(sale)}
                        title="Print receipt (80mm / A4)"
                      >
                        <Printer size={13} />
                        <span>Print</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="digexa-sales-pagination-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="digexa-sales-page-info">
            Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
            <strong>{totalElements}</strong> transactions
          </span>

          {/* Page Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#64748b' }}>
            <span>Per page:</span>
            <select
              className="digexa-sales-select"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.785rem' }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="digexa-sales-page-controls">
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, marginRight: '0.5rem' }}>
            Page {currentPage + 1} of {Math.max(1, totalPages)}
          </span>

          <button
            type="button"
            className="digexa-sales-page-nav-btn"
            disabled={currentPage === 0 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          <button
            type="button"
            className="digexa-sales-page-nav-btn"
            disabled={currentPage + 1 >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

