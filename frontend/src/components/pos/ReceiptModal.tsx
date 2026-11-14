import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  FileText,
  Smartphone,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import type { SaleResponse } from '../../api/types'
import { saleApi, ApiError } from '../../api/client'
import { Receipt, type ReceiptFormat } from './Receipt'

interface ReceiptModalProps {
  isOpen: boolean
  sale?: SaleResponse | null
  saleId?: number | null
  shopName?: string
  initialFormat?: ReceiptFormat
  onClose: () => void
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  sale: initialSale,
  saleId,
  shopName,
  initialFormat = '80mm',
  onClose,
}) => {
  const [format, setFormat] = useState<ReceiptFormat>(initialFormat)
  const [currentSale, setCurrentSale] = useState<SaleResponse | null>(initialSale || null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Fetch sale if only saleId is provided (Print Again / Reprint flow)
  useEffect(() => {
    if (isOpen) {
      if (initialSale) {
        setCurrentSale(initialSale)
        setErrorMessage(null)
      } else if (saleId) {
        const fetchSale = async () => {
          setIsLoading(true)
          setErrorMessage(null)
          try {
            const data = await saleApi.getById(saleId)
            setCurrentSale(data)
          } catch (err: unknown) {
            if (err instanceof ApiError) {
              if (err.status === 404) {
                setErrorMessage('Sale record not found or does not belong to this shop.')
              } else {
                setErrorMessage(err.message || 'Failed to retrieve sale details for receipt.')
              }
            } else if (err instanceof Error) {
              setErrorMessage(err.message)
            } else {
              setErrorMessage('An unexpected error occurred while loading the sale.')
            }
          } finally {
            setIsLoading(false)
          }
        }
        fetchSale()
      }
    }
  }, [isOpen, initialSale, saleId])

  // Native print trigger
  const handlePrint = () => {
    if (!currentSale) return
    window.print()
  }

  if (!isOpen || typeof document === 'undefined') return null

  const modalContent = (
    <div
      className="digexa-modal-backdrop pos-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="digexa-modal pos-receipt-modal no-print-modal-wrapper"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
      >
        {/* Modal Header */}
        <div className="digexa-modal__header pos-receipt-modal__header no-print">
          <div className="pos-modal__header-content">
            <div className="pos-modal__icon-pill pos-modal__icon-pill--checkout">
              <Printer size={18} />
            </div>
            <div>
              <h3 id="receipt-modal-title" className="digexa-modal__title">
                Print Sale Receipt
              </h3>
              <p className="digexa-modal__subtitle">
                Select format and print via browser print dialogue
              </p>
            </div>
          </div>

          <button
            type="button"
            className="digexa-modal__close-btn"
            onClick={onClose}
            aria-label="Close receipt modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="pos-receipt-toolbar no-print">
          <div className="pos-receipt-format-toggle" role="radiogroup" aria-label="Receipt format">
            <button
              type="button"
              role="radio"
              aria-checked={format === '80mm'}
              className={`pos-format-btn ${format === '80mm' ? 'pos-format-btn--active' : ''}`}
              onClick={() => setFormat('80mm')}
            >
              <Smartphone size={15} />
              <span>80mm Thermal (POS)</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={format === 'a4'}
              className={`pos-format-btn ${format === 'a4' ? 'pos-format-btn--active' : ''}`}
              onClick={() => setFormat('a4')}
            >
              <FileText size={15} />
              <span>A4 Standard (Sheet)</span>
            </button>
          </div>

          <div className="pos-receipt-toolbar__right">
            <button
              type="button"
              className="digexa-btn digexa-btn--primary pos-receipt-print-btn"
              onClick={handlePrint}
              disabled={isLoading || !currentSale}
            >
              <Printer size={16} />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>

        {/* Modal Content Body / Preview */}
        <div className="pos-receipt-modal__body">
          {isLoading ? (
            <div className="pos-receipt-loading">
              <Loader2 size={32} className="pos-spinner" />
              <span>Loading persisted sale details...</span>
            </div>
          ) : errorMessage ? (
            <div className="pos-receipt-error">
              <AlertCircle size={28} />
              <div className="pos-receipt-error__content">
                <strong>Unable to load receipt</strong>
                <p>{errorMessage}</p>
              </div>
              {saleId && (
                <button
                  type="button"
                  className="digexa-btn digexa-btn--secondary digexa-btn--sm"
                  onClick={() => {
                    setErrorMessage(null)
                    setIsLoading(true)
                    saleApi.getById(saleId).then(setCurrentSale).catch((e) => setErrorMessage(e.message)).finally(() => setIsLoading(false))
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Retry</span>
                </button>
              )}
            </div>
          ) : currentSale ? (
            <div className="pos-receipt-preview-wrap">
              <Receipt sale={currentSale} shopName={shopName} format={format} />
            </div>
          ) : (
            <div className="pos-receipt-empty">
              <span>No sale data available to preview.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="digexa-modal__footer pos-receipt-modal__footer no-print">
          <span className="pos-receipt-footer-hint">
            Tip: In the print dialog, uncheck &quot;Headers and footers&quot; for optimal thermal receipt output.
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
  )

  return createPortal(modalContent, document.body)
}

