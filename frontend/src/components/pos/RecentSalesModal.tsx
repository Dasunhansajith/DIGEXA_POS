import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  History,
  X,
  Printer,
  Loader2,
  AlertCircle,
  Receipt as ReceiptIcon,
  Search,
  RotateCcw,
} from 'lucide-react'
import type { SaleResponse } from '../../api/types'
import { saleApi } from '../../api/client'
import { formatLKR } from './types'
import { ReceiptModal } from './ReceiptModal'

interface RecentSalesModalProps {
  isOpen: boolean
  onClose: () => void
}

export const RecentSalesModal: React.FC<RecentSalesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sales, setSales] = useState<SaleResponse[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false)

  // Load sales from GET /api/sales
  const loadSales = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await saleApi.getAll()
      setSales(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch sales history'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSales()
      setSearchQuery('')
    }
  }, [isOpen])

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isReceiptOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isReceiptOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      s.receiptNumber.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.customerPhone && s.customerPhone.includes(q)) ||
      (s.cashierName && s.cashierName.toLowerCase().includes(q))
    )
  })

  const modalContent = (
    <>
      <div
        className="digexa-modal-backdrop pos-modal-backdrop"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="digexa-modal pos-recent-sales-modal no-print"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recent-sales-title"
        >
          {/* Header */}
          <div className="digexa-modal__header">
            <div className="pos-modal__header-content">
              <div className="pos-modal__icon-pill pos-modal__icon-pill--checkout">
                <History size={18} />
              </div>
              <div>
                <h3 id="recent-sales-title" className="digexa-modal__title">
                  Recent Sales & Receipts
                </h3>
                <p className="digexa-modal__subtitle">
                  Browse previous orders and reprint receipts using verified backend records
                </p>
              </div>
            </div>

            <button
              type="button"
              className="digexa-modal__close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search & Refresh Toolbar */}
          <div className="pos-recent-toolbar">
            <div className="pos-recent-search-wrap">
              <Search size={15} className="pos-recent-search-icon" />
              <input
                type="text"
                placeholder="Search by receipt number, customer, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pos-recent-search-input"
              />
            </div>

            <button
              type="button"
              className="digexa-btn digexa-btn--secondary digexa-btn--sm"
              onClick={loadSales}
              disabled={isLoading}
              title="Refresh sales list"
            >
              <RotateCcw size={14} className={isLoading ? 'pos-spinner' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="pos-recent-body">
            {isLoading ? (
              <div className="pos-recent-loading">
                <Loader2 size={32} className="pos-spinner" />
                <span>Loading recent shop sales...</span>
              </div>
            ) : errorMessage ? (
              <div className="pos-recent-error">
                <AlertCircle size={24} />
                <span>{errorMessage}</span>
                <button
                  type="button"
                  className="digexa-btn digexa-btn--secondary digexa-btn--sm"
                  onClick={loadSales}
                >
                  Retry
                </button>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="pos-recent-empty">
                <ReceiptIcon size={36} className="pos-recent-empty-icon" />
                <h4>No sales found</h4>
                <p>
                  {searchQuery
                    ? 'No sales matched your search criteria.'
                    : 'Completed sales will appear here for reprint and auditing.'}
                </p>
              </div>
            ) : (
              <div className="pos-recent-table-wrap">
                <table className="pos-recent-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date & Time</th>
                      <th>Customer</th>
                      <th>Payment</th>
                      <th>Total</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="pos-recent-row">
                        <td>
                          <span className="pos-recent-receipt-badge">{sale.receiptNumber}</span>
                        </td>
                        <td>
                          <span className="pos-recent-date">
                            {sale.createdAt ? new Date(sale.createdAt).toLocaleString('en-LK', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }) : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="pos-recent-customer">
                            {sale.customerName || 'Walk-in'}
                          </span>
                        </td>
                        <td>
                          <span className={`pos-recent-payment-tag pos-recent-payment-tag--${sale.paymentMethod.toLowerCase()}`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td>
                          <span className="pos-recent-amount">{formatLKR(sale.totalAmount)}</span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="digexa-btn digexa-btn--secondary digexa-btn--sm pos-reprint-btn"
                            onClick={() => {
                              setSelectedSaleId(sale.id)
                              setIsReceiptOpen(true)
                            }}
                            title="Print Again (Fetches via GET /api/sales/{id})"
                          >
                            <Printer size={14} />
                            <span>Print Again</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="digexa-modal__footer">
            <span className="pos-recent-footer-count">
              Showing {filteredSales.length} {filteredSales.length === 1 ? 'record' : 'records'}
            </span>
            <button
              type="button"
              className="digexa-btn digexa-btn--secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Reprint Modal */}
      {selectedSaleId && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          saleId={selectedSaleId}
          onClose={() => {
            setIsReceiptOpen(false)
            setSelectedSaleId(null)
          }}
        />
      )}
    </>
  )

  return createPortal(modalContent, document.body)
}

