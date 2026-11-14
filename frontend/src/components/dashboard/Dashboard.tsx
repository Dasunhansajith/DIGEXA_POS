import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  AlertCircle,
  RotateCcw,
  BarChart3,
  Laptop,
} from 'lucide-react'
import type {
  AuthUser,
  AnalyticsPeriod,
  AnalyticsOverviewResponse,
  DailyRevenueTrend,
  TopProductResponse,
  SaleResponse,
  TestAuthResponse,
} from '../../api/types'
import { analyticsApi, saleApi, ApiError } from '../../api/client'
import { AnalyticsKpiCards } from './AnalyticsKpiCards'
import { DateFiltersBar } from './DateFiltersBar'
import { RevenueTrendChart } from './RevenueTrendChart'
import { TopProductsCard } from './TopProductsCard'
import { RecentSalesTable } from './RecentSalesTable'
import { ReceiptModal } from '../pos/ReceiptModal'

export interface DashboardProps {
  user: AuthUser | null
  testResponse?: TestAuthResponse | null
  onSignOut: () => void
  onNavigateToProducts?: () => void
  onNavigateToTerminal?: () => void
}

/**
 * Helper to get date string formatted YYYY-MM-DD in Asia/Colombo timezone.
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

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onSignOut,
  onNavigateToProducts,
  onNavigateToTerminal,
}) => {
  // Filter States: Default to 'today' whenever the Dashboard opens
  const [period, setPeriod] = useState<AnalyticsPeriod>('today')
  const [customStart, setCustomStart] = useState<string>(() => getShopDateString(0))
  const [customEnd, setCustomEnd] = useState<string>(() => getShopDateString(0))

  // Data States
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null)
  const [trend, setTrend] = useState<DailyRevenueTrend[]>([])
  const [topProducts, setTopProducts] = useState<TopProductResponse[]>([])
  const [recentSales, setRecentSales] = useState<SaleResponse[]>([])

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Receipt Modal State
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<SaleResponse | null>(null)

  // Fetch all analytics and sales data from backend
  const fetchAnalyticsData = useCallback(
    async (showSilentRefresh = false) => {
      if (showSilentRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setErrorMessage(null)

      const filterParams = {
        period,
        startDate: period === 'custom' ? customStart : undefined,
        endDate: period === 'custom' ? customEnd : undefined,
      }

      try {
        // Fetch overview, revenue trend, top products, and recent sales in parallel
        const [overviewRes, trendRes, topRes, salesRes] = await Promise.all([
          analyticsApi.getOverview(filterParams),
          analyticsApi.getRevenueTrend(filterParams),
          analyticsApi.getTopProducts({ ...filterParams, limit: 5 }),
          saleApi.getAll(),
        ])

        setOverview(overviewRes)
        setTrend(trendRes)
        setTopProducts(topRes)
        setRecentSales(salesRes)
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setErrorMessage('Your session has expired. Please sign in again.')
            onSignOut()
          } else {
            setErrorMessage(err.message || 'Failed to load sales analytics data.')
          }
        } else if (err instanceof Error) {
          setErrorMessage(err.message)
        } else {
          setErrorMessage('Unable to connect to analytics service.')
        }
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [period, customStart, customEnd, onSignOut]
  )

  // Trigger fetch whenever filter parameters change
  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  // Handle custom date range submission
  const handleApplyCustomRange = (start: string, end: string) => {
    setCustomStart(start)
    setCustomEnd(end)
    setPeriod('custom')
  }

  const periodLabelMap: Record<AnalyticsPeriod, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7days: 'Last 7 Days',
    last30days: 'Last 30 Days',
    this_month: 'This Month',
    custom: `${customStart} to ${customEnd}`,
  }

  return (
    <div className="digexa-analytics-dashboard">
      {/* Top Banner with Merchant Branding and Quick POS Actions */}
      <section className="digexa-analytics-hero">
        <div className="digexa-analytics-hero__left">
          <div className="digexa-hero-icon-pill">
            <BarChart3 size={20} />
            <span>Real-time Sales Analytics</span>
          </div>
          <h1 className="digexa-analytics-hero__title">
            Performance Overview
          </h1>
          <p className="digexa-analytics-hero__subtitle">
            Live business intelligence, product velocity, and transactional trends for Shop #{user?.shopId ?? 1}
          </p>
        </div>

        <div className="digexa-analytics-hero__actions">
          {onNavigateToTerminal && (
            <button
              type="button"
              className="digexa-btn digexa-btn--primary digexa-hero-btn"
              onClick={onNavigateToTerminal}
              title="Open the Cashier POS Terminal"
            >
              <Laptop size={17} />
              <span>Launch POS Register</span>
            </button>
          )}

          {onNavigateToProducts && (
            <button
              type="button"
              className="digexa-btn digexa-btn--secondary digexa-hero-btn"
              onClick={onNavigateToProducts}
              title="Manage product catalog and inventory"
            >
              <Package size={17} />
              <span>Product Catalog</span>
            </button>
          )}
        </div>
      </section>

      {/* Date Range & Timeline Filter Bar */}
      <DateFiltersBar
        selectedPeriod={period}
        onSelectPeriod={(p) => setPeriod(p)}
        customStartDate={customStart}
        customEndDate={customEnd}
        onApplyCustomRange={handleApplyCustomRange}
        onRefresh={() => fetchAnalyticsData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="digexa-analytics-error" role="alert">
          <AlertCircle size={20} className="digexa-analytics-error__icon" />
          <div className="digexa-analytics-error__content">
            <h4 className="digexa-analytics-error__title">Failed to load analytics</h4>
            <p className="digexa-analytics-error__text">{errorMessage}</p>
          </div>
          <button
            type="button"
            className="digexa-btn digexa-btn--secondary digexa-btn--sm"
            onClick={() => fetchAnalyticsData()}
          >
            <RotateCcw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4 Core Financial KPI Cards */}
      <AnalyticsKpiCards overview={overview} isLoading={isLoading} />

      {/* Main Charts & Top Sellers Grid */}
      <div className="digexa-analytics-grid">
        {/* Left Column: Daily Revenue Trend Area Chart */}
        <div className="digexa-analytics-grid__chart">
          <RevenueTrendChart data={trend} isLoading={isLoading} />
        </div>

        {/* Right Column: Top 5 Best Selling Products */}
        <div className="digexa-analytics-grid__top-products">
          <TopProductsCard
            products={topProducts}
            isLoading={isLoading}
            periodLabel={periodLabelMap[period]}
          />
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="digexa-analytics-recent-section">
        <RecentSalesTable
          sales={recentSales}
          isLoading={isLoading}
          onSelectSale={(sale) => setSelectedSaleForReceipt(sale)}
          onNavigateToTerminal={onNavigateToTerminal}
        />
      </div>

      {/* Receipt Modal for viewing/reprinting from table */}
      <ReceiptModal
        isOpen={Boolean(selectedSaleForReceipt)}
        sale={selectedSaleForReceipt}
        shopName={`Shop #${user?.shopId ?? 1}`}
        onClose={() => setSelectedSaleForReceipt(null)}
      />
    </div>
  )
}
