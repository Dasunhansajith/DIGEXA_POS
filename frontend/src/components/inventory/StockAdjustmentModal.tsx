import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, AlertTriangle, ArrowRight, Loader2, Check } from 'lucide-react'
import type {
  InventoryProductResponse,
  StockAdjustmentReason,
  StockAdjustmentRequest,
} from '../../api/types'
import { inventoryApi, ApiError } from '../../api/client'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  product: InventoryProductResponse | null
  availableProducts?: InventoryProductResponse[]
  onSuccess: (updated: InventoryProductResponse, message: string) => void
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  availableProducts = [],
  onSuccess,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<InventoryProductResponse | null>(product)
  const [mode, setMode] = useState<'ADD' | 'REMOVE'>('ADD')
  const [quantityInput, setQuantityInput] = useState<string>('1')
  const [reason, setReason] = useState<StockAdjustmentReason>('STOCK_RECEIVED')
  const [note, setNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Sync selected product when prop changes
  useEffect(() => {
    setSelectedProduct(product || (availableProducts.length > 0 ? availableProducts[0] : null))
  }, [product, availableProducts])

  // Reset fields when opening modal
  useEffect(() => {
    if (isOpen) {
      setMode('ADD')
      setQuantityInput('1')
      setReason('STOCK_RECEIVED')
      setNote('')
      setErrorMessage(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Automatically update default reason when mode changes
  const handleModeChange = (newMode: 'ADD' | 'REMOVE') => {
    setMode(newMode)
    setErrorMessage(null)
    if (newMode === 'ADD') {
      setReason('STOCK_RECEIVED')
    } else {
      setReason('DAMAGED')
    }
  }

  if (!isOpen) return null

  const currentStock = selectedProduct ? selectedProduct.stockQuantity : 0
  const qtyNumber = parseInt(quantityInput, 10) || 0
  const isQtyValid = qtyNumber > 0

  const isRemovalExcessive = mode === 'REMOVE' && qtyNumber > currentStock
  const adjustmentVal = mode === 'ADD' ? qtyNumber : -qtyNumber
  const resultingStock = currentStock + adjustmentVal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) {
      setErrorMessage('Please select a product.')
      return
    }
    if (!isQtyValid) {
      setErrorMessage('Please enter a positive adjustment quantity greater than 0.')
      return
    }
    if (isRemovalExcessive) {
      setErrorMessage(`Cannot remove ${qtyNumber} units because only ${currentStock} units are currently in stock.`)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const payload: StockAdjustmentRequest = {
      adjustment: adjustmentVal,
      reason,
      note: note.trim() || undefined,
    }

    try {
      const updated = await inventoryApi.adjustStock(selectedProduct.productId, payload)
      const sign = adjustmentVal > 0 ? `+${adjustmentVal}` : `${adjustmentVal}`
      onSuccess(
        updated,
        `Stock for "${updated.productName}" updated: ${sign} units (${updated.stockQuantity} now in stock).`
      )
      onClose()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to adjust stock. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="digexa-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="digexa-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="digexa-modal__header">
          <h2 className="digexa-modal__title">Adjust Product Stock</h2>
          <button
            type="button"
            className="digexa-modal__close"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="digexa-modal__body">
          {errorMessage && (
            <div className="digexa-inventory-alert" style={{ borderLeftColor: '#ef4444', backgroundColor: '#fef2f2', color: '#b91c1c' }}>
              <div className="digexa-inventory-alert__content">
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Product Info / Selector */}
          {product ? (
            <div className="digexa-modal-info-card">
              <span className="digexa-modal-info-card__title">{product.productName}</span>
              <span className="digexa-modal-info-card__sub">
                Category: <strong>{product.category || 'General'}</strong> &bull; Product ID: #{product.productId}
              </span>
            </div>
          ) : (
            <div className="digexa-form-group">
              <label htmlFor="select-product" className="digexa-form-label">
                Select Product *
              </label>
              <select
                id="select-product"
                className="digexa-form-select"
                value={selectedProduct?.productId || ''}
                onChange={(e) => {
                  const pid = parseInt(e.target.value, 10)
                  const found = availableProducts.find((p) => p.productId === pid) || null
                  setSelectedProduct(found)
                }}
                disabled={isSubmitting}
              >
                {availableProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} (Current Stock: {p.stockQuantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode Switcher: Add Stock vs Remove Stock */}
          <div className="digexa-form-group">
            <label className="digexa-form-label">Adjustment Mode *</label>
            <div className="digexa-adj-type-toggle">
              <button
                type="button"
                className={`digexa-adj-toggle-btn ${
                  mode === 'ADD' ? 'digexa-adj-toggle-btn--active-add' : ''
                }`}
                onClick={() => handleModeChange('ADD')}
                disabled={isSubmitting}
              >
                <Plus size={16} />
                <span>Add Stock</span>
              </button>
              <button
                type="button"
                className={`digexa-adj-toggle-btn ${
                  mode === 'REMOVE' ? 'digexa-adj-toggle-btn--active-remove' : ''
                }`}
                onClick={() => handleModeChange('REMOVE')}
                disabled={isSubmitting}
              >
                <Minus size={16} />
                <span>Remove Stock</span>
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="digexa-form-group">
            <label htmlFor="adjustment-quantity" className="digexa-form-label">
              {mode === 'ADD' ? 'Quantity to Add *' : 'Quantity to Remove *'}
            </label>
            <input
              id="adjustment-quantity"
              type="number"
              min="1"
              max={mode === 'REMOVE' ? currentStock : 999999}
              className="digexa-form-input"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. 10"
              autoFocus
            />
            {isRemovalExcessive && (
              <span className="digexa-form-error">
                Cannot remove more than current stock ({currentStock} available).
              </span>
            )}
          </div>

          {/* Live Preview Card */}
          <div className="digexa-stock-preview-card">
            <div className="digexa-stock-preview-item">
              <span className="digexa-stock-preview-label">Current Stock</span>
              <span className="digexa-stock-preview-val">{currentStock}</span>
            </div>
            <span className="digexa-stock-preview-op">{mode === 'ADD' ? '+' : '-'}</span>
            <div className="digexa-stock-preview-item">
              <span className="digexa-stock-preview-label">Adjustment</span>
              <span
                className="digexa-stock-preview-val"
                style={{ color: mode === 'ADD' ? '#059669' : '#dc2626' }}
              >
                {mode === 'ADD' ? `+${qtyNumber}` : `-${qtyNumber}`}
              </span>
            </div>
            <span className="digexa-stock-preview-op">
              <ArrowRight size={18} />
            </span>
            <div className="digexa-stock-preview-item">
              <span className="digexa-stock-preview-label">New Stock</span>
              <span
                className="digexa-stock-preview-val"
                style={{
                  color: resultingStock < 0 ? '#dc2626' : resultingStock === 0 ? '#b91c1c' : '#047857',
                }}
              >
                {resultingStock}
              </span>
            </div>
          </div>

          {/* Reason Selector */}
          <div className="digexa-form-group">
            <label htmlFor="adjustment-reason" className="digexa-form-label">
              Reason *
            </label>
            <select
              id="adjustment-reason"
              className="digexa-form-select"
              value={reason}
              onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
              disabled={isSubmitting}
            >
              {mode === 'ADD' ? (
                <>
                  <option value="STOCK_RECEIVED">Stock Received (Shipment / Restock)</option>
                  <option value="MANUAL_CORRECTION">Manual Correction (Count Adjustment)</option>
                </>
              ) : (
                <>
                  <option value="DAMAGED">Damaged (Broken / Spoiled)</option>
                  <option value="EXPIRED">Expired (Past Best Before)</option>
                  <option value="MANUAL_CORRECTION">Manual Correction (Count Discrepancy)</option>
                  <option value="STOCK_RECEIVED">Stock Correction</option>
                </>
              )}
            </select>
          </div>

          {/* Optional Note */}
          <div className="digexa-form-group">
            <label htmlFor="adjustment-note" className="digexa-form-label">
              Note (Optional)
            </label>
            <textarea
              id="adjustment-note"
              className="digexa-form-textarea"
              rows={2}
              maxLength={500}
              placeholder="e.g. Invoice #PO-9821, batch inspection notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Footer Actions */}
          <div className="digexa-modal__footer" style={{ margin: '0 -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
            <button
              type="button"
              className="digexa-inventory-btn digexa-inventory-btn--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="digexa-inventory-btn digexa-inventory-btn--primary"
              disabled={isSubmitting || !isQtyValid || isRemovalExcessive || !selectedProduct}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Confirm Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

