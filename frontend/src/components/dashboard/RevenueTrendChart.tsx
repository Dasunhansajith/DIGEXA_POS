import React, { useState, useMemo, useRef } from 'react'
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Calendar,
  Sparkles,
} from 'lucide-react'
import type { DailyRevenueTrend } from '../../api/types'
import { formatLKR } from '../pos/types'

interface RevenueTrendChartProps {
  data: DailyRevenueTrend[]
  isLoading?: boolean
}

type ChartMetric = 'revenue' | 'transactions' | 'items'

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  data,
  isLoading = false,
}) => {
  const [metric, setMetric] = useState<ChartMetric>('revenue')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Chart Dimensions
  const width = 800
  const height = 300
  const padding = { top: 25, right: 25, bottom: 45, left: 70 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Extract values based on selected metric
  const values = useMemo(() => {
    return data.map((d) => {
      if (metric === 'revenue') return d.revenue
      if (metric === 'transactions') return d.transactionCount
      return d.itemsSold
    })
  }, [data, metric])

  // Compute maximum value for scaling
  const maxValue = useMemo(() => {
    const rawMax = Math.max(...values, 0)
    if (rawMax === 0) return metric === 'revenue' ? 1000 : 10
    // Give 15% headroom for top margin
    return Math.ceil(rawMax * 1.15)
  }, [values, metric])

  // Peak day statistics
  const peakDay = useMemo(() => {
    if (data.length === 0) return null
    let maxIdx = 0
    let maxVal = -1
    values.forEach((v, idx) => {
      if (v > maxVal) {
        maxVal = v
        maxIdx = idx
      }
    })
    if (maxVal <= 0) return null
    return {
      date: data[maxIdx].date,
      value: maxVal,
    }
  }, [data, values])

  // Total for current range
  const totalMetricValue = useMemo(() => {
    return values.reduce((acc, curr) => acc + curr, 0)
  }, [values])

  // Generate SVG Points
  const points = useMemo(() => {
    if (data.length === 0) return []
    const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2

    return data.map((_, i) => {
      const x = padding.left + (data.length > 1 ? i * step : chartWidth / 2)
      const normalizedY = maxValue > 0 ? values[i] / maxValue : 0
      const y = padding.top + chartHeight - normalizedY * chartHeight
      return { x, y, value: values[i], original: data[i] }
    })
  }, [data, values, maxValue, chartWidth, chartHeight, padding.left, padding.top])

  // Construct SVG Path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' }

    if (points.length === 1) {
      const p = points[0]
      const l = `M ${padding.left} ${p.y} L ${padding.left + chartWidth} ${p.y}`
      const a = `M ${padding.left} ${p.y} L ${padding.left + chartWidth} ${p.y} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`
      return { linePath: l, areaPath: a }
    }

    // Build smooth Bezier curve line
    let l = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const cpX = (curr.x + next.x) / 2
      l += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`
    }

    const first = points[0]
    const last = points[points.length - 1]
    const a = `${l} L ${last.x} ${padding.top + chartHeight} L ${first.x} ${padding.top + chartHeight} Z`

    return { linePath: l, areaPath: a }
  }, [points, chartWidth, chartHeight, padding.left, padding.top])

  // Handle pointer hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width

    // Find closest point
    let closestIdx = 0
    let minDistance = Infinity
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX)
      if (dist < minDistance) {
        minDistance = dist
        closestIdx = idx
      }
    })
    setHoveredIndex(closestIdx)
  }

  // Format Y-axis tick values
  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1.0].map((fraction) => {
      const val = Math.round(maxValue * fraction)
      const y = padding.top + chartHeight - fraction * chartHeight
      let label = val.toString()
      if (metric === 'revenue') {
        if (val >= 1000000) label = `${(val / 1000000).toFixed(1)}M`
        else if (val >= 1000) label = `${Math.round(val / 1000)}k`
        else label = `${val}`
      }
      return { y, label }
    })
  }, [maxValue, chartHeight, padding.top, metric])

  // Format date helper for X-axis
  const formatAxisDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-')
      if (!month || !day) return dateStr
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Pick nicely spaced X ticks
  const xTicks = useMemo(() => {
    if (points.length <= 8) return points
    const step = Math.ceil(points.length / 7)
    return points.filter((_, idx) => idx % step === 0 || idx === points.length - 1)
  }, [points])

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null

  return (
    <div className="digexa-trend-chart-card">
      {/* Header with Title and Metric Tabs */}
      <div className="digexa-trend-chart-card__header">
        <div className="digexa-trend-chart-card__title-group">
          <div className="digexa-trend-chart-card__icon-badge">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="digexa-trend-chart-card__title">Daily Performance Trend</h3>
            <p className="digexa-trend-chart-card__subtitle">
              Interactive timeline of transactions, volume, and revenue
            </p>
          </div>
        </div>

        {/* Metric Switcher Pills */}
        <div className="digexa-trend-chart-card__controls">
          <div className="digexa-chart-pills" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={metric === 'revenue'}
              className={`digexa-chart-pill ${metric === 'revenue' ? 'digexa-chart-pill--active' : ''}`}
              onClick={() => {
                setMetric('revenue')
                setHoveredIndex(null)
              }}
            >
              <span>Revenue (LKR)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={metric === 'transactions'}
              className={`digexa-chart-pill ${metric === 'transactions' ? 'digexa-chart-pill--active' : ''}`}
              onClick={() => {
                setMetric('transactions')
                setHoveredIndex(null)
              }}
            >
              <ShoppingBag size={13} />
              <span>Sales</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={metric === 'items'}
              className={`digexa-chart-pill ${metric === 'items' ? 'digexa-chart-pill--active' : ''}`}
              onClick={() => {
                setMetric('items')
                setHoveredIndex(null)
              }}
            >
              <Package size={13} />
              <span>Items</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="digexa-trend-chart-summary">
        <div className="digexa-trend-summary-item">
          <span className="digexa-trend-summary-label">Total in Period:</span>
          <span className="digexa-trend-summary-value">
            {metric === 'revenue'
              ? formatLKR(totalMetricValue)
              : totalMetricValue.toLocaleString()}
          </span>
        </div>

        {peakDay && (
          <div className="digexa-trend-summary-item digexa-trend-summary-item--peak">
            <Sparkles size={14} className="text-amber-500" />
            <span className="digexa-trend-summary-label">Peak Activity:</span>
            <span className="digexa-trend-summary-value">
              {formatAxisDate(peakDay.date)} (
              {metric === 'revenue'
                ? formatLKR(peakDay.value)
                : `${peakDay.value} ${metric === 'transactions' ? 'sales' : 'items'}`}
              )
            </span>
          </div>
        )}
      </div>

      {/* Main SVG Chart Viewport */}
      <div className="digexa-chart-viewport-wrapper">
        {isLoading ? (
          <div className="digexa-chart-loading-overlay">
            <div className="digexa-chart-spinner" />
            <span>Updating timeline...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="digexa-chart-empty-state">
            <Calendar size={36} className="text-slate-400" />
            <p className="digexa-chart-empty-text">No data available for the selected date range</p>
          </div>
        ) : (
          <div className="digexa-svg-container">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="digexa-trend-svg"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                {/* Emerald Gradient */}
                <linearGradient id="digexa-emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                </linearGradient>

                {/* Drop shadow filter for active point */}
                <filter id="point-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {yTicks.map((tick, i) => (
                <g key={i} className="digexa-grid-row">
                  <line
                    x1={padding.left}
                    y1={tick.y}
                    x2={width - padding.right}
                    y2={tick.y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? 'none' : '4 4'}
                  />
                  <text
                    x={padding.left - 10}
                    y={tick.y + 4}
                    textAnchor="end"
                    className="digexa-axis-text"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* Area Under Curve */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#digexa-emerald-gradient)"
                  className="digexa-chart-area"
                />
              )}

              {/* Line Curve */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="digexa-chart-line"
                />
              )}

              {/* Data Points (shown if less than 20 points, or for hover) */}
              {points.length <= 15 &&
                points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 6 : 3.5}
                    fill={hoveredIndex === i ? '#ffffff' : '#10b981'}
                    stroke="#059669"
                    strokeWidth={hoveredIndex === i ? 3 : 1.5}
                    className="digexa-point-circle"
                  />
                ))}

              {/* Hover Indicator Guide Line */}
              {activePoint && (
                <g className="digexa-hover-guides">
                  <line
                    x1={activePoint.x}
                    y1={padding.top}
                    x2={activePoint.x}
                    y2={padding.top + chartHeight}
                    stroke="#059669"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="6.5"
                    fill="#ffffff"
                    stroke="#059669"
                    strokeWidth="3.5"
                    filter="url(#point-glow)"
                  />
                </g>
              )}

              {/* X-Axis Dates */}
              {xTicks.map((p, idx) => (
                <g key={idx} transform={`translate(${p.x}, ${padding.top + chartHeight + 20})`}>
                  <text textAnchor="middle" className="digexa-axis-text digexa-axis-text--date">
                    {formatAxisDate(p.original.date)}
                  </text>
                </g>
              ))}
            </svg>

            {/* Interactive Floating Tooltip */}
            {activePoint && (
              <div
                className="digexa-chart-tooltip"
                style={{
                  left: `${(activePoint.x / width) * 100}%`,
                  top: `${(activePoint.y / height) * 100}%`,
                  transform: `translate(${activePoint.x > width * 0.75 ? '-100%' : activePoint.x < width * 0.25 ? '0%' : '-50%'}, -115%)`,
                }}
              >
                <div className="digexa-tooltip-header">
                  <Calendar size={12} />
                  <span>{formatAxisDate(activePoint.original.date)}</span>
                </div>
                <div className="digexa-tooltip-body">
                  <div className="digexa-tooltip-metric">
                    <span className="digexa-tooltip-dot" />
                    <span className="digexa-tooltip-name">Revenue:</span>
                    <strong className="digexa-tooltip-val">
                      {formatLKR(activePoint.original.revenue)}
                    </strong>
                  </div>
                  <div className="digexa-tooltip-meta">
                    <span>
                      Transactions: <strong>{activePoint.original.transactionCount}</strong>
                    </span>
                    <span>
                      Items Sold: <strong>{activePoint.original.itemsSold}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

