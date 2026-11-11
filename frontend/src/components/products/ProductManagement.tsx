import React, { useState, useEffect, useCallback } from 'react'
import { ProductStats } from './ProductStats'
import { ProductTable } from './ProductTable'
import { ProductModal } from './ProductModal'
import { ProductDeleteDialog } from './ProductDeleteDialog'
import { ToastContainer, type ToastMessage } from '../common/Toast'
import { productApi } from '../../api/client'
import type { ProductRequest, ProductResponse } from '../../api/types'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ProductManagementProps {
  onRegisterProductModalTrigger?: (trigger: () => void) => void
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  onRegisterProductModalTrigger,
}) => {
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toast notifications
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

  // Load products from backend (scoped strictly to authenticated shop)
  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const data = await productApi.getAll()
      setProducts(data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load products from server.'
      setFetchError(msg)
      addToast('error', 'Unable to fetch products', msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Handlers for Add/Edit
  const handleOpenAdd = useCallback(() => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }, [])

  // Register external trigger if provided (e.g. from top nav)
  useEffect(() => {
    if (onRegisterProductModalTrigger) {
      onRegisterProductModalTrigger(handleOpenAdd)
    }
  }, [onRegisterProductModalTrigger, handleOpenAdd])

  const handleOpenEdit = (product: ProductResponse) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleSaveProduct = async (data: ProductRequest) => {
    if (editingProduct) {
      // Update
      const updated = await productApi.update(editingProduct.id, data)
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? updated : p))
      )
      addToast('success', 'Product Updated', `"${updated.name}" has been updated.`)
    } else {
      // Create
      const created = await productApi.create(data)
      setProducts((prev) => [created, ...prev])
      addToast('success', 'Product Created', `"${created.name}" is now ready for POS lookups.`)
    }
  }

  // Handlers for Delete
  const handleOpenDelete = (product: ProductResponse) => {
    setDeletingProduct(product)
  }

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return
    setIsDeleting(true)
    try {
      await productApi.delete(deletingProduct.id)
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id))
      addToast(
        'info',
        'Product Deleted',
        `"${deletingProduct.name}" was removed from the catalog.`
      )
      setDeletingProduct(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete product.'
      addToast('error', 'Deletion Failed', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Categories list for datalist auto-complete
  const existingCategories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))
  )

  return (
    <div className="digexa-products-container">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header Introduction */}
      <div className="digexa-page-intro">
        <div>
          <h2 className="digexa-page-intro__title">Inventory & Catalog</h2>
          <p className="digexa-page-intro__desc">
            Manage your retail store catalog, adjust register stock levels, and organize products.
          </p>
        </div>
        <button
          type="button"
          className="digexa-btn digexa-btn--outline digexa-btn--sm"
          onClick={loadProducts}
          disabled={isLoading}
          title="Refresh products from server"
        >
          <RefreshCw size={14} className={isLoading ? 'digexa-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="digexa-banner digexa-banner--error" role="alert">
          <AlertCircle size={18} />
          <div className="digexa-banner__content">
            <strong>Server Communication Issue</strong>: {fetchError}
          </div>
          <button
            type="button"
            className="digexa-banner__btn"
            onClick={loadProducts}
          >
            Retry
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <ProductStats products={products} isLoading={isLoading} />

      {/* Product Catalog Data Table & Filters */}
      <ProductTable
        products={products}
        isLoading={isLoading}
        onAddClick={handleOpenAdd}
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        onRefresh={loadProducts}
      />

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        initialProduct={editingProduct}
        existingCategories={existingCategories}
      />

      {/* Delete Confirmation Dialog */}
      <ProductDeleteDialog
        isOpen={Boolean(deletingProduct)}
        product={deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}

