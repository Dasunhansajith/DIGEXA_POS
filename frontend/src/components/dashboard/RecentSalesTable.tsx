import React, { useState, useMemo } from 'react'
import {
  History,
  Search,
  Printer,
  Banknote,
  CreditCard,
  ShoppingBag,
  Receipt,
} from 'lucide-react'
import type { SaleResponse } from '../../api/types'
import { formatLKR } from '../pos/types'

interface RecentSalesTableProps {
  sales: SaleResponse[]
  isLoading?: boolean
  onSelectSale: (sale: SaleResponse) => void
  onNavigateToTerminal?: () => void
}

export const RecentSalesTable: React.FC<RecentSalesTableProps> = ({
  sales,
  isLoading = false,
  onSelectSale,
  onNavigateToTerminal,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter sales by receipt number, customer, or payment method
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales
    const q = searchTerm.toLowerCase().trim()
    return sales.filter((s) => {
      const receiptMatch = s.receiptNumber.toLowerCase().includes(q)
      const customerMatch = s.customerName?.toLowerCase().includes(q)
      const paymentMatch = s.paymentMethod.toLowerCase().includes(q)
      return receiptMatch || customerMatch || paymentMatch
    })
  }, [sales, searchTerm])

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="digexa-recent-sales-card">
      {/* Header with Title and Search Input */}
      <div className="digexa-recent-sales-card__header">
        <div className="digexa-recent-sales-card__title-group">
          <div className="digexa-recent-sales-card__icon-badge">
            <History size={20} />
          </div>
          <div>
            <h3 className="digexa-recent-sales-card__title">Recent POS Transactions</h3>
            <p className="digexa-recent-sales-card__subtitle">
              Live audit trail of completed sales and printable receipts
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="digexa-recent-sales-card__actions">
          <div className="digexa-search-input-wrapper">
            <Search size={16} className="digexa-search-icon" />
            <input
              type="text"
              className="digexa-search-input"
              placeholder="Search receipt, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="digexa-search-clear"
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="digexa-recent-sales-card__body">
        {isLoading ? (
          <div className="digexa-recent-sales-loading">
            <div className="digexa-chart-spinner" />
            <span>Loading transaction logs...</span>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="digexa-recent-sales-empty">
            <Receipt size={40} className="text-slate-300" />
            <p className="digexa-recent-sales-empty-title">
              {searchTerm ? 'No transactions matching your search' : 'No Transactions Recorded'}
            </p>
            <p className="digexa-recent-sales-empty-sub">
              {searchTerm
                ? 'Try searching with another keyword or clear the search input.'
                : 'Sales recorded in the POS cashier register will instantly appear here.'}
            </p>
            {!searchTerm && onNavigateToTerminal && (
              <button
                type="button"
                className="digexa-btn digexa-btn--primary digexa-btn--sm"
                onClick={onNavigateToTerminal}
              >
                <ShoppingBag size={14} />
                <span>Go to POS Register</span>
              </button>
            )}
          </div>
        ) : (
          <div className="digexa-table-responsive">
            <table className="digexa-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Items</th>
                  <th className="text-right">Total Amount</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.slice(0, 8).map((sale) => (
                  <tr key={sale.id} className="digexa-table-row">
                    {/* Receipt Number Badge */}
                    <td className="font-mono">
                      <button
                        type="button"
                        className="digexa-receipt-pill-btn"
                        onClick={() => onSelectSale(sale)}
                        title="View printable receipt"
                      >
                        <Receipt size={13} />
                        <span>{sale.receiptNumber}</span>
                      </button>
                    </td>

                    {/* Date */}
                    <td className="text-muted text-sm">{formatDate(sale.createdAt)}</td>

                    {/* Customer */}
                    <td>
                      {sale.customerName ? (
                        <div className="digexa-customer-cell">
                          <span className="digexa-customer-name">{sale.customerName}</span>
                          {sale.customerPhone && (
                            <span className="digexa-customer-phone">{sale.customerPhone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Walk-in</span>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td>
                      <span
                        className={`digexa-pay-method-badge digexa-pay-method-badge--${sale.paymentMethod.toLowerCase()}`}
                      >
                        {sale.paymentMethod === 'CASH' ? (
                          <>
                            <Banknote size={12} />
                            <span>Cash</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={12} />
                            <span>Card</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Items count */}
                    <td className="text-sm">
                      {sale.items ? `${sale.items.length} items` : '—'}
                    </td>

                    {/* Total Amount */}
                    <td className="text-right font-bold text-emerald-600">
                      {formatLKR(sale.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="text-center">
                      <span className="digexa-status-badge digexa-status-badge--completed">
                        <span className="digexa-status-badge__dot" />
                        <span>Completed</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <button
                        type="button"
                        className="digexa-table-action-btn"
                        onClick={() => onSelectSale(sale)}
                        title="Print / View Receipt"
                      >
                        <Printer size={14} />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
