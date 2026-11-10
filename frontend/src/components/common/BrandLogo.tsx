import React from 'react'

export interface BrandLogoProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  showBadge?: boolean
  className?: string
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
  showBadge = true,
  className = '',
}) => {
  const isDark = variant === 'dark'

  const sizeConfig = {
    sm: { iconSize: 28, fontSize: '1.15rem', badgePadding: '2px 6px', badgeText: '9px' },
    md: { iconSize: 36, fontSize: '1.45rem', badgePadding: '3px 8px', badgeText: '10px' },
    lg: { iconSize: 44, fontSize: '1.8rem', badgePadding: '4px 10px', badgeText: '11px' },
  }[size]

  return (
    <div
      className={`nexshop-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        userSelect: 'none',
      }}
    >
      {/* Brand Icon SVG */}
      <div
        style={{
          width: sizeConfig.iconSize,
          height: sizeConfig.iconSize,
          borderRadius: '10px',
          background: isDark
            ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDark
            ? '0 4px 14px rgba(37, 99, 235, 0.45)'
            : '0 4px 14px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <svg
          width={sizeConfig.iconSize * 0.65}
          height={sizeConfig.iconSize * 0.65}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Smart Retail POS Register / Shopping Bag geometry */}
          <path
            d="M4 8.5C4 7.39543 4.89543 6.5 6 6.5H18C19.1046 6.5 20 7.39543 20 8.5V18.5C20 19.6046 19.1046 20.5 18 20.5H6C4.89543 20.5 4 19.6046 4 18.5V8.5Z"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Terminal Screen / Register Top */}
          <path
            d="M8.5 6.5V4.5C8.5 3.39543 9.39543 2.5 10.5 2.5H13.5C14.6046 2.5 15.5 3.39543 15.5 4.5V6.5"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Lightning / Fast Checkout Accent */}
          <path
            d="M12.5 10L10.5 13.5H13.5L11.5 17"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Text & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            fontSize: sizeConfig.fontSize,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              color: isDark ? '#ffffff' : '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            NEX
          </span>
          <span
            style={{
              color: isDark ? '#60a5fa' : '#2563eb',
              letterSpacing: '-0.02em',
            }}
          >
            SHOP
          </span>
        </span>

        {showBadge && (
          <span
            style={{
              fontSize: sizeConfig.badgeText,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: sizeConfig.badgePadding,
              borderRadius: '9999px',
              background: isDark ? 'rgba(96, 165, 250, 0.15)' : '#eff6ff',
              color: isDark ? '#93c5fd' : '#2563eb',
              border: isDark
                ? '1px solid rgba(96, 165, 250, 0.3)'
                : '1px solid #dbeafe',
              lineHeight: 1,
            }}
          >
            POS
          </span>
        )}
      </div>
    </div>
  )
}

