import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  CreditCard,
  Banknote,
  X,
  Check,
  AlertCircle,
  Loader2,
  Receipt,
  User,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info,
  Printer,
  FileText,
  Smartphone,
} from 'lucide-react'
import type { CartItem, DiscountType, POSCustomerInfo } from './types'
import { formatLKR, roundTo2Decimals } from './types'
import { saleApi, ApiError } from '../../api/client'
import type { SaleRequest, SaleResponse } from '../../api/types'
import { Receipt as ReceiptDoc, type ReceiptFormat } from './Receipt'

interface CheckoutModalProps {
  isOpen: boolean
  items: CartItem[]
  customerInfo: POSCustomerInfo
  discountType: DiscountType
  discountValue: number
  subtotal: number
  discountAmount: number
  grandTotal: number
  onSuccess: (completedSale: SaleResponse) => void
  onClose: () => void
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  items,
  customerInfo,
  discountType,
  discountValue,
  subtotal,
  discountAmount,
  grandTotal,
  onSuccess,
  onClose,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH')
  const [amountTenderedInput, setAmountTenderedInput] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string>('')
  const [successSale, setSuccessSale] = useState<SaleResponse | null>(null)
  const [printFormat, setPrintFormat] = useState<ReceiptFormat>('80mm')

  const tenderInputRef = useRef<HTMLInputElement>(null)
  const prevIsOpenRef = useRef<boolean>(false)

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Reset or initialize state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSuccessSale(null)
      setErrorMessage(null)
      setIsSubmitting(false)
      setPaymentMethod('CASH')
      setNotes('')
      // Default amount tendered to the grand total
      setAmountTenderedInput(grandTotal > 0 ? grandTotal.toFixed(2) : '0.00')

