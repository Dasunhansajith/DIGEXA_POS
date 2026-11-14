import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import type {
  PageResponse,
  SaleResponse,
  SalesFilterParams,
  SalesPeriod,
  SalesSummaryResponse,
} from '../../api/types'
import { saleApi, ApiError } from '../../api/client'
import { SalesKpiCards } from './SalesKpiCards'
import { SalesFiltersBar } from './SalesFiltersBar'
import { SalesTable } from './SalesTable'
import { SaleDetailsModal } from './SaleDetailsModal'
import { ReceiptModal } from '../pos/ReceiptModal'
import { ToastContainer, type ToastMessage } from '../common/Toast'

interface SalesManagementProps {
  onSignOut?: () => void
}

/**
 * Helper to calculate YYYY-MM-DD in Asia/Colombo timezone.
 */
const getShopDateString = (daysAgo = 0): string => {
  const now = new Date()
  const colombo = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }))
  colombo.setDate(colombo.getDate() - daysAgo)
  const yyyy = colombo.getFullYear()
  const mm = String(colombo.getMonth() + 1).padStart(2, '0')
  const dd = String(colombo.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const SalesManagement: React.FC<SalesManagementProps> = ({ onSignOut }) => {
  // Filter States: Default is 'today'
  const [period, setPeriod] = useState<SalesPeriod>('today')
  const [customStart, setCustomStart] = useState<string>(() => getShopDateString(0))
  const [customEnd, setCustomEnd] = useState<string>(() => getShopDateString(0))
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | ''>('')
  const [status, setStatus] = useState<string>('COMPLETED')
  const [sortKey, setSortKey] = useState<string>('createdAt:desc')

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(20)

  // Data States
  const [summary, setSummary] = useState<SalesSummaryResponse | null>(null)
  const [salesPage, setSalesPage] = useState<PageResponse<SaleResponse> | null>(null)

  // Loading & Error States
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true)
  const [isSalesLoading, setIsSalesLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [pageError, setPageError] = useState<string | null>(null)

  // Modals
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleResponse | null>(null)
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<SaleResponse | null>(null)

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

  // Derive date boundaries from active period
  const resolveDateParams = useCallback(() => {
    if (period === 'today') {
      const today = getShopDateString(0)
      return { startDate: today, endDate: today }
    }
    if (period === 'yesterday') {
      const yest = getShopDateString(1)
      return { startDate: yest, endDate: yest }
    }
    if (period === 'last7days') {
      return { startDate: getShopDateString(6), endDate: getShopDateString(0) }
    }
    if (period === 'last30days') {
      return { startDate: getShopDateString(29), endDate: getShopDateString(0) }
    }
    // custom
    return { startDate: customStart, endDate: customEnd }
  }, [period, customStart, customEnd])

  // Build filter parameters for backend
  const buildCurrentFilterParams = useCallback((): SalesFilterParams => {
    const { startDate, endDate } = resolveDateParams()
    const [sortByField, sortDirField] = sortKey.split(':') as [
      'createdAt' | 'totalAmount',
      'asc' | 'desc'
    ]

    return {
      startDate,
      endDate,
      query: searchQuery.trim() || undefined,
      paymentMethod: paymentMethod || undefined,
      status: status || undefined,
      sortBy: sortByField,
      sortDir: sortDirField,
      page: currentPage,
      size: pageSize,
    }
  }, [resolveDateParams, searchQuery, paymentMethod, status, sortKey, currentPage, pageSize])

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true)
    const params = buildCurrentFilterParams()
    try {
      const data = await saleApi.getSummary(params)
      setSummary(data)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401 && onSignOut) {
        onSignOut()
        return
      }
      throw err
    } finally {
      setIsSummaryLoading(false)
    }
  }, [buildCurrentFilterParams, onSignOut])

  // Fetch Paginated Sales
  const fetchSales = useCallback(async () => {
    setIsSalesLoading(true)
    const params = buildCurrentFilterParams()
    try {
      const data = await saleApi.getPaged(params)
      setSalesPage(data)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401 && onSignOut) {
        onSignOut()
        return
      }
      throw err
    } finally {
      setIsSalesLoading(false)
    }
  }, [buildCurrentFilterParams, onSignOut])

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setPageError(null)
    try {
      await Promise.all([fetchSummary(), fetchSales()])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to sales services.'
      setPageError(msg)
    }
  }, [fetchSummary, fetchSales])

  // Debounced search & filter trigger
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      fetchAllData()
      return
    }

    const timer = setTimeout(() => {
      fetchAllData()
    }, 250)

    return () => clearTimeout(timer)
  }, [period, customStart, customEnd, searchQuery, paymentMethod, status, sortKey, currentPage, pageSize, fetchAllData])

  // Reset page to 0 when filters change
  const handlePeriodChange = (p: SalesPeriod) => {
    setPeriod(p)
    setCurrentPage(0)
  }

  const handleApplyCustomDates = (start: string, end: string) => {
    setCustomStart(start)
    setCustomEnd(end)
    setCurrentPage(0)
  }

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)
    setCurrentPage(0)
  }

  const handlePaymentMethodChange = (pm: 'CASH' | 'CARD' | '') => {
    setPaymentMethod(pm)
    setCurrentPage(0)
  }

  const handleStatusChange = (st: string) => {
    setStatus(st)
    setCurrentPage(0)
  }

  const handleSortChange = (sk: string) => {
    setSortKey(sk)
    setCurrentPage(0)
  }

  // Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchSummary(), fetchSales()])
      addToast('info', 'Sales Refreshed', 'Transaction history and summary updated.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Refresh failed.'
      addToast('error', 'Sync Error', msg)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="digexa-sales-page">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* 1. Header Banner */}
      <header className="digexa-sales-header">
        <div className="digexa-sales-header__left">
          <div className="digexa-sales-header__pill">
            <TrendingUp size={14} />
            <span>Audit & Transactions &bull; DIGEXA POS</span>
          </div>
          <h1 className="digexa-sales-header__title">Sales Management</h1>
          <p className="digexa-sales-header__subtitle">
            Track transactions, review receipts, and monitor sales performance.
          </p>
        </div>

        <div className="digexa-sales-header__actions">
          <button
            type="button"
            className="digexa-sales-btn digexa-sales-btn--secondary"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isSalesLoading}
            title="Refresh sales history from server"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Error Card */}
      {pageError && (
        <div
          className="digexa-sales-table-card"
          style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}
        >
          <div style={{ color: '#dc2626', marginBottom: '0.75rem' }}>
            <AlertTriangle size={36} style={{ margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
            Failed to Load Sales Data
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
            {pageError}
          </p>
          <button
            type="button"
            className="digexa-sales-btn digexa-sales-btn--primary"
            onClick={fetchAllData}
          >
            <RotateCcw size={15} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 2. KPI Cards */}
      <SalesKpiCards summary={summary} isLoading={isSummaryLoading} />

      {/* 3. Filters & Search Bar */}
      <SalesFiltersBar
        selectedPeriod={period}
        onSelectPeriod={handlePeriodChange}
        customStartDate={customStart}
        customEndDate={customEnd}
        onApplyCustomRange={handleApplyCustomDates}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={handlePaymentMethodChange}
        status={status}
        onStatusChange={handleStatusChange}
        sortKey={sortKey}
        onSortChange={handleSortChange}
      />

      {/* 4. Sales Table */}
      <SalesTable
        salesPage={salesPage}
        isLoading={isSalesLoading}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize)
          setCurrentPage(0)
        }}
        onViewDetails={(sale) => setSelectedSaleForDetails(sale)}
        onPrintReceipt={(sale) => setSelectedSaleForPrint(sale)}
      />

      {/* 5. Sale Details Modal */}
      <SaleDetailsModal
        isOpen={Boolean(selectedSaleForDetails)}
        saleId={selectedSaleForDetails?.id || null}
        initialSale={selectedSaleForDetails}
        onClose={() => setSelectedSaleForDetails(null)}
        onPrintReceipt={(sale) => {
          setSelectedSaleForDetails(null)
          setSelectedSaleForPrint(sale)
        }}
      />

      {/* 6. Receipt Modal (reused from pos component) */}
      <ReceiptModal
        isOpen={Boolean(selectedSaleForPrint)}
        sale={selectedSaleForPrint}
        onClose={() => setSelectedSaleForPrint(null)}
      />
    </div>
  )
}

