import React, { useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { ProductResponse } from '../../api/types'

interface ProductDeleteDialogProps {
  isOpen: boolean
  product: ProductResponse | null
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export const ProductDeleteDialog: React.FC<ProductDeleteDialogProps> = ({
  isOpen,
  product,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen || !product) return null

  return (
    <div className="digexa-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="digexa-modal digexa-modal--sm"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
      >
        <div className="digexa-delete-dialog">
          <div className="digexa-delete-dialog__icon-wrap">
            <AlertTriangle size={24} className="text-red-500" />
          </div>

          <h3 id="delete-dialog-title" className="digexa-delete-dialog__title">
            Delete Product?
          </h3>

          <p id="delete-dialog-desc" className="digexa-delete-dialog__desc">
            Are you sure you want to permanently remove{' '}
            <strong className="text-slate-900">"{product.name}"</strong> (SKU #{product.id})
            from your shop catalog? This action cannot be undone.
          </p>

          <div className="digexa-delete-dialog__meta">
            <span className="digexa-delete-dialog__meta-pill">
              Stock: {product.stock} units
            </span>
            <span className="digexa-delete-dialog__meta-pill">
              Price: ${Number(product.price).toFixed(2)}
            </span>
          </div>

          <div className="digexa-delete-dialog__actions">
            <button
              type="button"
              className="digexa-btn digexa-btn--outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="digexa-btn digexa-btn--danger"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="digexa-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                'Yes, Delete Product'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

