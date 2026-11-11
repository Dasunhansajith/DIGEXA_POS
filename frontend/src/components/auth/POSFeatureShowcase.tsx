import React from 'react'

export interface POSFeatureShowcaseProps {
  mode?: 'login' | 'register'
}

export const POSFeatureShowcase: React.FC<POSFeatureShowcaseProps> = () => {
  return (
    <div className="nex-showcase">
      <div className="nex-showcase__hero-photo">
        <img
          src="/cashier-hero.jpg"
          alt="Cashier using POS system"
          className="nex-showcase__hero-img"
        />
        <div className="nex-showcase__hero-overlay" />
      </div>
    </div>
  )
}
