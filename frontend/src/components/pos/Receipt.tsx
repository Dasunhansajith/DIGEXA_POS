import React from 'react'
import type { SaleResponse } from '../../api/types'
import { formatLKR } from './types'

export type ReceiptFormat = '80mm' | 'a4'

interface ReceiptProps {
  sale: SaleResponse
  shopName?: string
  format?: ReceiptFormat
}

export const Receipt: React.FC<ReceiptProps> = ({
  sale,
  shopName,
  format = '80mm',
}) => {
  // Format formatted readable date and time from persisted ISO createdAt
  const formattedDateTime = React.useMemo(() => {
    if (!sale.createdAt) {
      return new Date().toLocaleString('en-LK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    }
    try {
      const d = new Date(sale.createdAt)
      if (isNaN(d.getTime())) return sale.createdAt
      return d.toLocaleString('en-LK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return sale.createdAt
    }
  }, [sale.createdAt])

  const effectiveShopName = shopName || (sale.shopId ? `Shop #${sale.shopId}` : 'DIGEXA POS Outlet')

  return (
    <div
      id="pos-print-area"
      className={`pos-receipt pos-receipt--${format}`}
      data-format={format}
    >
      {/* Receipt Header */}
      <div className="pos-receipt__header">
        <div className="pos-receipt__brand">DIGEXA POS</div>
        <div className="pos-receipt__shop-name">{effectiveShopName}</div>
        <div className="pos-receipt__type-tag">CUSTOMER RECEIPT</div>
      </div>

      <div className="pos-receipt__divider" />

      {/* Transaction & Metadata */}
      <div className="pos-receipt__meta-grid">
        <div className="pos-receipt__meta-row">
          <span className="pos-receipt__meta-label">Receipt No:</span>
          <span className="pos-receipt__meta-val pos-receipt__meta-val--code">
            {sale.receiptNumber}
          </span>
        </div>
        <div className="pos-receipt__meta-row">
          <span className="pos-receipt__meta-label">Date & Time:</span>
          <span className="pos-receipt__meta-val">{formattedDateTime}</span>
        </div>
        <div className="pos-receipt__meta-row">
          <span className="pos-receipt__meta-label">Cashier:</span>
          <span className="pos-receipt__meta-val">
            {sale.cashierName || (sale.cashierId ? `Staff #${sale.cashierId}` : 'Register 01')}
          </span>
        </div>
        <div className="pos-receipt__meta-row">
          <span className="pos-receipt__meta-label">Customer:</span>
          <span className="pos-receipt__meta-val">
            {sale.customerName
              ? `${sale.customerName}${sale.customerPhone ? ` (${sale.customerPhone})` : ''}`
              : 'Walk-in Customer'}
          </span>
        </div>
      </div>

      <div className="pos-receipt__divider" />

      {/* Items Table */}
      <div className="pos-receipt__items-section">
        <table className="pos-receipt__table">
          <thead>
            <tr>
              <th className="pos-receipt__th pos-receipt__th--item">Item</th>
              <th className="pos-receipt__th pos-receipt__th--qty">Qty</th>
              <th className="pos-receipt__th pos-receipt__th--price">Price</th>
              <th className="pos-receipt__th pos-receipt__th--total">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <tr key={item.id ?? idx} className="pos-receipt__item-row">
                <td className="pos-receipt__td pos-receipt__td--item">
                  <div className="pos-receipt__item-title">{item.productName}</div>
                </td>
                <td className="pos-receipt__td pos-receipt__td--qty">{item.quantity}</td>
                <td className="pos-receipt__td pos-receipt__td--price">
                  {formatLKR(item.unitPrice)}
                </td>
                <td className="pos-receipt__td pos-receipt__td--total">
                  {formatLKR(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pos-receipt__divider" />

      {/* Financial Calculations Breakdown */}
      <div className="pos-receipt__totals-section">
        <div className="pos-receipt__total-row">
          <span>Subtotal:</span>
          <span>{formatLKR(sale.subtotal)}</span>
        </div>

        {sale.discountAmount > 0 && (
          <div className="pos-receipt__total-row pos-receipt__total-row--discount">
            <span>
              Discount ({sale.discountType === 'PERCENT' ? `${sale.discountValue}%` : 'Fixed'}):
            </span>
            <span>-{formatLKR(sale.discountAmount)}</span>
          </div>
        )}

        <div className="pos-receipt__total-row">
          <span>Tax (0%):</span>
          <span>{formatLKR(sale.taxAmount || 0)}</span>
        </div>

        <div className="pos-receipt__divider pos-receipt__divider--solid" />

        <div className="pos-receipt__total-row pos-receipt__total-row--grand">
          <span>GRAND TOTAL:</span>
          <span className="pos-receipt__grand-amount">{formatLKR(sale.totalAmount)}</span>
        </div>

        <div className="pos-receipt__divider pos-receipt__divider--solid" />

        {/* Payment Summary */}
        <div className="pos-receipt__payment-summary">
          <div className="pos-receipt__total-row">
            <span>Payment Method:</span>
            <span className="pos-receipt__badge-text">
              {sale.paymentMethod === 'CASH' ? 'CASH TENDER' : 'CARD (RECORDED)'}
            </span>
          </div>

          {sale.paymentMethod === 'CASH' && (
            <>
              <div className="pos-receipt__total-row">
                <span>Amount Tendered:</span>
                <span>{formatLKR(sale.amountTendered ?? sale.totalAmount)}</span>
              </div>
              <div className="pos-receipt__total-row pos-receipt__total-row--change">
                <span>Change Given:</span>
                <span>{formatLKR(sale.changeAmount ?? 0)}</span>
              </div>
            </>
          )}

          {sale.paymentMethod === 'CARD' && (
            <div className="pos-receipt__card-note">
              * Payment verified and swiped on external merchant terminal
            </div>
          )}
        </div>
      </div>

      {sale.notes && (
        <>
          <div className="pos-receipt__divider" />
          <div className="pos-receipt__notes-section">
            <span className="pos-receipt__notes-label">Notes:</span>
            <span className="pos-receipt__notes-body">{sale.notes}</span>
          </div>
        </>
      )}

      <div className="pos-receipt__divider" />

      {/* Footer Branding & Thank You */}
      <div className="pos-receipt__footer">
        <p className="pos-receipt__thank-you">THANK YOU FOR YOUR BUSINESS!</p>
        <p className="pos-receipt__sub-msg">Please retain this receipt for warranty or exchange.</p>
        <div className="pos-receipt__powered-by">DIGEXA Cloud Point of Sale</div>
      </div>
    </div>
  )
}

