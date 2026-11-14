import React, { useState } from 'react'
import {
  Calendar,
  RotateCw,
  ArrowRight,
  Filter,
} from 'lucide-react'
import type { AnalyticsPeriod } from '../../api/types'

interface DateFiltersBarProps {
  selectedPeriod: AnalyticsPeriod
  onSelectPeriod: (period: AnalyticsPeriod) => void
  customStartDate: string
  customEndDate: string
  onApplyCustomRange: (start: string, end: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
}

const PERIOD_OPTIONS: Array<{ key: AnalyticsPeriod; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'last30days', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
]

export const DateFiltersBar: React.FC<DateFiltersBarProps> = ({
  selectedPeriod,
  onSelectPeriod,
  customStartDate,
  customEndDate,
  onApplyCustomRange,
  onRefresh,
  isRefreshing = false,
}) => {
  const [localStart, setLocalStart] = useState<string>(customStartDate)
  const [localEnd, setLocalEnd] = useState<string>(customEndDate)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!localStart || !localEnd) {
      setValidationError('Please select both start and end dates.')
      return
    }
    if (localStart > localEnd) {
      setValidationError('Start date cannot be after end date.')
      return
    }
    setValidationError(null)
    onApplyCustomRange(localStart, localEnd)
  }

  return (
    <div className="digexa-analytics-filter-bar">
      <div className="digexa-analytics-filter-bar__left">
        <div className="digexa-filter-icon-pill">
          <Calendar size={16} />
          <span>Timeline:</span>
        </div>

        {/* Period Preset Pills */}
        <div className="digexa-filter-pills" role="radiogroup" aria-label="Date presets">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selectedPeriod === option.key}
              className={`digexa-filter-pill ${
                selectedPeriod === option.key ? 'digexa-filter-pill--active' : ''
              }`}
              onClick={() => onSelectPeriod(option.key)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="digexa-analytics-filter-bar__right">
        {/* Refresh Live Analytics Button */}
        <button
          type="button"
          className="digexa-refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh analytics data"
        >
          <RotateCw size={15} className={isRefreshing ? 'digexa-spinning' : ''} />
          <span className="digexa-refresh-btn__text">Refresh</span>
        </button>
      </div>

      {/* Custom Date Range Picker (shown when 'custom' is active) */}
      {selectedPeriod === 'custom' && (
        <form onSubmit={handleApply} className="digexa-custom-range-panel">
          <div className="digexa-custom-range-inputs">
            <div className="digexa-date-field">
              <label htmlFor="custom-start-date">From Date:</label>
              <input
                id="custom-start-date"
                type="date"
                value={localStart}
                onChange={(e) => {
                  setLocalStart(e.target.value)
                  setValidationError(null)
                }}
                required
              />
            </div>

            <ArrowRight size={16} className="digexa-range-arrow" />

            <div className="digexa-date-field">
              <label htmlFor="custom-end-date">To Date:</label>
              <input
                id="custom-end-date"
                type="date"
                value={localEnd}
                onChange={(e) => {
                  setLocalEnd(e.target.value)
                  setValidationError(null)
                }}
                required
              />
            </div>

            <button type="submit" className="digexa-btn digexa-btn--primary digexa-btn--sm">
              <Filter size={14} />
              <span>Apply Range</span>
            </button>
          </div>

          {validationError && (
            <p className="digexa-custom-range-error" role="alert">
              {validationError}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
