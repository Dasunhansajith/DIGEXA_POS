import React from 'react'

export interface BrandLogoProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  height?: number
  className?: string
}

const defaultHeightMap = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 120,
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
  height,
  className = '',
}) => {
  const logoHeight = height ?? defaultHeightMap[size]

  return (
    <div
      className={`nexshop-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      <img
        src="/digexa-logo.png"
        alt="Digexa"
        style={{
          height: logoHeight,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          filter: variant === 'dark' ? 'brightness(0) invert(1)' : 'none',
        }}
      />
    </div>
  )
}
