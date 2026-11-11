import React, { useMemo } from 'react'
import {
  Search,
  X,
  Package,
  Plus,
  Check,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import type { ProductResponse } from '../../api/types'
import { formatLKR } from './types'

interface POSProductCatalogProps {
  products: ProductResponse[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string
  onSelectCategory: (category: string) => void
  onAddToCart: (product: ProductResponse) => void
  getInCartQuantity: (productId: number) => number
  onRetry: () => void
}

export const POSProductCatalog: React.FC<POSProductCatalogProps> = ({
  products,
  isLoading,
  error,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onAddToCart,
  getInCartQuantity,
  onRetry,
}) => {
  // Extract unique categories and counts from loaded products
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach((p) => {
      const cat = p.category?.trim() || 'General'
      counts[cat] = (counts[cat] || 0) + 1
    })

    const list = Object.keys(counts).sort((a, b) => a.localeCompare(b))
    return [
      { name: 'All', count: products.length },
      ...list.map((name) => ({ name, count: counts[name] })),
    ]
  }, [products])

  // Filter products by selected category and local search if needed
  const filteredProducts = useMemo(() => {
    let list = products

    if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
      list = list.filter(
        (p) => (p.category?.trim() || 'General').toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.id.toString() === q
      )
    }

    return list
  }, [products, selectedCategory, searchQuery])

  return (
    <section className="pos-catalog" aria-label="Product selection catalog">
      {/* Search and Quick Filters Bar */}
      <div className="pos-catalog__search-bar">
        <div className="pos-search-input-wrapper">
          <Search size={18} className="pos-search-icon" />
          <input
            type="text"
            className="pos-search-input"
            placeholder="Scan barcode or search products by name, category, or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search POS products"
          />
          {searchQuery && (
            <button
              type="button"
              className="pos-search-clear-btn"
              onClick={() => onSearchChange('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="pos-catalog__meta-badge">
          <ShoppingBag size={14} />
          <span>{filteredProducts.length} items</span>
        </div>
      </div>

      {/* Category Pills Selector */}
      <div className="pos-category-bar" role="tablist" aria-label="Product categories">
        {categoriesWithCounts.map((cat) => {
          const isSelected =
            (selectedCategory === '' && cat.name === 'All') ||
            selectedCategory.toLowerCase() === cat.name.toLowerCase()

          return (
            <button
              key={cat.name}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`pos-category-pill ${isSelected ? 'pos-category-pill--active' : ''}`}
              onClick={() => onSelectCategory(cat.name === 'All' ? 'All' : cat.name)}
            >
              <span className="pos-category-pill__label">{cat.name}</span>
              <span className="pos-category-pill__count">{cat.count}</span>
            </button>
          )
        })}
      </div>

      {/* Product Grid Area */}
      <div className="pos-catalog__grid-container">
        {isLoading ? (
          <div className="pos-catalog__loading-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="pos-card-skeleton">
                <div className="pos-card-skeleton__image" />
                <div className="pos-card-skeleton__body">
                  <div className="pos-card-skeleton__line pos-card-skeleton__line--title" />
                  <div className="pos-card-skeleton__line pos-card-skeleton__line--price" />
                  <div className="pos-card-skeleton__line pos-card-skeleton__line--btn" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="pos-catalog__error-state">
            <AlertCircle size={40} className="pos-catalog__error-icon" />
            <h3 className="pos-catalog__error-title">Unable to load products</h3>
            <p className="pos-catalog__error-text">{error}</p>
            <button
              type="button"
              className="digexa-btn digexa-btn--primary digexa-btn--sm"
              onClick={onRetry}
            >
              <RefreshCw size={14} />
              <span>Retry Loading</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="pos-catalog__empty-state">
            <Package size={48} className="pos-catalog__empty-icon" />
            <h3 className="pos-catalog__empty-title">No products found</h3>
            <p className="pos-catalog__empty-text">
              {searchQuery || (selectedCategory && selectedCategory !== 'All')
                ? 'Try adjusting your search query or selecting a different category.'
                : 'There are no products registered in this shop yet.'}
            </p>
            {(searchQuery || (selectedCategory && selectedCategory !== 'All')) && (
              <button
                type="button"
                className="digexa-btn digexa-btn--secondary digexa-btn--sm"
                onClick={() => {
                  onSearchChange('')
                  onSelectCategory('All')
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="pos-product-grid">
            {filteredProducts.map((product) => {
              const inCartQty = getInCartQuantity(product.id)
              const isOutOfStock = product.stock <= 0
              const isMaxStockInCart = inCartQty >= product.stock && product.stock > 0
              const isLowStock = product.stock > 0 && product.stock <= 5

              const canAdd = !isOutOfStock && !isMaxStockInCart

              return (
                <article
                  key={product.id}
                  className={`pos-product-card ${
                    isOutOfStock
                      ? 'pos-product-card--out-of-stock'
                      : isMaxStockInCart
                      ? 'pos-product-card--max-in-cart'
                      : ''
                  }`}
                  onClick={() => {
                    if (canAdd) {
                      onAddToCart(product)
                    }
                  }}
                  role="button"
                  tabIndex={canAdd ? 0 : -1}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && canAdd) {
                      e.preventDefault()
                      onAddToCart(product)
                    }
                  }}
                  title={
                    isOutOfStock
                      ? `${product.name} is out of stock`
                      : isMaxStockInCart
                      ? `All available stock (${product.stock}) is already in cart`
                      : `Add ${product.name} to cart`
                  }
                >
                  {/* Thumbnail / Visual Area */}
                  <div className="pos-product-card__thumb">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="pos-product-card__img"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback on broken image link
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="pos-product-card__img-fallback">
                        <Package size={28} className="pos-product-card__fallback-icon" />
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div className="pos-product-card__badges">
                      {isOutOfStock ? (
                        <span className="pos-stock-badge pos-stock-badge--out">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="pos-stock-badge pos-stock-badge--low">
                          Low: {product.stock} left
                        </span>
                      ) : (
                        <span className="pos-stock-badge pos-stock-badge--ok">
                          {product.stock} in stock
                        </span>
                      )}
                    </div>

                    {/* In-Cart Counter Pill */}
                    {inCartQty > 0 && (
                      <div className="pos-product-card__in-cart-tag">
                        <Check size={12} />
                        <span>{inCartQty} in cart</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content & Price */}
                  <div className="pos-product-card__content">
                    <div className="pos-product-card__meta">
                      <span className="pos-product-card__category">
                        {product.category || 'General'}
                      </span>
                    </div>

                    <h4 className="pos-product-card__name" title={product.name}>
                      {product.name}
                    </h4>

                    <div className="pos-product-card__footer">
                      <div className="pos-product-card__price-box">
                        <span className="pos-product-card__price">
                          {formatLKR(product.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`pos-product-card__add-btn ${
                          isOutOfStock || isMaxStockInCart ? 'pos-product-card__add-btn--disabled' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (canAdd) {
                            onAddToCart(product)
                          }
                        }}
                        disabled={!canAdd}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        {isOutOfStock ? (
                          <span>Sold</span>
                        ) : isMaxStockInCart ? (
                          <span>Max</span>
                        ) : (
                          <>
                            <Plus size={16} />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

