import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { User, Phone, X, Check, Trash2, UserCheck } from 'lucide-react'
import type { POSCustomerInfo } from './types'

interface CustomerModalProps {
  isOpen: boolean
  customerInfo: POSCustomerInfo
  onSave: (info: POSCustomerInfo) => void
  onClear: () => void
  onClose: () => void
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  customerInfo,
  onSave,
  onClear,
  onClose,
}) => {
  const [name, setName] = useState(customerInfo.name || '')
  const [phone, setPhone] = useState(customerInfo.phone || '')
  const nameInputRef = useRef<HTMLInputElement>(null)

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

  // Sync internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(customerInfo.name || '')
      setPhone(customerInfo.phone || '')
      // Auto-focus first input
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, customerInfo])

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

  if (!isOpen || typeof document === 'undefined') return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: name.trim(),
      phone: phone.trim(),
    })
    onClose()
  }

  const handleClear = () => {
    setName('')
    setPhone('')
    onClear()
    onClose()
  }

  const hasExistingCustomer = Boolean(customerInfo.name || customerInfo.phone)

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
        aria-labelledby="customer-modal-title"
        aria-describedby="customer-modal-desc"
      >
        {/* Modal Header */}
        <div className="digexa-modal__header">
          <div className="pos-modal__header-content">
            <div className="pos-modal__icon-pill">
              <User size={18} />
            </div>
            <div>
              <h3 id="customer-modal-title" className="digexa-modal__title">
                {hasExistingCustomer ? 'Edit Customer' : 'Assign Customer'}
              </h3>
              <p id="customer-modal-desc" className="digexa-modal__subtitle">
                Link this sale to a customer for order tracking & receipts
              </p>
            </div>
          </div>
          <button
            type="button"
            className="digexa-modal__close-btn"
            onClick={onClose}
            aria-label="Close customer modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="digexa-modal__form pos-modal__form">
          <div className="pos-modal__field">
            <label htmlFor="pos-customer-name" className="pos-modal__label">
              Customer Name
            </label>
            <div className="pos-modal__input-wrapper">
              <User size={16} className="pos-modal__field-icon" />
              <input
                ref={nameInputRef}
                id="pos-customer-name"
                type="text"
                className="pos-modal__input"
                placeholder="e.g. Kasun Fernando"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          <div className="pos-modal__field">
            <label htmlFor="pos-customer-phone" className="pos-modal__label">
              Phone Number <span className="pos-modal__optional">(Optional)</span>
            </label>
            <div className="pos-modal__input-wrapper">
              <Phone size={16} className="pos-modal__field-icon" />
              <input
                id="pos-customer-phone"
                type="tel"
                className="pos-modal__input"
                placeholder="e.g. 077 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
              />
            </div>
          </div>

          {/* Quick tips */}
          <div className="pos-modal__tip">
            <UserCheck size={14} />
            <span>Customer details will be attached to this transaction summary.</span>
          </div>

          {/* Modal Footer Actions */}
          <div className="digexa-modal__footer pos-modal__footer">
            {hasExistingCustomer && (
              <button
                type="button"
                className="pos-modal__btn-danger"
                onClick={handleClear}
                title="Remove customer from current order"
              >
                <Trash2 size={15} />
                <span>Clear Customer</span>
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
              >
                <Check size={15} />
                <span>Save Customer</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

