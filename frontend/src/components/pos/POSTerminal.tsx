import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShoppingBag,
  Laptop,
  Layers,
  Sparkles,
  History,
} from 'lucide-react'
import { productApi } from '../../api/client'
import type { ProductResponse, SaleResponse } from '../../api/types'
import { POSProductCatalog } from './POSProductCatalog'
import { POSCart } from './POSCart'
import { RecentSalesModal } from './RecentSalesModal'
import type { CartItem, DiscountType, POSCustomerInfo } from './types'
import { ToastContainer, type ToastMessage, type ToastType } from '../common/Toast'

export const POSTerminal: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountType, setDiscountType] = useState<DiscountType>('percent')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [customerInfo, setCustomerInfo] = useState<POSCustomerInfo>({
    name: '',
    phone: '',
  })

  // Responsive mobile view tab ('catalog' | 'cart')
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog')

  // Recent sales / reprint modal
  const [isRecentSalesOpen, setIsRecentSalesOpen] = useState<boolean>(false)

  // Toast feedback notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const newToast: ToastMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
    }
    setToasts((prev) => [...prev, newToast])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Load real products from Spring Boot API using in-memory JWT
  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await productApi.getAll()
      setProducts(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load POS catalog'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Get current quantity of a product in the cart
  const getInCartQuantity = useCallback(
    (productId: number): number => {
      const found = cart.find((item) => item.product.id === productId)
      return found ? found.quantity : 0
    },
    [cart]
  )

  // Add product to cart with strict stock constraint
  const handleAddToCart = useCallback(
    (product: ProductResponse) => {
      // 1. Prevent adding out-of-stock items
      if (product.stock <= 0) {
        showToast(`"${product.name}" is completely out of stock.`, 'warning')
        return
      }

      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex(
          (item) => item.product.id === product.id
        )

        if (existingIndex > -1) {
          const currentQty = prevCart[existingIndex].quantity
          // 2. Prevent adding quantities exceeding available stock
          if (currentQty >= product.stock) {
            showToast(
              `Cannot add more "${product.name}". Maximum available stock (${product.stock}) reached.`,
              'warning'
            )
            return prevCart
          }

          const updated = [...prevCart]
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: currentQty + 1,
          }
          showToast(`Updated "${product.name}" quantity to ${currentQty + 1}`, 'success')
          return updated
        } else {
          showToast(`Added "${product.name}" to cart`, 'success')
          return [...prevCart, { product, quantity: 1 }]
        }
      })
    },
    [showToast]
  )

  // Update item quantity directly or via stepper
  const handleUpdateQuantity = useCallback(
    (productId: number, targetQty: number) => {
      setCart((prevCart) => {
        const item = prevCart.find((i) => i.product.id === productId)
        if (!item) return prevCart

        // If target is 0 or less, remove the item
        if (targetQty <= 0) {
          showToast(`Removed "${item.product.name}" from cart`, 'info')
          return prevCart.filter((i) => i.product.id !== productId)
        }

        // Clamp to available stock
        if (targetQty > item.product.stock) {
          showToast(
            `Quantity clamped to maximum available stock (${item.product.stock}).`,
            'warning'
          )
          return prevCart.map((i) =>
            i.product.id === productId ? { ...i, quantity: item.product.stock } : i
          )
        }

        return prevCart.map((i) =>
          i.product.id === productId ? { ...i, quantity: targetQty } : i
        )
      })
    },
    [showToast]
  )

  // Remove single line item
  const handleRemoveItem = useCallback(
    (productId: number) => {
      setCart((prev) => {
        const item = prev.find((i) => i.product.id === productId)
        if (item) {
          showToast(`Removed "${item.product.name}"`, 'info')
        }
        return prev.filter((i) => i.product.id !== productId)
      })
    },
    [showToast]
  )

  // Clear entire cart
  const handleClearCart = useCallback(() => {
    if (cart.length === 0) return
    setCart([])
    setDiscountValue(0)
    setCustomerInfo({ name: '', phone: '' })
    showToast('Cart cleared', 'info')
  }, [cart.length, showToast])

  // Handle successful sale checkout confirmed by server
  const handleCheckoutSuccess = useCallback(
    (sale: SaleResponse) => {
      // 1. Clear cart state
      setCart([])
      setDiscountValue(0)
      setCustomerInfo({ name: '', phone: '' })

      // 2. Refresh inventory in real-time
      loadProducts()

      // 3. Show success notification
      showToast(
        `Sale completed successfully! Receipt: ${sale.receiptNumber}`,
        'success'
      )
    },
    [loadProducts, showToast]
  )

  // Total cart units for mobile badge
  const totalCartUnits = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  )

  return (
    <div className="pos-terminal-wrapper">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Cashier Terminal Header Banner */}
      <header className="pos-terminal-header">
        <div className="pos-terminal-header__left">
          <div className="pos-terminal-icon-pill">
            <Laptop size={18} />
            <span>Terminal 01</span>
          </div>
          <div className="pos-terminal-header__titles">
            <h2 className="pos-terminal-title">Checkout Register</h2>
            <p className="pos-terminal-subtitle">
              Fast, omnichannel point-of-sale · Real-time stock validation
            </p>
          </div>
        </div>

        <div className="pos-terminal-header__right">
          <button
            type="button"
            className="pos-terminal-recent-sales-btn"
            onClick={() => setIsRecentSalesOpen(true)}
            title="Browse past sales and reprint receipts"
          >
            <History size={15} />
            <span>Past Receipts</span>
          </button>

          <div className="pos-terminal-status-chip">
            <span className="pos-pulse-dot" />
            <span>POS Engine Live</span>
          </div>
          <div className="pos-terminal-currency-chip">
            <Sparkles size={14} />
            <span>Currency: LKR (Rs.)</span>
          </div>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="pos-mobile-nav" role="tablist" aria-label="Terminal views">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'catalog'}
          className={`pos-mobile-nav__btn ${
            mobileTab === 'catalog' ? 'pos-mobile-nav__btn--active' : ''
          }`}
          onClick={() => setMobileTab('catalog')}
        >
          <Layers size={16} />
          <span>Products</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'cart'}
          className={`pos-mobile-nav__btn ${
            mobileTab === 'cart' ? 'pos-mobile-nav__btn--active' : ''
          }`}
          onClick={() => setMobileTab('cart')}
        >
          <ShoppingBag size={16} />
          <span>Cart</span>
          {totalCartUnits > 0 && (
            <span className="pos-mobile-nav__badge">{totalCartUnits}</span>
          )}
        </button>
      </div>

      {/* Main Terminal Grid: Left (Catalog) & Right (Cart) */}
      <div className="pos-terminal-body">
        {/* Left Side: Product Search, Category Filters, and Grid */}
        <div
          className={`pos-terminal-left ${
            mobileTab === 'catalog' ? 'pos-terminal-left--mobile-visible' : ''
          }`}
        >
          <POSProductCatalog
            products={products}
            isLoading={isLoading}
            error={error}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            getInCartQuantity={getInCartQuantity}
            onRetry={loadProducts}
          />
        </div>

        {/* Right Side: Shopping Cart with Controls, Calculations, and Disabled Checkout */}
        <div
          className={`pos-terminal-right ${
            mobileTab === 'cart' ? 'pos-terminal-right--mobile-visible' : ''
          }`}
        >
          <POSCart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            discountType={discountType}
            discountValue={discountValue}
            onDiscountChange={(type, val) => {
              setDiscountType(type)
              setDiscountValue(val)
            }}
            customerInfo={customerInfo}
            onCustomerInfoChange={setCustomerInfo}
            onCheckoutSuccess={handleCheckoutSuccess}
          />
        </div>
      </div>

      {/* Recent Sales & Receipts Modal */}
      <RecentSalesModal
        isOpen={isRecentSalesOpen}
        onClose={() => setIsRecentSalesOpen(false)}
      />
    </div>
  )
}
