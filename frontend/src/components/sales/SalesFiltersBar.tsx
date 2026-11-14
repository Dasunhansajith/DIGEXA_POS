import React, { useState } from 'react'
import { Calendar, Search, X, ArrowRight, ArrowUpDown } from 'lucide-react'
import type { SalesPeriod } from '../../api/types'

interface SalesFiltersBarProps {
  selectedPeriod: SalesPeriod
  onSelectPeriod: (period: SalesPeriod) => void
  customStartDate: string
  customEndDate: string
  onApplyCustomRange: (start: string, end: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  paymentMethod: 'CASH' | 'CARD' | ''
  onPaymentMethodChange: (pm: 'CASH' | 'CARD' | '') => void
  status: string
  onStatusChange: (status: string) => void
  sortKey: string
  onSortChange: (sortKey: string) => void
}

const PRESET_OPTIONS: Array<{ key: SalesPeriod; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'last30days', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom Range' },
]

export const SalesFiltersBar: React.FC<SalesFiltersBarProps> = ({
  selectedPeriod,
  onSelectPeriod,
  customStartDate,
  customEndDate,
  onApplyCustomRange,
  searchQuery,
  onSearchChange,
  paymentMethod,
  onPaymentMethodChange,
  status,
  onStatusChange,
  sortKey,
  onSortChange,
}) => {
  const [localStart, setLocalStart] = useState<string>(customStartDate)
  const [localEnd, setLocalEnd] = useState<string>(customEndDate)
  const [dateError, setDateError] = useState<string | null>(null)

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault()
    if (!localStart || !localEnd) {
      setDateError('Please provide both dates.')
      return
    }
    if (localStart > localEnd) {
      setDateError('Start date cannot be after end date.')
      return
    }
    setDateError(null)
    onApplyCustomRange(localStart, localEnd)
  }

  return (
    <div className="digexa-sales-filters-card">
      {/* 1. Date Presets & Custom Form Row */}
      <div className="digexa-sales-presets-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#047857', fontWeight: 700, fontSize: '0.8125rem' }}>
            <Calendar size={16} />
            <span>Timeline:</span>
          </div>

          <div className="digexa-sales-preset-pills" role="radiogroup" aria-label="Sales timeline presets">
            {PRESET_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selectedPeriod === option.key}
                className={`digexa-sales-preset-btn ${
                  selectedPeriod === option.key ? 'digexa-sales-preset-btn--active' : ''
                }`}
                onClick={() => onSelectPeriod(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Form (shown when custom is selected) */}
        {selectedPeriod === 'custom' && (
          <form onSubmit={handleApplyCustomDates} className="digexa-sales-custom-date-form">
            <input
              type="date"
              className="digexa-sales-date-input"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              aria-label="Start date"
            />
            <span>to</span>
            <input
              type="date"
              className="digexa-sales-date-input"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              aria-label="End date"
            />
            <button
              type="submit"
              className="digexa-sales-btn digexa-sales-btn--primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }}
            >
              <ArrowRight size={14} />
              <span>Apply</span>
            </button>
            {dateError && (
              <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                {dateError}
              </span>
            )}
          </form>
        )}
      </div>

      {/* 2. Search & Dropdown Filters Row */}
      <div className="digexa-sales-controls-row">
        {/* Search */}
        <div className="digexa-sales-search-wrap">
          <Search size={16} className="digexa-sales-search-icon" />
          <input
            type="text"
            className="digexa-sales-search-input"
            placeholder="Search receipt #, customer name, phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search sales"
          />
          {searchQuery && (
            <button
              type="button"
              className="digexa-sales-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filters Group (Payment Method, Status, Sort) */}
        <div className="digexa-sales-dropdowns-wrap">
          {/* Payment Method */}
          <div className="digexa-sales-select-group">
            <label htmlFor="sales-pay-filter" className="digexa-sales-select-label">
              Payment:
            </label>
            <select
              id="sales-pay-filter"
              className="digexa-sales-select"
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value as 'CASH' | 'CARD' | '')}
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash Only</option>
              <option value="CARD">Card Only</option>
            </select>
          </div>

          {/* Status */}
          <div className="digexa-sales-select-group">
            <label htmlFor="sales-status-filter" className="digexa-sales-select-label">
              Status:
            </label>
            <select
              id="sales-status-filter"
              className="digexa-sales-select"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="digexa-sales-select-group">
            <ArrowUpDown size={14} style={{ color: '#64748b' }} />
            <label htmlFor="sales-sort-select" className="digexa-sales-select-label">
              Sort:
            </label>
            <select
              id="sales-sort-select"
              className="digexa-sales-select"
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="totalAmount:desc">Highest Amount</option>
              <option value="totalAmount:asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