      // Generate a fresh unique idempotencyKey for this new transaction
      const newKey = `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      setIdempotencyKey(newKey)

      // Auto-focus amount tendered input
      setTimeout(() => {
        tenderInputRef.current?.focus()
        tenderInputRef.current?.select()
      }, 80)
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen])

  // Cleanly close modal and reset state
  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return
    setSuccessSale(null)
    setErrorMessage(null)
    onClose()
  }, [isSubmitting, onClose])

  // Handle ESC key (disabled while submitting)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleCloseModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, handleCloseModal])

  // Parse amount tendered
  const parsedTendered = useMemo(() => {
    const val = parseFloat(amountTenderedInput)
    return Number.isFinite(val) && val >= 0 ? roundTo2Decimals(val) : 0
  }, [amountTenderedInput])

  // Calculate change for cash payment
  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0
    return roundTo2Decimals(parsedTendered - grandTotal)
  }, [paymentMethod, parsedTendered, grandTotal])

  const isUnderpaid = paymentMethod === 'CASH' && changeAmount < 0

  // Cash preset options based on grandTotal
  const cashPresets = useMemo(() => {
    if (grandTotal <= 0) return []
    const presets = new Set<number>()
    presets.add(grandTotal) // Exact amount

    // Next round 50, 100, 500, 1000, 5000
    const next100 = Math.ceil(grandTotal / 100) * 100
    if (next100 > grandTotal) presets.add(next100)

    const next500 = Math.ceil(grandTotal / 500) * 500
    if (next500 > grandTotal) presets.add(next500)

    const next1000 = Math.ceil(grandTotal / 1000) * 1000
    if (next1000 > grandTotal) presets.add(next1000)

    const next5000 = Math.ceil(grandTotal / 5000) * 5000
    if (next5000 > grandTotal) presets.add(next5000)

    return Array.from(presets).slice(0, 4)
  }, [grandTotal])

  // Submit checkout to POST /api/sales
  const handleCompleteSale = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting || items.length === 0 || successSale) return

    if (isUnderpaid) {
      setErrorMessage(`Amount tendered (${formatLKR(parsedTendered)}) is less than total due (${formatLKR(grandTotal)}).`)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    // Map discount type to backend enum: NONE, PERCENT, FIXED
    let backendDiscountType: 'NONE' | 'PERCENT' | 'FIXED' = 'NONE'
    if (discountValue > 0) {
      backendDiscountType = discountType === 'percent' ? 'PERCENT' : 'FIXED'
    }

    const payload: SaleRequest = {
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      customerName: customerInfo.name.trim() || undefined,
      customerPhone: customerInfo.phone.trim() || undefined,
      paymentMethod,
      discountType: backendDiscountType,
      discountValue: discountValue > 0 ? discountValue : undefined,
      amountTendered: paymentMethod === 'CASH' ? parsedTendered : grandTotal,
      notes: notes.trim() || undefined,
      idempotencyKey, // Reuses same key on retry of this transaction
    }

    try {
      const response = await saleApi.create(payload)
      setSuccessSale(response)
      // Notify parent to clear cart and reload inventory
      onSuccess(response)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage('Your session has expired. Please sign out and log in again.')
        } else if (err.status === 404) {
          setErrorMessage('Sales service endpoint was not found on the server (404). Please ensure the backend server is running the latest version.')
        } else if (err.status === 409) {
          setErrorMessage('Idempotency conflict: this transaction has already been completed or modified.')
        } else if (err.status === 0) {
          setErrorMessage('Unable to connect to POS server. Please check your network and retry.')
        } else {
          setErrorMessage(err.message || 'Checkout failed. Please check the order details.')
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('An unexpected error occurred while completing the sale.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  const modalContent = (
    <div
      className="digexa-modal-backdrop pos-modal-backdrop"
      onClick={() => {
        if (!isSubmitting) handleCloseModal()
      }}
      role="presentation"
    >
      <div
        className="digexa-modal pos-checkout-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
      >
        {/* SUCCESS VIEW (Confirmed Receipt) */}
        {successSale ? (
          <div className="pos-checkout-success">
            <button
              type="button"
              className="digexa-modal__close-btn pos-checkout-success__close-btn"
              onClick={handleCloseModal}
              aria-label="Close success modal"
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
            >
              <X size={18} />
            </button>

            <div className="pos-checkout-success__header">
              <div className="pos-checkout-success__icon-wrapper">
                <CheckCircle2 size={44} className="pos-checkout-success__icon" />
              </div>
              <h3 id="checkout-modal-title" className="pos-checkout-success__title">
                Sale Completed Successfully
              </h3>
              <p className="pos-checkout-success__subtitle">
                Transaction processed and stock deducted atomically
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="pos-checkout-receipt-card">
              <div className="pos-checkout-receipt-row pos-checkout-receipt-row--main">
                <span className="pos-receipt-label">Receipt Number</span>
                <span className="pos-receipt-badge">{successSale.receiptNumber}</span>
              </div>

              <div className="pos-checkout-receipt-divider" />

              <div className="pos-checkout-receipt-row">
                <span className="pos-receipt-label">Payment Method</span>
                <span className="pos-receipt-value">
                  {successSale.paymentMethod === 'CASH' ? 'Cash Tender' : 'Card (Recorded)'}
                </span>
              </div>

              {successSale.customerName && (
                <div className="pos-checkout-receipt-row">
                  <span className="pos-receipt-label">Customer</span>
                  <span className="pos-receipt-value">
                    {successSale.customerName}{' '}
                    {successSale.customerPhone && `(${successSale.customerPhone})`}
                  </span>
                </div>
              )}

              {successSale.cashierName && (
                <div className="pos-checkout-receipt-row">
                  <span className="pos-receipt-label">Cashier</span>
                  <span className="pos-receipt-value">{successSale.cashierName}</span>
                </div>
              )}

              <div className="pos-checkout-receipt-divider" />

              <div className="pos-checkout-receipt-row">
                <span className="pos-receipt-label">Items Count</span>
                <span className="pos-receipt-value">{successSale.items.length} items</span>
              </div>

              <div className="pos-checkout-receipt-row">
                <span className="pos-receipt-label">Subtotal</span>
                <span className="pos-receipt-value">{formatLKR(successSale.subtotal)}</span>
              </div>

              {successSale.discountAmount > 0 && (
                <div className="pos-checkout-receipt-row pos-checkout-receipt-row--discount">
                  <span className="pos-receipt-label">Discount Applied</span>
                  <span className="pos-receipt-value">-{formatLKR(successSale.discountAmount)}</span>
                </div>
              )}

              <div className="pos-checkout-receipt-row pos-checkout-receipt-row--total">
                <span className="pos-receipt-total-label">Grand Total Paid</span>
                <span className="pos-receipt-total-val">{formatLKR(successSale.totalAmount)}</span>
              </div>

              {successSale.paymentMethod === 'CASH' && successSale.amountTendered !== undefined && (
                <>
                  <div className="pos-checkout-receipt-divider" />
                  <div className="pos-checkout-receipt-row">
                    <span className="pos-receipt-label">Amount Received</span>
                    <span className="pos-receipt-value">{formatLKR(successSale.amountTendered)}</span>
                  </div>
                  <div className="pos-checkout-receipt-row pos-checkout-receipt-row--change">
                    <span className="pos-receipt-label pos-receipt-label--bold">Change Returned</span>
                    <span className="pos-receipt-change-val">{formatLKR(successSale.changeAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Format Selection & Print Actions */}
            <div className="pos-checkout-success__print-bar no-print">
              <span className="pos-format-label">Receipt Format:</span>
              <div className="pos-format-toggle-group">
                <button
                  type="button"
                  className={`pos-format-pill ${printFormat === '80mm' ? 'pos-format-pill--active' : ''}`}
                  onClick={() => setPrintFormat('80mm')}
                >
                  <Smartphone size={13} />
                  <span>80mm Thermal</span>
                </button>
                <button
                  type="button"
                  className={`pos-format-pill ${printFormat === 'a4' ? 'pos-format-pill--active' : ''}`}
                  onClick={() => setPrintFormat('a4')}
                >
                  <FileText size={13} />
                  <span>A4 Sheet</span>
                </button>
              </div>
            </div>

            <div className="pos-checkout-success__actions no-print">
              <button
                type="button"
                className="digexa-btn digexa-btn--primary pos-checkout-print-action-btn"
                onClick={() => window.print()}
                title="Print Receipt"
              >
                <Printer size={18} />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                className="digexa-btn digexa-btn--secondary pos-checkout-success__btn"
                onClick={handleCloseModal}
              >
                <Check size={18} />
                <span>Done / New Sale</span>
              </button>
            </div>

            {/* Hidden printable receipt mounted into DOM for native window.print() */}
            <div className="pos-print-mount">
              <ReceiptDoc sale={successSale} format={printFormat} />
            </div>
          </div>
        ) : (
          /* CHECKOUT FORM VIEW */
          <>
            {/* Modal Header */}
            <div className="digexa-modal__header pos-checkout-modal__header">
              <div className="pos-modal__header-content">
                <div className="pos-modal__icon-pill pos-modal__icon-pill--checkout">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 id="checkout-modal-title" className="digexa-modal__title">
                    Complete Checkout
                  </h3>
                  <p className="digexa-modal__subtitle">
                    Select payment method, review order totals, and tender payment
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="digexa-modal__close-btn"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                aria-label="Close checkout modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="pos-checkout-alert pos-checkout-alert--error" role="alert">
                <AlertCircle size={18} className="pos-checkout-alert__icon" />
                <div className="pos-checkout-alert__content">
                  <span className="pos-checkout-alert__title">Checkout Error</span>
                  <span className="pos-checkout-alert__text">{errorMessage}</span>
                </div>
              </div>
            )}

            <div className="pos-checkout-body">
              {/* Left Column: Order Review */}
              <div className="pos-checkout-review">
                <div className="pos-checkout-section-header">
                  <Receipt size={16} />
                  <span>Order Summary</span>
                  <span className="pos-checkout-items-badge">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Customer Pill if assigned */}
                {Boolean(customerInfo.name || customerInfo.phone) && (
                  <div className="pos-checkout-customer-chip">
                    <User size={13} />
                    <span className="pos-checkout-customer-name">
                      {customerInfo.name || 'Valued Customer'}
                    </span>
                    {customerInfo.phone && (
                      <span className="pos-checkout-customer-phone">
                        · {customerInfo.phone}
                      </span>
                    )}
                  </div>
                )}

                {/* Items Mini-List */}
                <div className="pos-checkout-items-list-wrap">
                  <ul className="pos-checkout-items-list">
                    {items.map((item) => (
                      <li key={item.product.id} className="pos-checkout-item-row">
                        <div className="pos-checkout-item-details">
                          <span className="pos-checkout-item-name">{item.product.name}</span>
                          <span className="pos-checkout-item-qty">
                            {item.quantity} × {formatLKR(item.product.price)}
                          </span>
                        </div>
                        <span className="pos-checkout-item-total">
                          {formatLKR(item.product.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Financial Breakdown */}
                <div className="pos-checkout-breakdown">
                  <div className="pos-breakdown-row">
                    <span>Subtotal</span>
                    <span>{formatLKR(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="pos-breakdown-row pos-breakdown-row--discount">
                      <span>
                        Discount ({discountType === 'percent' ? `${discountValue}%` : 'Fixed'})
                      </span>
                      <span>-{formatLKR(discountAmount)}</span>
                    </div>
                  )}

                  <div className="pos-breakdown-row">
                    <span>Tax (0%)</span>
                    <span>Rs. 0.00</span>
                  </div>

                  <div className="pos-checkout-grand-total-card">
                    <div className="pos-checkout-grand-total-label">
                      <span>Total Due</span>
                      <small>LKR Currency</small>
                    </div>
                    <div className="pos-checkout-grand-total-val">
                      {formatLKR(grandTotal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Method & Tendering */}
              <div className="pos-checkout-payment">
                {/* Payment Method Selector */}
                <div className="pos-checkout-section-header">
                  <Sparkles size={16} />
                  <span>Payment Method</span>
                </div>

                <div className="pos-payment-tabs" role="radiogroup" aria-label="Select Payment Method">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'CASH'}
                    className={`pos-payment-tab ${
                      paymentMethod === 'CASH' ? 'pos-payment-tab--active' : ''
                    }`}
                    onClick={() => {
                      setPaymentMethod('CASH')
                      setAmountTenderedInput(grandTotal > 0 ? grandTotal.toFixed(2) : '0.00')
                    }}
                    disabled={isSubmitting}
                  >
                    <Banknote size={20} />
                    <div className="pos-payment-tab__text">
                      <span className="pos-payment-tab__title">Cash</span>
                      <span className="pos-payment-tab__desc">Tender & Change</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'CARD'}
                    className={`pos-payment-tab ${
                      paymentMethod === 'CARD' ? 'pos-payment-tab--active' : ''
                    }`}
                    onClick={() => {
                      setPaymentMethod('CARD')
                      setAmountTenderedInput(grandTotal.toFixed(2))
                    }}
                    disabled={isSubmitting}
                  >
                    <CreditCard size={20} />
                    <div className="pos-payment-tab__text">
                      <span className="pos-payment-tab__title">Card</span>
                      <span className="pos-payment-tab__desc">External Terminal</span>
                    </div>
                  </button>
                </div>

                {/* CASH Tendering Controls */}
                {paymentMethod === 'CASH' ? (
                  <div className="pos-tender-section">
                    <label htmlFor="tender-amount-input" className="pos-tender-label">
                      Amount Tendered (Rs.)
                    </label>

                    <div className="pos-tender-input-wrap">
                      <span className="pos-tender-prefix">Rs.</span>
                      <input
                        ref={tenderInputRef}
                        id="tender-amount-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountTenderedInput}
                        onChange={(e) => setAmountTenderedInput(e.target.value)}
                        className={`pos-tender-input ${isUnderpaid ? 'pos-tender-input--error' : ''}`}
                        placeholder="0.00"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Quick Cash Presets */}
                    {cashPresets.length > 0 && (
                      <div className="pos-cash-presets">
                        <span className="pos-cash-presets__label">Quick Presets:</span>
                        <div className="pos-cash-presets__grid">
                          {cashPresets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`pos-preset-btn ${
                                parsedTendered === preset ? 'pos-preset-btn--active' : ''
                              }`}
                              onClick={() => setAmountTenderedInput(preset.toFixed(2))}
                              disabled={isSubmitting}
                            >
                              {preset === grandTotal ? 'Exact' : formatLKR(preset)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live Change Due Card */}
                    <div
                      className={`pos-change-card ${
                        isUnderpaid ? 'pos-change-card--short' : 'pos-change-card--ready'
                      }`}
                    >
                      <div className="pos-change-card__left">
                        <span className="pos-change-card__title">
                          {isUnderpaid ? 'Short Amount' : 'Change Due'}
                        </span>
                        <span className="pos-change-card__desc">
                          {isUnderpaid
                            ? 'Tendered amount is below grand total'
                            : 'Return to customer'}
                        </span>
                      </div>
                      <div className="pos-change-card__amount">
                        {isUnderpaid
                          ? `-${formatLKR(Math.abs(changeAmount))}`
                          : formatLKR(changeAmount)}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CARD Notice (Record-only) */
                  <div className="pos-card-notice-card">
                    <div className="pos-card-notice-card__badge">
                      <ShieldCheck size={16} />
                      <span>Record Payment Only</span>
                    </div>
                    <p className="pos-card-notice-card__text">
                      Swipe, tap, or insert the card on your external payment terminal. This
                      action records the card transaction for bookkeeping, reporting, and stock
                      deduction.
                    </p>
                    <div className="pos-card-notice-card__tip">
                      <Info size={14} />
                      <span>No real card charges will be initiated by this system.</span>
                    </div>
                  </div>
                )}

                {/* Optional Order Notes */}
                <div className="pos-checkout-notes-field">
                  <label htmlFor="checkout-notes-input" className="pos-checkout-notes-label">
                    Order Notes (Optional)
                  </label>
                  <input
                    id="checkout-notes-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Special packing, table #4"
                    className="pos-checkout-notes-input"
                    maxLength={250}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="digexa-modal__footer pos-checkout-modal__footer">
              <button
                type="button"
                className="digexa-btn digexa-btn--secondary"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="digexa-btn digexa-btn--primary pos-checkout-submit-btn"
                onClick={() => handleCompleteSale()}
                disabled={isSubmitting || items.length === 0 || isUnderpaid}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="pos-spinner" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Complete Sale ({formatLKR(grandTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
