import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Plus,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import type { ProductResponse } from '../../api/types'

interface ProductTableProps {
  products: ProductResponse[]
  isLoading: boolean
  onAddClick: () => void
  onEditClick: (product: ProductResponse) => void
  onDeleteClick: (product: ProductResponse) => void
  onRefresh: () => void
}

type SortField = 'id' | 'name' | 'price' | 'stock' | 'category'
type SortOrder = 'asc' | 'desc'
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

const ITEMS_PER_PAGE = 8

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  onAddClick,
  onEditClick,
  onDeleteClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStockStatus, setSelectedStockStatus] = useState<StockFilter>('all')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Extract unique categories from real data
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim())
      }
    })
    return Array.from(set).sort()
  }, [products])

  // Filter & sort
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter (name, description, category, SKU)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchName = p.name.toLowerCase().includes(q)
          const matchDesc = p.description?.toLowerCase().includes(q) ?? false
          const matchCat = p.category?.toLowerCase().includes(q) ?? false
          const matchId = String(p.id).includes(q)
          if (!matchName && !matchDesc && !matchCat && !matchId) {
            return false
          }
        }

        // Category filter
        if (selectedCategory !== 'all') {
          if (!p.category || p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
            return false
          }
        }

        // Stock status filter
        if (selectedStockStatus === 'in_stock') {
          if (p.stock <= 10) return false
        } else if (selectedStockStatus === 'low_stock') {
          if (p.stock <= 0 || p.stock > 10) return false
        } else if (selectedStockStatus === 'out_of_stock') {
          if (p.stock > 0) return false
        }

        return true
      })
      .sort((a, b) => {
        let valA: string | number = a[sortField] ?? ''
        let valB: string | number = b[sortField] ?? ''

        if (sortField === 'price' || sortField === 'stock' || sortField === 'id') {
          valA = Number(valA)
          valB = Number(valB)
        } else {
          valA = String(valA).toLowerCase()
          valB = String(valB).toLowerCase()
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
  }, [products, searchQuery, selectedCategory, selectedStockStatus, sortField, sortOrder])

  // Pagination calculation
  const totalItems = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  // Reset to page 1 on filter changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val)
    setCurrentPage(1)
  }

  const handleStockFilterChange = (val: StockFilter) => {
    setSelectedStockStatus(val)
    setCurrentPage(1)
  }

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const getStockBadge = (stock: number) => {
    if (stock <= 0) {
      return <span className="digexa-badge digexa-badge--danger">Out of Stock</span>
    }
    if (stock <= 10) {
      return (
        <span className="digexa-badge digexa-badge--warning">
          Low Stock ({stock})
        </span>
      )
    }
    return (
      <span className="digexa-badge digexa-badge--success">
        In Stock ({stock})
      </span>
    )
  }

  return (
    <div className="digexa-catalog-card">
      {/* Table Toolbar */}
      <div className="digexa-toolbar">
        {/* Left: Search input */}
        <div className="digexa-search-wrapper">
          <Search size={16} className="digexa-search-icon" />
          <input
            type="text"
            className="digexa-search-input"
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="digexa-search-clear"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right: Filters and Actions */}
        <div className="digexa-toolbar__actions">
          {/* Category Filter */}
          <div className="digexa-filter-group">
            <Filter size={14} className="digexa-filter-icon" />
            <select
              className="digexa-select"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div className="digexa-filter-group">
            <select
              className="digexa-select"
              value={selectedStockStatus}
              onChange={(e) => handleStockFilterChange(e.target.value as StockFilter)}
              aria-label="Filter by stock status"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt;10)</option>
              <option value="low_stock">Low Stock (1-10)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          {/* Add Product Button */}
          <button
            type="button"
            className="digexa-btn digexa-btn--primary"
            onClick={onAddClick}
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Active Filter Pills (if any filter active) */}
      {(searchQuery || selectedCategory !== 'all' || selectedStockStatus !== 'all') && (
        <div className="digexa-filter-pills">
          <span className="digexa-filter-pills__label">Active Filters:</span>
          {searchQuery && (
            <span className="digexa-pill">
              Query: "{searchQuery}"
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                aria-label="Remove search filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="digexa-pill">
              Category: {selectedCategory}
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                aria-label="Remove category filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedStockStatus !== 'all' && (
            <span className="digexa-pill">
              Status:{' '}
              {selectedStockStatus === 'in_stock'
                ? 'In Stock'
                : selectedStockStatus === 'low_stock'
                ? 'Low Stock'
                : 'Out of Stock'}
              <button
                type="button"
                onClick={() => handleStockFilterChange('all')}
                aria-label="Remove stock filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            className="digexa-pill-reset"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setSelectedStockStatus('all')
              setCurrentPage(1)
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Table / Data View */}
      <div className="digexa-table-container">
        {isLoading ? (
          <div className="digexa-table-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="digexa-skeleton-row">
                <div className="digexa-skeleton digexa-skeleton--thumb" />
                <div className="digexa-skeleton digexa-skeleton--text-long" />
                <div className="digexa-skeleton digexa-skeleton--badge" />
                <div className="digexa-skeleton digexa-skeleton--text-short" />
                <div className="digexa-skeleton digexa-skeleton--badge" />
                <div className="digexa-skeleton digexa-skeleton--actions" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="digexa-empty-state">
            <div className="digexa-empty-state__icon">
              <Package size={40} />
            </div>
            <h3 className="digexa-empty-state__title">
              {products.length === 0 ? 'No products in catalog yet' : 'No matching products found'}
            </h3>
            <p className="digexa-empty-state__desc">
              {products.length === 0
                ? 'Get started by creating your first product item. It will be immediately ready for register lookups.'
                : 'Try adjusting your search criteria or clearing active filters to see other products.'}
            </p>
            {products.length === 0 ? (
              <button
                type="button"
                className="digexa-btn digexa-btn--primary"
                onClick={onAddClick}
              >
                <Plus size={16} />
                <span>Create First Product</span>
              </button>
            ) : (
              <button
                type="button"
                className="digexa-btn digexa-btn--outline"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedStockStatus('all')
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table */}
            <table className="digexa-table">
              <thead>
                <tr>
                  <th className="digexa-th--product">
                    <button
                      type="button"
                      className="digexa-th-sort"
                      onClick={() => handleSortToggle('name')}
                    >
                      <span>Product</span>
                      <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="digexa-th-sort"
                      onClick={() => handleSortToggle('category')}
                    >
                      <span>Category</span>
                      <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      type="button"
                      className="digexa-th-sort digexa-th-sort--right"
                      onClick={() => handleSortToggle('price')}
                    >
                      <span>Price</span>
                      <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      type="button"
                      className="digexa-th-sort digexa-th-sort--right"
                      onClick={() => handleSortToggle('stock')}
                    >
                      <span>Inventory</span>
                      <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="digexa-tr">
                    <td className="digexa-td--product">
                      <div className="digexa-product-cell">
                        <div className="digexa-product-thumb">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              loading="lazy"
                              onError={(e) => {
                                // Fallback icon on broken image
                                ;(e.target as HTMLElement).style.display = 'none'
                                const parent = (e.target as HTMLElement).parentElement
                                if (parent) {
                                  parent.innerHTML = `<span class="digexa-thumb-fallback">${(
                                    p.name[0] || 'P'
                                  ).toUpperCase()}</span>`
                                }
                              }}
                            />
                          ) : (
                            <div className="digexa-thumb-fallback">
                              {(p.name[0] || 'P').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="digexa-product-info">
                          <span className="digexa-product-name">{p.name}</span>
                          <span className="digexa-product-sku">SKU #{p.id}</span>
                          {p.description && (
                            <p className="digexa-product-desc-line" title={p.description}>
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="digexa-category-badge">
                        <Layers size={12} />
                        {p.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-slate-900">
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td className="text-right">
                      <div className="digexa-stock-cell">
                        <span className="digexa-stock-units">{p.stock} units</span>
                        <div className="digexa-stock-bar">
                          <div
                            className={`digexa-stock-bar__fill ${
                              p.stock <= 0
                                ? 'digexa-stock-bar__fill--empty'
                                : p.stock <= 10
                                ? 'digexa-stock-bar__fill--low'
                                : 'digexa-stock-bar__fill--healthy'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, (p.stock / 50) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{getStockBadge(p.stock)}</td>
                    <td className="text-right">
                      <div className="digexa-action-buttons">
                        <button
                          type="button"
                          className="digexa-action-btn digexa-action-btn--edit"
                          onClick={() => onEditClick(p)}
                          title="Edit Product"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="digexa-action-btn digexa-action-btn--delete"
                          onClick={() => onDeleteClick(p)}
                          title="Delete Product"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards (Visible only on smaller screens) */}
            <div className="digexa-mobile-card-list">
              {paginatedProducts.map((p) => (
                <div key={p.id} className="digexa-mobile-card">
                  <div className="digexa-mobile-card__header">
                    <div className="digexa-product-thumb">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} loading="lazy" />
                      ) : (
                        <div className="digexa-thumb-fallback">
                          {(p.name[0] || 'P').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="digexa-mobile-card__title-wrap">
                      <h4 className="digexa-mobile-card__title">{p.name}</h4>
                      <span className="digexa-product-sku">SKU #{p.id}</span>
                    </div>
                    <span className="digexa-mobile-card__price">
                      ${Number(p.price).toFixed(2)}
                    </span>
                  </div>

                  {p.description && (
                    <p className="digexa-mobile-card__desc">{p.description}</p>
                  )}

                  <div className="digexa-mobile-card__meta">
                    <span className="digexa-category-badge">
                      <Layers size={12} />
                      {p.category || 'General'}
                    </span>
                    {getStockBadge(p.stock)}
                  </div>

                  <div className="digexa-mobile-card__actions">
                    <button
                      type="button"
                      className="digexa-btn digexa-btn--outline digexa-btn--sm"
                      onClick={() => onEditClick(p)}
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="digexa-btn digexa-btn--danger-ghost digexa-btn--sm"
                      onClick={() => onDeleteClick(p)}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && filteredProducts.length > 0 && (
        <div className="digexa-pagination">
          <div className="digexa-pagination__info">
            Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</strong> of{' '}
            <strong>{totalItems}</strong> {totalItems === 1 ? 'product' : 'products'}
          </div>

          <div className="digexa-pagination__controls">
            <button
              type="button"
              className="digexa-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span className="digexa-page-indicator">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="digexa-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
