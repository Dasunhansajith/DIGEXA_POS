import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Tag,
  Percent,
  X,
  Check,
  RotateCcw,
  AlertCircle,
  Coins,
} from 'lucide-react'
import type { DiscountType } from './types'
import { formatLKR, roundTo2Decimals } from './types'

interface DiscountModalProps {
  isOpen: boolean
  subtotal: number
  activeType: DiscountType
  activeValue: number
  onApply: (type: DiscountType, value: number) => void
  onClose: () => void
}

type DiscountSelection = 'none' | '5' | '10' | '15' | '20' | 'custom'

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  subtotal,
  activeType,
  activeValue,
  onApply,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<DiscountSelection>('none')
  const [customType, setCustomType] = useState<DiscountType>('percent')
  const [customValueInput, setCustomValueInput] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

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

  // Initialize modal state from active discount when opening
  useEffect(() => {
    if (isOpen) {
      setValidationError(null)
      if (activeValue <= 0) {
        setSelectedOption('none')
        setCustomType('percent')
        setCustomValueInput('')
      } else if (activeType === 'percent' && [5, 10, 15, 20].includes(activeValue)) {
        setSelectedOption(String(activeValue) as DiscountSelection)
        setCustomType('percent')
        setCustomValueInput(String(activeValue))
      } else {
        setSelectedOption('custom')
        setCustomType(activeType)
        setCustomValueInput(String(activeValue))
        setTimeout(() => {
          customInputRef.current?.focus()
        }, 50)
      }
    }
  }, [isOpen, activeType, activeValue])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Live calculation of preview discount and total
  const { previewDiscount, previewTotal, isValid } = useMemo(() => {
    if (subtotal <= 0) {
      return { previewDiscount: 0, previewTotal: 0, isValid: true }
    }

    if (selectedOption === 'none') {
      return { previewDiscount: 0, previewTotal: subtotal, isValid: true }
    }

    if (selectedOption !== 'custom') {
      const pct = parseFloat(selectedOption)
      const discount = roundTo2Decimals((subtotal * pct) / 100)
      return {
        previewDiscount: discount,
        previewTotal: Math.max(0, roundTo2Decimals(subtotal - discount)),
        isValid: true,
      }
    }

    // Custom option
    const num = parseFloat(customValueInput)
    if (isNaN(num) || num < 0) {
      return { previewDiscount: 0, previewTotal: subtotal, isValid: false }
    }

    if (customType === 'percent') {
      if (num > 100) {
        return { previewDiscount: 0, previewTotal: subtotal, isValid: false }
      }
      const discount = roundTo2Decimals((subtotal * num) / 100)
      return {
        previewDiscount: discount,
        previewTotal: Math.max(0, roundTo2Decimals(subtotal - discount)),
        isValid: true,
      }
    } else {
      // Fixed Rs amount
      if (num > subtotal) {
        return { previewDiscount: 0, previewTotal: subtotal, isValid: false }
      }
      const discount = roundTo2Decimals(num)
      return {
        previewDiscount: discount,
        previewTotal: Math.max(0, roundTo2Decimals(subtotal - discount)),
        isValid: true,
      }
    }
  }, [subtotal, selectedOption, customType, customValueInput])

  if (!isOpen || typeof document === 'undefined') return null

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedOption === 'none') {
      onApply('percent', 0)
      onClose()
      return
    }

    if (selectedOption !== 'custom') {
      const pct = parseFloat(selectedOption)
      onApply('percent', pct)
      onClose()
      return
    }

    // Custom validation
    const num = parseFloat(customValueInput)
    if (isNaN(num) || num < 0) {
      setValidationError('Please enter a valid discount value (greater than or equal to 0).')
      return
    }

    if (customType === 'percent') {
      if (num > 100) {
        setValidationError('Percentage discount cannot exceed 100%.')
        return
      }
      onApply('percent', num)
    } else {
      if (num > subtotal) {
        setValidationError(`Fixed discount cannot exceed order subtotal (${formatLKR(subtotal)}).`)
        return
      }
      onApply('fixed', num)
    }

    onClose()
  }

  const handleResetToNone = () => {
    onApply('percent', 0)
    onClose()
  }

  const presets = [
    { label: 'None (0%)', value: 'none' as const },
    { label: '5%', value: '5' as const },
    { label: '10%', value: '10' as const },
    { label: '15%', value: '15' as const },
    { label: '20%', value: '20' as const },
    { label: 'Custom', value: 'custom' as const },
  ]

  const modalContent = (
    <div
      className="digexa-modal-backdrop pos-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="digexa-modal digexa-modal--sm pos-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-modal-title"
        aria-describedby="discount-modal-desc"
      >
        {/* Modal Header */}
        <div className="digexa-modal__header">
          <div className="pos-modal__header-content">
            <div className="pos-modal__icon-pill pos-modal__icon-pill--discount">
              <Tag size={18} />
            </div>
            <div>
              <h3 id="discount-modal-title" className="digexa-modal__title">
                Apply Order Discount
              </h3>
              <p id="discount-modal-desc" className="digexa-modal__subtitle">
                Select a preset percentage or enter a custom reduction
              </p>
            </div>
          </div>
          <button
            type="button"
            className="digexa-modal__close-btn"
            onClick={onClose}
            aria-label="Close discount modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleApply} className="digexa-modal__form pos-modal__form">
          {/* Preset Buttons Grid */}
          <div className="pos-modal__field">
            <label className="pos-modal__label">Discount Options</label>
            <div className="pos-discount-modal-grid">
              {presets.map((preset) => {
                const isSelected = selectedOption === preset.value
                return (
                  <button
                    key={preset.value}
                    type="button"
                    className={`pos-discount-modal-btn ${
                      isSelected ? 'pos-discount-modal-btn--active' : ''
                    }`}
                    onClick={() => {
                      setSelectedOption(preset.value)
                      setValidationError(null)
                      if (preset.value === 'custom') {
                        setTimeout(() => customInputRef.current?.focus(), 50)
                      }
                    }}
                  >
                    {preset.value === 'none' ? (
                      <RotateCcw size={14} />
                    ) : preset.value === 'custom' ? (
                      <Coins size={14} />
                    ) : (
                      <Percent size={14} />
                    )}
                    <span>{preset.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Discount Input Section */}
          {selectedOption === 'custom' && (
            <div className="pos-custom-discount-pane">
              <div className="pos-custom-discount-tabs">
                <button
                  type="button"
                  className={`pos-custom-discount-tab ${
                    customType === 'percent' ? 'pos-custom-discount-tab--active' : ''
                  }`}
                  onClick={() => {
                    setCustomType('percent')
                    setValidationError(null)
                  }}
                >
                  <Percent size={14} />
                  <span>Percentage (%)</span>
                </button>
                <button
                  type="button"
                  className={`pos-custom-discount-tab ${
                    customType === 'fixed' ? 'pos-custom-discount-tab--active' : ''
                  }`}
                  onClick={() => {
                    setCustomType('fixed')
                    setValidationError(null)
                  }}
                >
                  <span>Fixed Amount (Rs.)</span>
                </button>
              </div>

              <div className="pos-modal__input-wrapper">
                <input
                  ref={customInputRef}
                  type="number"
                  step="any"
                  min="0"
                  max={customType === 'percent' ? 100 : subtotal}
                  className="pos-modal__input"
                  placeholder={
                    customType === 'percent'
                      ? 'Enter percentage (e.g. 12.5)'
                      : `Enter amount in Rs. (max ${formatLKR(subtotal)})`
                  }
                  value={customValueInput}
                  onChange={(e) => {
                    setCustomValueInput(e.target.value)
                    setValidationError(null)
                  }}
                />
                <span className="pos-input-suffix">
                  {customType === 'percent' ? '%' : 'Rs.'}
                </span>
              </div>
            </div>
          )}

          {/* Validation Error Message */}
          {validationError && (
            <div className="pos-modal__alert-error">
              <AlertCircle size={15} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Live Discount & Total Preview Card */}
          <div className="pos-discount-preview-card">
            <div className="pos-discount-preview-row">
              <span className="pos-preview-label">Order Subtotal</span>
              <span className="pos-preview-val">{formatLKR(subtotal)}</span>
            </div>

            <div className="pos-discount-preview-row pos-discount-preview-row--saving">
              <span className="pos-preview-label">Discount Applied</span>
              <span className="pos-preview-val">
                {previewDiscount > 0 ? `-${formatLKR(previewDiscount)}` : 'Rs. 0.00'}
              </span>
            </div>

            <div className="pos-preview-divider" />

            <div className="pos-discount-preview-row pos-discount-preview-row--total">
              <span className="pos-preview-label">Updated Total Due</span>
              <span className="pos-preview-amount">{formatLKR(previewTotal)}</span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="digexa-modal__footer pos-modal__footer">
            {activeValue > 0 && (
              <button
                type="button"
                className="pos-modal__btn-danger"
                onClick={handleResetToNone}
                title="Remove discount from cart"
              >
                <RotateCcw size={15} />
                <span>Remove Discount</span>
              </button>
            )}

            <div className="pos-modal__actions-right">
              <button
                type="button"
                className="digexa-btn digexa-btn--secondary digexa-btn--sm"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="digexa-btn digexa-btn--primary digexa-btn--sm"
                disabled={!isValid && selectedOption === 'custom'}
              >
                <Check size={15} />
                <span>Apply Discount</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
