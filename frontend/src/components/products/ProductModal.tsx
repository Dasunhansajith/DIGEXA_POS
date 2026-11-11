import React, { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import type { ProductRequest, ProductResponse } from '../../api/types'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProductRequest) => Promise<void>
  initialProduct?: ProductResponse | null
  existingCategories?: string[]
}

const COMMON_CATEGORIES = [
  'Electronics',
  'Groceries',
  'Beverages',
  'Apparel & Fashion',
  'Home & Kitchen',
  'Health & Beauty',
  'Stationery',
  'Bakery & Fresh',
]

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProduct = null,
  existingCategories = [],
}) => {
  const isEditing = Boolean(initialProduct)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('0')
  const [imageUrl, setImageUrl] = useState('')
  const [imageError, setImageError] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Combine and deduplicate categories
  const categories = Array.from(
    new Set([...COMMON_CATEGORIES, ...existingCategories.filter(Boolean)])
  )

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name || '')
      setDescription(initialProduct.description || '')
      setPrice(initialProduct.price !== undefined ? String(initialProduct.price) : '')
      setCategory(initialProduct.category || '')
      setStock(initialProduct.stock !== undefined ? String(initialProduct.stock) : '0')
      setImageUrl(initialProduct.imageUrl || '')
      setImageError(false)
    } else {
      setName('')
      setDescription('')
      setPrice('')
      setCategory('Electronics')
      setStock('10')
      setImageUrl('')
      setImageError(false)
    }
    setErrors({})
    setGeneralError(null)
  }, [initialProduct, isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Product name is required.'
    } else if (name.trim().length > 255) {
      newErrors.name = 'Product name cannot exceed 255 characters.'
    }

    if (!price.trim()) {
      newErrors.price = 'Price is required.'
    } else {
      const numPrice = Number(price)
      if (isNaN(numPrice) || numPrice < 0) {
        newErrors.price = 'Price must be a valid non-negative number.'
      }
    }

    if (stock.trim()) {
      const numStock = Number(stock)
      if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
        newErrors.stock = 'Stock must be a whole non-negative number.'
      }
    }

    if (description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      const payload: ProductRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: parseFloat(parseFloat(price).toFixed(2)),
        category: category.trim() || undefined,
        stock: stock.trim() ? parseInt(stock, 10) : 0,
        imageUrl: imageUrl.trim() || undefined,
      }
      await onSave(payload)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setGeneralError(err.message)
      } else {
        setGeneralError('Failed to save product. Please verify fields and try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="digexa-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="digexa-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        {/* Header */}
        <div className="digexa-modal__header">
          <div>
            <h2 id="product-modal-title" className="digexa-modal__title">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="digexa-modal__subtitle">
              {isEditing
                ? `Update details for SKU #${initialProduct?.id}`
                : 'Create a new product in your shop catalog.'}
            </p>
          </div>
          <button
            type="button"
            className="digexa-modal__close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="digexa-modal__alert digexa-modal__alert--error">
            {generalError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="digexa-modal__form">
          {/* Row 1: Name */}
          <div className="digexa-form-group">
            <label htmlFor="product-name" className="digexa-label">
              Product Name <span className="digexa-label__required">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              className={`digexa-input ${errors.name ? 'digexa-input--error' : ''}`}
              placeholder="e.g. Organic Green Tea 100g"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
              }}
              autoFocus
              disabled={isSubmitting}
            />
            {errors.name && <span className="digexa-error-text">{errors.name}</span>}
          </div>

          {/* Row 2: Category & Price */}
          <div className="digexa-form-row">
            <div className="digexa-form-group">
              <label htmlFor="product-category" className="digexa-label">
                Category
              </label>
              <div className="digexa-select-wrapper">
                <input
                  id="product-category"
                  type="text"
                  list="category-suggestions"
                  className="digexa-input"
                  placeholder="Select or enter category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                />
                <datalist id="category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="digexa-form-group">
              <label htmlFor="product-price" className="digexa-label">
                Unit Price ($) <span className="digexa-label__required">*</span>
              </label>
              <div className="digexa-input-prefix-wrapper">
                <span className="digexa-input-prefix">$</span>
                <input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`digexa-input digexa-input--prefixed ${
                    errors.price ? 'digexa-input--error' : ''
                  }`}
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value)
                    if (errors.price) setErrors((prev) => ({ ...prev, price: '' }))
                  }}
                  disabled={isSubmitting}
                />
              </div>
              {errors.price && <span className="digexa-error-text">{errors.price}</span>}
            </div>
          </div>

          {/* Row 3: Stock Quantity & Image URL */}
          <div className="digexa-form-row">
            <div className="digexa-form-group">
              <label htmlFor="product-stock" className="digexa-label">
                Stock Units <span className="digexa-label__required">*</span>
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                className={`digexa-input ${errors.stock ? 'digexa-input--error' : ''}`}
                placeholder="0"
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value)
                  if (errors.stock) setErrors((prev) => ({ ...prev, stock: '' }))
                }}
                disabled={isSubmitting}
              />
              {errors.stock && <span className="digexa-error-text">{errors.stock}</span>}
            </div>

            <div className="digexa-form-group">
              <label htmlFor="product-image" className="digexa-label">
                Image URL <span className="digexa-label__optional">(Optional)</span>
              </label>
              <input
                id="product-image"
                type="url"
                className="digexa-input"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value)
                  setImageError(false)
                }}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Live Image Preview Thumbnail */}
          {imageUrl.trim() && (
            <div className="digexa-image-preview-box">
              <div className="digexa-image-preview-thumb">
                {!imageError ? (
                  <img
                    src={imageUrl.trim()}
                    alt="Preview"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="digexa-image-preview-fallback">
                    <ImageIcon size={20} />
                    <span>Unable to load image URL preview</span>
                  </div>
                )}
              </div>
              <span className="digexa-image-preview-text">
                Live image preview for catalog card
              </span>
            </div>
          )}

          {/* Row 4: Description */}
          <div className="digexa-form-group">
            <div className="digexa-label-row">
              <label htmlFor="product-desc" className="digexa-label">
                Description <span className="digexa-label__optional">(Optional)</span>
              </label>
              <span className="digexa-char-count">{description.length}/1000</span>
            </div>
            <textarea
              id="product-desc"
              rows={3}
              className={`digexa-textarea ${
                errors.description ? 'digexa-textarea--error' : ''
              }`}
              placeholder="Provide a concise product overview for register lookups and receipts..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
              }}
              disabled={isSubmitting}
            />
            {errors.description && (
              <span className="digexa-error-text">{errors.description}</span>
            )}
          </div>

          {/* Actions */}
          <div className="digexa-modal__footer">
            <button
              type="button"
              className="digexa-btn digexa-btn--outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="digexa-btn digexa-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="digexa-spin" />
                  <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

