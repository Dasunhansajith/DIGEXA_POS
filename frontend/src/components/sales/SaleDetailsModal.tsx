import React, { useState, useEffect } from 'react'
import {
  X,
  Printer,
  Receipt,
  User,
  Phone,
  Banknote,
  CreditCard,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { SaleResponse } from '../../api/types'
import { saleApi } from '../../api/client'

interface SaleDetailsModalProps {
  saleId: number | null
  initialSale?: SaleResponse | null
  isOpen: boolean
  onClose: () => void
  onPrintReceipt: (sale: SaleResponse) => void
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  saleId,
  initialSale,
  isOpen,
  onClose,
  onPrintReceipt,
}) => {
  const [sale, setSale] = useState<SaleResponse | null>(initialSale || null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && saleId) {
      setIsLoading(true)
      setErrorMessage(null)
      saleApi
        .getById(saleId)
        .then((data) => setSale(data))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to load sale details'
          setErrorMessage(msg)
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, saleId])

  if (!isOpen) return null

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(val || 0)
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—'
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

  return (
    <div className="digexa-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="digexa-modal digexa-sale-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="digexa-modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Receipt size={20} style={{ color: '#10b981' }} />
            <div>
              <h2 className="digexa-modal__title">
                {sale?.receiptNumber || 'Transaction Details'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="digexa-modal__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="digexa-modal__body">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading transaction details...</p>
            </div>
          ) : errorMessage ? (
            <div
              className="digexa-inventory-alert"
              style={{ borderLeftColor: '#ef4444', backgroundColor: '#fef2f2', color: '#b91c1c' }}
            >
              <div className="digexa-inventory-alert__content">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            </div>
          ) : sale ? (
            <>
              {/* Meta Grid */}
              <div className="digexa-sale-details-grid">
                <div className="digexa-detail-item">
                  <span className="digexa-detail-item__label">Date & Time</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} style={{ color: '#64748b' }} />
                    <span className="digexa-detail-item__val">{formatDateTime(sale.createdAt)}</span>
                  </div>
                </div>

                <div className="digexa-detail-item">
                  <span className="digexa-detail-item__label">Cashier</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} style={{ color: '#64748b' }} />
                    <span className="digexa-detail-item__val">{sale.cashierName || 'Cashier'}</span>
                  </div>
                </div>

                <div className="digexa-detail-item">
                  <span className="digexa-detail-item__label">Customer</span>
                  <span className="digexa-detail-item__val">
                    {sale.customerName || 'Walk-in Customer'}
                  </span>
                  {sale.customerPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.785rem', color: '#64748b' }}>
                      <Phone size={12} />
                      <span>{sale.customerPhone}</span>
                    </div>
                  )}
                </div>

                <div className="digexa-detail-item">
                  <span className="digexa-detail-item__label">Payment & Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                    <span
                      className={`digexa-pay-badge ${
                        sale.paymentMethod === 'CASH'
                          ? 'digexa-pay-badge--cash'
                          : 'digexa-pay-badge--card'
                      }`}
                    >
                      {sale.paymentMethod === 'CASH' ? <Banknote size={13} /> : <CreditCard size={13} />}
                      <span>{sale.paymentMethod}</span>
                    </span>
                    <span className="digexa-sale-status-pill">
                      <CheckCircle2 size={13} />
                      <span>{sale.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                  Purchased Items ({sale.items?.length || 0})
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="digexa-details-items-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Item</th>
                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.items?.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="digexa-details-totals-card">
                <div className="digexa-totals-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discountAmount > 0 && (
                  <div className="digexa-totals-row" style={{ color: '#059669' }}>
                    <span>Discount {sale.discountType === 'PERCENT' ? `(${sale.discountValue}%)` : ''}</span>
                    <span>-{formatCurrency(sale.discountAmount)}</span>
                  </div>
                )}
                {sale.taxAmount > 0 && (
                  <div className="digexa-totals-row">
                    <span>Tax</span>
                    <span>{formatCurrency(sale.taxAmount)}</span>
                  </div>
                )}
                <div className="digexa-totals-row digexa-totals-row--grand">
                  <span>Total Amount</span>
                  <span style={{ color: '#047857' }}>{formatCurrency(sale.totalAmount)}</span>
                </div>

                {sale.paymentMethod === 'CASH' && sale.amountTendered !== undefined && (
                  <>
                    <div className="digexa-totals-row" style={{ marginTop: '0.25rem', paddingTop: '0.35rem', borderTop: '1px dashed #e2e8f0' }}>
                      <span>Cash Tendered</span>
                      <span>{formatCurrency(sale.amountTendered)}</span>
                    </div>
                    <div className="digexa-totals-row" style={{ fontWeight: 700, color: '#0f172a' }}>
                      <span>Change</span>
                      <span>{formatCurrency(sale.changeAmount)}</span>
                    </div>
                  </>
                )}
              </div>

              {sale.notes && (
                <div style={{ fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <strong>Notes:</strong> {sale.notes}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="digexa-modal__footer" style={{ margin: '0 -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
          <button
            type="button"
            className="digexa-sales-btn digexa-sales-btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
          {sale && (
            <button
              type="button"
              className="digexa-sales-btn digexa-sales-btn--primary"
              onClick={() => {
                onPrintReceipt(sale)
              }}
            >
              <Printer size={16} />
              <span>Print Receipt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

