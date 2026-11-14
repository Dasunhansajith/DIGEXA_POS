import React, { useState } from 'react'
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  RotateCcw,
  CreditCard,
  Tag,
  AlertTriangle,
  Receipt,
  User,
  X,
} from 'lucide-react'
import type { CartItem, DiscountType, POSCustomerInfo } from './types'
import { formatLKR, roundTo2Decimals } from './types'
import type { SaleResponse } from '../../api/types'
import { CustomerModal } from './CustomerModal'
import { DiscountModal } from './DiscountModal'
import { CheckoutModal } from './CheckoutModal'

interface POSCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onClearCart: () => void
  discountType: DiscountType
  discountValue: number
  onDiscountChange: (type: DiscountType, value: number) => void
  customerInfo: POSCustomerInfo
  onCustomerInfoChange: (info: POSCustomerInfo) => void
  onCheckoutSuccess?: (sale: SaleResponse) => void
}

export const POSCart: React.FC<POSCartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  discountType,
  discountValue,
  onDiscountChange,
  customerInfo,
  onCustomerInfoChange,
  onCheckoutSuccess,
}) => {
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  // Calculations
  const itemCount = items.length
  const unitCount = items.reduce((acc, item) => acc + item.quantity, 0)

  const subtotal = roundTo2Decimals(
    items.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
  )

  const calculatedDiscount = roundTo2Decimals(
    discountType === 'percent'
      ? (subtotal * Math.min(Math.max(discountValue, 0), 100)) / 100
      : Math.min(Math.max(discountValue, 0), subtotal)
  )

  const grandTotal = Math.max(0, roundTo2Decimals(subtotal - calculatedDiscount))

  const hasCustomer = Boolean(customerInfo.name || customerInfo.phone)
  const hasDiscount = discountValue > 0

  return (
    <>
      {/* Customer Modal Popup */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        customerInfo={customerInfo}
        onSave={(info) => onCustomerInfoChange(info)}
        onClear={() => onCustomerInfoChange({ name: '', phone: '' })}
        onClose={() => setIsCustomerModalOpen(false)}
      />

      {/* Discount Modal Popup */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        subtotal={subtotal}
        activeType={discountType}
        activeValue={discountValue}
        onApply={(type, value) => onDiscountChange(type, value)}
        onClose={() => setIsDiscountModalOpen(false)}
      />

      {/* Checkout Modal Popup */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        items={items}
        customerInfo={customerInfo}
        discountType={discountType}
        discountValue={discountValue}
        subtotal={subtotal}
        discountAmount={calculatedDiscount}
        grandTotal={grandTotal}
        onSuccess={(sale) => {
          if (onCheckoutSuccess) {
            onCheckoutSuccess(sale)
          }
        }}
        onClose={() => setIsCheckoutModalOpen(false)}
      />

      <aside className="pos-cart-panel" aria-label="Current POS sale order">
        {/* Cart Header */}
        <div className="pos-cart-header">
          <div className="pos-cart-header__info">
            <div className="pos-cart-header__badge">
              <span className="pos-cart-header__dot" />
              <span>Register #01</span>
            </div>
            <h3 className="pos-cart-header__title">Active Order</h3>
            <span className="pos-cart-header__meta">
              {itemCount} {itemCount === 1 ? 'line item' : 'line items'} · {unitCount} units
            </span>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              className="pos-cart-clear-btn"
              onClick={onClearCart}
              title="Clear all cart items"
              aria-label="Clear order cart"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="pos-cart-items-wrapper">
          {items.length === 0 ? (
            <div className="pos-cart-empty">
              <div className="pos-cart-empty__icon-wrap">
                <ShoppingCart size={36} className="pos-cart-empty__icon" />
              </div>
              <h4 className="pos-cart-empty__title">Your cart is empty</h4>
              <p className="pos-cart-empty__desc">
                Select or scan items from the product catalog to begin ringing up this sale.
              </p>
            </div>
          ) : (
            <ul className="pos-cart-items-list">
              {items.map((item) => {
                const product = item.product
                const isMaxStockReached = item.quantity >= product.stock
                const itemTotal = roundTo2Decimals(product.price * item.quantity)

                return (
                  <li key={product.id} className="pos-cart-item">
                    <div className="pos-cart-item__thumb">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="pos-cart-item__img"
                        />
                      ) : (
                        <div className="pos-cart-item__placeholder">
                          <Receipt size={18} />
                        </div>
                      )}
                    </div>

                    <div className="pos-cart-item__info">
                      <div className="pos-cart-item__top">
                        <span className="pos-cart-item__name" title={product.name}>
                          {product.name}
                        </span>
                        <button
                          type="button"
                          className="pos-cart-item__remove-btn"
                          onClick={() => onRemoveItem(product.id)}
                          title="Remove product"
                          aria-label={`Remove ${product.name} from cart`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="pos-cart-item__unit-price">
                        {formatLKR(product.price)} each ·{' '}
                        <span className="pos-cart-item__stock-tag">
                          Stock: {product.stock}
                        </span>
                      </div>

                      {isMaxStockReached && (
                        <div className="pos-cart-item__max-alert">
                          <AlertTriangle size={12} />
                          <span>Max stock ({product.stock}) reached</span>
                        </div>
                      )}

                      <div className="pos-cart-item__bottom">
                        {/* Quantity Stepper */}
                        <div className="pos-stepper" role="group" aria-label="Quantity controls">
                          <button
                            type="button"
                            className="pos-stepper__btn pos-stepper__btn--minus"
                            onClick={() => onUpdateQuantity(product.id, item.quantity - 1)}
                            title="Decrease quantity"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>

                          <input
                            type="number"
                            className="pos-stepper__input"
                            value={item.quantity}
                            min={1}
                            max={product.stock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10)
                              if (!isNaN(val)) {
                                onUpdateQuantity(product.id, val)
                              }
                            }}
                            aria-label={`Quantity of ${product.name}`}
                          />

                          <button
                            type="button"
                            className={`pos-stepper__btn pos-stepper__btn--plus ${
                              isMaxStockReached ? 'pos-stepper__btn--disabled' : ''
                            }`}
                            onClick={() => onUpdateQuantity(product.id, item.quantity + 1)}
                            disabled={isMaxStockReached}
                            title={
                              isMaxStockReached
                                ? `Cannot exceed available stock (${product.stock})`
                                : 'Increase quantity'
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Line Item Total */}
                        <div className="pos-cart-item__total">
                          {formatLKR(itemTotal)}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Cart Summary & Financial Breakdown */}
        <div className="pos-cart-footer">
          {/* Action Trigger Buttons for Modals */}
          <div className="pos-cart-options">
            {/* Customer Modal Button */}
            <button
              type="button"
              className={`pos-cart-toggle-btn ${hasCustomer ? 'pos-cart-toggle-btn--active' : ''}`}
              onClick={() => setIsCustomerModalOpen(true)}
              title={
                hasCustomer
                  ? `Customer: ${customerInfo.name || ''} ${customerInfo.phone ? `(${customerInfo.phone})` : ''} - Click to edit`
                  : 'Assign customer to order'
              }
            >
              <User size={14} />
              <span className="pos-cart-btn-label">
                {hasCustomer ? (
                  <span className="pos-customer-chip-text">
                    {customerInfo.name || customerInfo.phone}
                  </span>
                ) : (
                  'Customer'
                )}
              </span>

              {hasCustomer ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="pos-cart-chip-clear"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCustomerInfoChange({ name: '', phone: '' })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onCustomerInfoChange({ name: '', phone: '' })
                    }
                  }}
                  title="Clear customer"
                  aria-label="Clear customer"
                >
                  <X size={12} />
                </span>
              ) : (
                <span className="pos-cart-btn-add-tag">+</span>
              )}
            </button>

            {/* Discount Modal Button */}
            <button
              type="button"
              className={`pos-cart-toggle-btn ${hasDiscount ? 'pos-cart-toggle-btn--active' : ''}`}
              onClick={() => setIsDiscountModalOpen(true)}
              title={
                hasDiscount
                  ? `Active Discount: ${
                      discountType === 'percent'
                        ? `${discountValue}%`
                        : formatLKR(discountValue)
                    } - Click to modify`
                  : 'Apply discount to order'
              }
            >
              <Tag size={14} />
              <span className="pos-cart-btn-label">
                {hasDiscount ? (
                  <span className="pos-discount-chip-text">
                    {discountType === 'percent'
                      ? `${discountValue}% Off`
                      : `Rs. ${discountValue} Off`}
                  </span>
                ) : (
                  'Discount'
                )}
              </span>

              {hasDiscount ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="pos-cart-chip-clear"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDiscountChange('percent', 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onDiscountChange('percent', 0)
                    }
                  }}
                  title="Remove discount"
                  aria-label="Remove discount"
                >
                  <X size={12} />
                </span>
              ) : (
                <span className="pos-cart-btn-add-tag">+</span>
              )}
            </button>
          </div>

          {/* Calculations Breakdown */}
          <div className="pos-cart-breakdown">
            <div className="pos-breakdown-row">
              <span className="pos-breakdown-label">Subtotal</span>
              <span className="pos-breakdown-value">{formatLKR(subtotal)}</span>
            </div>

            {calculatedDiscount > 0 && (
              <div className="pos-breakdown-row pos-breakdown-row--discount">
                <span className="pos-breakdown-label">
                  Discount ({discountType === 'percent' ? `${discountValue}%` : 'Fixed'})
                </span>
                <span className="pos-breakdown-value">-{formatLKR(calculatedDiscount)}</span>
              </div>
            )}

            <div className="pos-breakdown-row">
              <span className="pos-breakdown-label">Taxes & Fees (0%)</span>
              <span className="pos-breakdown-value">Rs. 0.00</span>
            </div>

            <div className="pos-breakdown-divider" />

            {/* Grand Total */}
            <div className="pos-total-row">
              <div className="pos-total-row__label-group">
                <span className="pos-total-row__title">Total Due</span>
                <span className="pos-total-row__subtitle">LKR (Sri Lankan Rupees)</span>
              </div>
              <div className="pos-total-row__amount">{formatLKR(grandTotal)}</div>
            </div>
          </div>

          {/* Checkout Action Button */}
          <div className="pos-checkout-section">
            <button
              type="button"
              className={`pos-checkout-btn ${
                items.length === 0
                  ? 'pos-checkout-btn--disabled'
                  : 'pos-checkout-btn--active'
              }`}
              disabled={items.length === 0}
              onClick={() => {
                if (items.length > 0) {
                  setIsCheckoutModalOpen(true)
                }
              }}
              title={
                items.length === 0
                  ? 'Add items to cart to proceed to checkout'
                  : `Proceed to Checkout (${formatLKR(grandTotal)})`
              }
              aria-disabled={items.length === 0}
            >
              <div className="pos-checkout-btn__inner">
                <CreditCard size={18} />
                <span>Proceed to Checkout</span>
                <span className="pos-checkout-btn__badge">{formatLKR(grandTotal)}</span>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
