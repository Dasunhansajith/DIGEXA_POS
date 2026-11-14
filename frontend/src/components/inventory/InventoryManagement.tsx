import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Boxes,
  Plus,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import type {
  InventoryOverviewResponse,
  InventoryProductResponse,
  InventoryAdjustmentResponse,
  InventoryStatus,
} from '../../api/types'
import { inventoryApi, ApiError } from '../../api/client'
import { InventoryKpiCards } from './InventoryKpiCards'
import { InventoryTable } from './InventoryTable'
import { StockAdjustmentModal } from './StockAdjustmentModal'
import { ThresholdModal } from './ThresholdModal'
import { StockHistoryTable } from './StockHistoryTable'
import { ToastContainer, type ToastMessage } from '../common/Toast'

interface InventoryManagementProps {
  onSignOut?: () => void
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ onSignOut }) => {
  // Overview data
  const [overview, setOverview] = useState<InventoryOverviewResponse | null>(null)
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)

  // Products data & filters
  const [products, setProducts] = useState<InventoryProductResponse[]>([])
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Adjustments history
  const [adjustments, setAdjustments] = useState<InventoryAdjustmentResponse[]>([])
  const [isAdjustmentsLoading, setIsAdjustmentsLoading] = useState(true)
  const [historyProductFilter, setHistoryProductFilter] = useState<number | undefined>(undefined)
  const [historyPage, setHistoryPage] = useState(0)
  const historyPageSize = 20

  // Modals state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<InventoryProductResponse | null>(null)

  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false)
  const [thresholdTargetProduct, setThresholdTargetProduct] = useState<InventoryProductResponse | null>(null)

  // Overall page state & error
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      title,
      message,
    }
    setToasts((prev) => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Fetch Overview metrics
  const loadOverview = useCallback(async () => {
    setIsOverviewLoading(true)
    try {
      const data = await inventoryApi.getOverview()
      setOverview(data)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401 && onSignOut) {
        onSignOut()
        return
      }
      throw err
    } finally {
      setIsOverviewLoading(false)
    }
  }, [onSignOut])

  // Fetch Products based on current filters
  const loadProducts = useCallback(async () => {
    setIsProductsLoading(true)
    try {
      const data = await inventoryApi.getProducts({
        status: statusFilter || undefined,
        query: searchQuery.trim() || undefined,
        category: categoryFilter || undefined,
      })
      setProducts(data || [])
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401 && onSignOut) {
        onSignOut()
        return
      }
      throw err
    } finally {
      setIsProductsLoading(false)
    }
  }, [statusFilter, searchQuery, categoryFilter, onSignOut])

  // Fetch Adjustment History
  const loadAdjustments = useCallback(async () => {
    setIsAdjustmentsLoading(true)
    try {
      const data = await inventoryApi.getAdjustments({
        productId: historyProductFilter,
        page: historyPage,
        size: historyPageSize,
      })
      setAdjustments(data || [])
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401 && onSignOut) {
        onSignOut()
        return
      }
      throw err
    } finally {
      setIsAdjustmentsLoading(false)
    }
  }, [historyProductFilter, historyPage, onSignOut])

  // Initial load
  const loadAllData = useCallback(async () => {
    setPageError(null)
    try {
      await Promise.all([loadOverview(), loadProducts(), loadAdjustments()])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to inventory services.'
      setPageError(msg)
    }
  }, [loadOverview, loadProducts, loadAdjustments])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Reload products when filters change (with slight debounce on search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to search products.'
        addToast('error', 'Product Filter Failed', msg)
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter, categoryFilter, loadProducts])

  // Reload adjustments when history filters change
  useEffect(() => {
    loadAdjustments().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to load adjustments.'
      addToast('error', 'History Load Failed', msg)
    })
  }, [historyProductFilter, historyPage, loadAdjustments])

  // Refresh action
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([loadOverview(), loadProducts(), loadAdjustments()])
      addToast('info', 'Inventory Synced', 'Stock counts and movements refreshed.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Refresh failed.'
      addToast('error', 'Sync Error', msg)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Derive distinct categories from currently loaded or cached products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        cats.add(p.category.trim())
      }
    })
    return Array.from(cats).sort()
  }, [products])

  // Modal Handlers
  const handleOpenAdjustModal = (product?: InventoryProductResponse) => {
    setAdjustTargetProduct(product || null)
    setIsAdjustModalOpen(true)
  }

  const handleOpenThresholdModal = (product: InventoryProductResponse) => {
    setThresholdTargetProduct(product)
    setIsThresholdModalOpen(true)
  }

  const handleAdjustSuccess = (_updated: InventoryProductResponse, message: string) => {
    addToast('success', 'Stock Adjusted', message)
    // Refresh all views to maintain strict consistency
    loadOverview()
    loadProducts()
    loadAdjustments()
  }

  const handleThresholdSuccess = (_updated: InventoryProductResponse, message: string) => {
    addToast('success', 'Threshold Updated', message)
    loadOverview()
    loadProducts()
  }

  // Attention banner calculations
  const attentionCount = (overview?.lowStockProducts || 0) + (overview?.outOfStockProducts || 0)

  return (
    <div className="digexa-inventory-page">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* 1. Header Banner */}
      <header className="digexa-inventory-header">
        <div className="digexa-inventory-header__left">
          <div className="digexa-inventory-header__pill">
            <Boxes size={14} />
            <span>Stock Control &bull; DIGEXA POS</span>
          </div>
          <h1 className="digexa-inventory-header__title">Inventory Management</h1>
          <p className="digexa-inventory-header__subtitle">
            Monitor stock levels, identify low-stock products, and manage inventory movements.
          </p>
        </div>

        <div className="digexa-inventory-header__actions">
          <button
            type="button"
            className="digexa-inventory-btn digexa-inventory-btn--secondary"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isOverviewLoading}
            title="Refresh inventory and history from database"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="digexa-inventory-btn digexa-inventory-btn--primary"
            onClick={() => handleOpenAdjustModal()}
          >
            <Plus size={16} />
            <span>+ Adjust Stock</span>
          </button>
        </div>
      </header>

      {/* 2. Low-Stock Attention Alert Banner */}
      {attentionCount > 0 && (
        <div className="digexa-inventory-alert">
          <div className="digexa-inventory-alert__content">
            <AlertTriangle size={18} />
            <span>
              <strong>{attentionCount} products need attention</strong> (
              {overview?.lowStockProducts || 0} low stock, {overview?.outOfStockProducts || 0} out of stock).
            </span>
          </div>
          <button
            type="button"
            className="digexa-inventory-alert__action"
            onClick={() => setStatusFilter('LOW_STOCK')}
          >
            View Low Stock Products &rarr;
          </button>
        </div>
      )}

      {/* API Error State */}
      {pageError && (
        <div
          className="digexa-inventory-card"
          style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}
        >
          <div style={{ color: '#dc2626', marginBottom: '0.75rem' }}>
            <AlertTriangle size={36} style={{ margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
            Failed to Load Inventory Data
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
            {pageError}
          </p>
          <button
            type="button"
            className="digexa-inventory-btn digexa-inventory-btn--primary"
            onClick={loadAllData}
          >
            <RotateCcw size={15} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 3. KPI Cards */}
      <InventoryKpiCards
        overview={overview}
        isLoading={isOverviewLoading}
        onFilterByStatus={(status) => setStatusFilter(status)}
        currentStatusFilter={statusFilter}
      />

      {/* 4. Products Table */}
      <InventoryTable
        products={products}
        isLoading={isProductsLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        availableCategories={availableCategories}
        counts={{
          total: overview?.totalProducts || 0,
          inStock: overview?.inStockProducts || 0,
          lowStock: overview?.lowStockProducts || 0,
          outOfStock: overview?.outOfStockProducts || 0,
        }}
        onOpenAdjustStock={(p) => handleOpenAdjustModal(p)}
        onOpenChangeThreshold={(p) => handleOpenThresholdModal(p)}
      />

      {/* 5. Stock Movement Audit History */}
      <StockHistoryTable
        adjustments={adjustments}
        isLoading={isAdjustmentsLoading}
        products={products}
        selectedProductId={historyProductFilter}
        onProductFilterChange={setHistoryProductFilter}
        currentPage={historyPage}
        pageSize={historyPageSize}
        onPageChange={setHistoryPage}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        product={adjustTargetProduct}
        availableProducts={products}
        onSuccess={handleAdjustSuccess}
      />

      {/* Low Stock Threshold Modal */}
      <ThresholdModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        product={thresholdTargetProduct}
        onSuccess={handleThresholdSuccess}
      />
    </div>
  )
}
