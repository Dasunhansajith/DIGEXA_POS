import React from 'react'
import {
  Search,
  X,
  Sliders,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Package,
} from 'lucide-react'
import type { InventoryProductResponse, InventoryStatus } from '../../api/types'

interface InventoryTableProps {
  products: InventoryProductResponse[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: InventoryStatus | ''
  onStatusFilterChange: (status: InventoryStatus | '') => void
  categoryFilter: string
  onCategoryFilterChange: (category: string) => void
  availableCategories: string[]
  counts: {
    total: number
    inStock: number
    lowStock: number
    outOfStock: number
  }
  onOpenAdjustStock: (product: InventoryProductResponse) => void
  onOpenChangeThreshold: (product: InventoryProductResponse) => void
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  isLoading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  counts,
  onOpenAdjustStock,
  onOpenChangeThreshold,
}) => {
  const tabs: Array<{ id: InventoryStatus | ''; label: string; count: number }> = [
    { id: '', label: 'All Products', count: counts.total },
    { id: 'IN_STOCK', label: 'In Stock', count: counts.inStock },
    { id: 'LOW_STOCK', label: 'Low Stock', count: counts.lowStock },
    { id: 'OUT_OF_STOCK', label: 'Out of Stock', count: counts.outOfStock },
  ]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(price)
  }

  const renderStatusBadge = (status: InventoryStatus) => {
    if (status === 'IN_STOCK') {
      return (
        <span className="digexa-status-pill digexa-status-pill--in">
          <CheckCircle2 size={13} />
          <span>In Stock</span>
        </span>
      )
    }
    if (status === 'LOW_STOCK') {
      return (
        <span className="digexa-status-pill digexa-status-pill--low">
          <AlertTriangle size={13} />
          <span>Low Stock</span>
        </span>
      )
    }
    return (
      <span className="digexa-status-pill digexa-status-pill--out">
        <AlertCircle size={13} />
        <span>Out of Stock</span>
      </span>
    )
  }

  const renderStockBadge = (stock: number, threshold: number, status: InventoryStatus) => {
    let variant = 'digexa-stock-badge--in'
    if (status === 'LOW_STOCK') variant = 'digexa-stock-badge--low'
    if (status === 'OUT_OF_STOCK') variant = 'digexa-stock-badge--out'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <span className={`digexa-stock-badge ${variant}`}>
          {stock.toLocaleString()} units
        </span>
        {status === 'LOW_STOCK' && (
          <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
            &le; {threshold} threshold
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="digexa-inventory-card">
      {/* Toolbar */}
      <div className="digexa-inventory-toolbar">
        {/* Status Filter Tabs */}
        <div className="digexa-inventory-tabs" role="tablist" aria-label="Inventory status filters">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.id
            return (
              <button
                key={tab.id || 'all'}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`digexa-inventory-tab ${isActive ? 'digexa-inventory-tab--active' : ''}`}
                onClick={() => onStatusFilterChange(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="digexa-inventory-tab__count">{tab.count}</span>
              </button>
            )
          })}
        </div>

        {/* Search & Category Filter Row */}
        <div className="digexa-inventory-controls-row">
          <div className="digexa-inventory-search-wrap">
            <Search size={16} className="digexa-inventory-search-icon" />
            <input
              type="text"
              className="digexa-inventory-search-input"
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search products"
            />
            {searchQuery && (
              <button
                type="button"
                className="digexa-inventory-search-clear"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="digexa-inventory-select-wrap">
            <label htmlFor="category-select" style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              Category:
            </label>
            <select
              id="category-select"
              className="digexa-inventory-select"
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="digexa-inventory-table-wrapper">
        <table className="digexa-inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Selling Price</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton rows
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="digexa-skeleton-box" style={{ width: '160px', height: '16px' }} />
                      <div className="digexa-skeleton-box" style={{ width: '60px', height: '12px' }} />
                    </div>
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '90px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '80px', height: '24px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '60px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '80px', height: '20px' }} />
                  </td>
                  <td>
                    <div className="digexa-skeleton-box" style={{ width: '90px', height: '16px' }} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div
                      className="digexa-skeleton-box"
                      style={{ width: '120px', height: '28px', marginLeft: 'auto' }}
                    />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="digexa-empty-state">
                    <div className="digexa-empty-state__icon-wrap">
                      <Package size={28} />
                    </div>
                    <h3 className="digexa-empty-state__title">
                      {searchQuery || statusFilter || categoryFilter
                        ? 'No matching products found'
                        : 'No inventory items found'}
                    </h3>
                    <p className="digexa-empty-state__desc">
                      {searchQuery || statusFilter || categoryFilter
                        ? 'Try clearing or modifying your search and status filters.'
                        : 'Your product catalog is empty. Add products from the Products tab to begin tracking stock.'}
                    </p>
                    {(searchQuery || statusFilter || categoryFilter) && (
                      <button
                        type="button"
                        className="digexa-inventory-btn digexa-inventory-btn--secondary"
                        onClick={() => {
                          onSearchChange('')
                          onStatusFilterChange('')
                          onCategoryFilterChange('')
                        }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.productId}>
                  <td>
                    <div className="digexa-product-cell">
                      <span className="digexa-product-cell__name">{product.productName}</span>
                      <span className="digexa-product-cell__id">ID #{product.productId}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '6px',
                        fontSize: '0.785rem',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      {product.category || 'General'}
                    </span>
                  </td>
                  <td>
                    {renderStockBadge(
                      product.stockQuantity,
                      product.lowStockThreshold,
                      product.inventoryStatus
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                      {product.lowStockThreshold} units
                    </span>
                  </td>
                  <td>{renderStatusBadge(product.inventoryStatus)}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {formatPrice(product.sellingPrice)}
                    </span>
                  </td>
                  <td>
                    <div className="digexa-row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="digexa-action-btn digexa-action-btn--primary"
                        onClick={() => onOpenAdjustStock(product)}
                        title="Adjust product stock quantity"
                      >
                        <Sliders size={13} />
                        <span>Adjust</span>
                      </button>
                      <button
                        type="button"
                        className="digexa-action-btn"
                        onClick={() => onOpenChangeThreshold(product)}
                        title="Configure low-stock alert threshold"
                      >
                        <SlidersHorizontal size={13} />
                        <span>Threshold</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

