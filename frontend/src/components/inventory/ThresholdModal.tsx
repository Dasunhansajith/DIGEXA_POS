import React, { useState, useEffect } from 'react'
import { X, Check, Loader2, AlertCircle } from 'lucide-react'
import type { InventoryProductResponse, UpdateThresholdRequest } from '../../api/types'
import { inventoryApi, ApiError } from '../../api/client'

interface ThresholdModalProps {
  isOpen: boolean
  onClose: () => void
  product: InventoryProductResponse | null
  onSuccess: (updated: InventoryProductResponse, message: string) => void
}

export const ThresholdModal: React.FC<ThresholdModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [thresholdInput, setThresholdInput] = useState<string>('5')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      setThresholdInput(product.lowStockThreshold.toString())
      setErrorMessage(null)
      setIsSubmitting(false)
    }
  }, [product, isOpen])

  if (!isOpen || !product) return null

  const thresholdNum = parseInt(thresholdInput, 10)
  const isValid = !isNaN(thresholdNum) && thresholdNum >= 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      setErrorMessage('Threshold must be a valid number greater than or equal to 0.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const payload: UpdateThresholdRequest = {
      lowStockThreshold: thresholdNum,
    }

    try {
      const updated = await inventoryApi.updateThreshold(product.productId, payload)
      onSuccess(
        updated,
        `Low-stock threshold for "${updated.productName}" updated to ${updated.lowStockThreshold} units.`
      )
      onClose()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to update threshold. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="digexa-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="digexa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="digexa-modal__header">
          <h2 className="digexa-modal__title">Configure Stock Threshold</h2>
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

        <form onSubmit={handleSubmit} className="digexa-modal__body">
          {errorMessage && (
            <div
              className="digexa-inventory-alert"
              style={{ borderLeftColor: '#ef4444', backgroundColor: '#fef2f2', color: '#b91c1c' }}
            >
              <div className="digexa-inventory-alert__content">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <div className="digexa-modal-info-card">
            <span className="digexa-modal-info-card__title">{product.productName}</span>
            <span className="digexa-modal-info-card__sub">
              Current Stock: <strong>{product.stockQuantity} units</strong> &bull; Current Threshold:{' '}
              <strong>{product.lowStockThreshold} units</strong>
            </span>
          </div>

          <div className="digexa-form-group">
            <label htmlFor="new-threshold-input" className="digexa-form-label">
              New Low-Stock Threshold (Units) *
            </label>
            <input
              id="new-threshold-input"
              type="number"
              min="0"
              max="99999"
              className="digexa-form-input"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            <span style={{ fontSize: '0.785rem', color: '#64748b', marginTop: '0.2rem' }}>
              When stock drops to or below this quantity, this item is flagged as <strong>Low Stock</strong>.
            </span>
          </div>

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
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Threshold</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
