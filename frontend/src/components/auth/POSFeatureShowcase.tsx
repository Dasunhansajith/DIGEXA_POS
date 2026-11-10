import React from 'react'
import {
  Zap,
  Store,
  Wifi,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Activity,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react'
import { BrandLogo } from '../common/BrandLogo'

export interface POSFeatureShowcaseProps {
  mode?: 'login' | 'register'
}

export const POSFeatureShowcase: React.FC<POSFeatureShowcaseProps> = ({
  mode = 'login',
}) => {
  const isRegister = mode === 'register'

  return (
    <div className="nex-showcase">
      {/* Background ambient lighting and grid patterns */}
      <div className="nex-showcase__ambient-glow" />
      <div className="nex-showcase__grid-pattern" />

      <div className="nex-showcase__content">
        {/* Top Header Badge */}
        <div className="nex-showcase__header">
          <BrandLogo variant="dark" size="sm" showBadge={false} />
          <div className="nex-showcase__system-badge">
            <span className="nex-showcase__pulse-dot" />
            <span>{isRegister ? 'Instant Merchant Onboarding' : 'POS Cloud Core v2.4'}</span>
          </div>
        </div>

        {/* Hero Pitch */}
        <div className="nex-showcase__pitch">
          {isRegister ? (
            <>
              <h2 className="nex-showcase__title">
                Start ringing sales in <br />
                <span className="nex-showcase__highlight">under 2 minutes</span>.
              </h2>
              <p className="nex-showcase__subtitle">
                Set up registers, import your catalog, and manage inventory across all your stores with zero hardware lock-in.
              </p>
            </>
          ) : (
            <>
              <h2 className="nex-showcase__title">
                The next-generation <br />
                <span className="nex-showcase__highlight">Cloud POS System</span> for modern retail.
              </h2>
              <p className="nex-showcase__subtitle">
                Unify high-speed registers, real-time inventory, multi-outlet sync, and automated billing into a single high-performance platform.
              </p>
            </>
          )}
        </div>

        {/* Dynamic Card */}
        {isRegister ? (
          <div className="nex-pos-preview-card">
            <div className="nex-pos-preview-card__header">
              <div className="nex-pos-preview-card__terminal-info">
                <div className="nex-pos-preview-card__terminal-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="nex-pos-preview-card__terminal-name">New Merchant Quick-Launch</div>
                  <div className="nex-pos-preview-card__terminal-status">
                    <span className="nex-pos-preview-card__dot" /> 14-Day Full-Featured Trial Active
                  </div>
                </div>
              </div>
              <div className="nex-pos-preview-card__badge">
                <Activity size={12} className="nex-pos-preview-card__pulse-icon" />
                <span>INSTANT</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="nex-pos-preview-card__metrics">
              <div className="nex-metric-pill">
                <span className="nex-metric-pill__label">Setup Cost</span>
                <span className="nex-metric-pill__value">$0.00</span>
                <span className="nex-metric-pill__trend">No credit card</span>
              </div>
              <div className="nex-metric-pill">
                <span className="nex-metric-pill__label">Multi-Register</span>
                <span className="nex-metric-pill__value">Unlimited</span>
                <span className="nex-metric-pill__sub">Web, tablet, desktop</span>
              </div>
              <div className="nex-metric-pill">
                <span className="nex-metric-pill__label">Cloud Uptime</span>
                <span className="nex-metric-pill__value">99.99%</span>
                <span className="nex-metric-pill__sub">SLA guaranteed</span>
              </div>
            </div>

            {/* Setup Progress */}
            <div className="nex-pos-preview-card__footer">
              <div className="nex-pos-preview-card__checkout-info">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Includes Automated Daily Sales &amp; Tax Reports</span>
              </div>
              <div className="nex-pos-preview-card__secure-tag">
                <ShieldCheck size={14} /> SOC-2 Ready
              </div>
            </div>
          </div>
        ) : (
          <div className="nex-pos-preview-card">
            <div className="nex-pos-preview-card__header">
              <div className="nex-pos-preview-card__terminal-info">
                <div className="nex-pos-preview-card__terminal-icon">
                  <Store size={18} />
                </div>
                <div>
                  <div className="nex-pos-preview-card__terminal-name">Terminal #04 · Downtown Flagship</div>
                  <div className="nex-pos-preview-card__terminal-status">
                    <span className="nex-pos-preview-card__dot" /> Connected · Offline-Ready
                  </div>
                </div>
              </div>
              <div className="nex-pos-preview-card__badge">
                <Activity size={12} className="nex-pos-preview-card__pulse-icon" />
                <span>LIVE</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="nex-pos-preview-card__metrics">
              <div className="nex-metric-pill">
                <span className="nex-metric-pill__label">Today's Volume</span>
                <span className="nex-metric-pill__value">$18,450.80</span>
                <span className="nex-metric-pill__trend">
                  <TrendingUp size={11} /> +14.2%
                </span>
              </div>
              <div className="nex-metric-pill">
                <span className="nex-metric-pill__label">Transactions</span>
                <span className="nex-metric-pill__value">412 orders</span>
                <span className="nex-metric-pill__sub">Avg 1.2s / scan</span>
              </div>
              <div className="nex-metric-pill">
                <span className="nex-metric-pill__label">Cloud Sync</span>
                <span className="nex-metric-pill__value">99.99%</span>
                <span className="nex-metric-pill__sub">Instant multi-store</span>
              </div>
            </div>

            {/* Mini active transaction */}
            <div className="nex-pos-preview-card__footer">
              <div className="nex-pos-preview-card__checkout-info">
                <CreditCard size={15} className="text-blue-400" />
                <span>Fast Split-Tender &amp; Contactless NFC Enabled</span>
              </div>
              <div className="nex-pos-preview-card__secure-tag">
                <ShieldCheck size={14} /> Encrypted
              </div>
            </div>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="nex-showcase__features">
          {isRegister ? (
            <>
              <div className="nex-feature-item">
                <div className="nex-feature-item__icon-wrap">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="nex-feature-item__title">Zero Hardware Lock-In</h4>
                  <p className="nex-feature-item__desc">
                    Runs on any laptop, tablet, iPad, or existing touch register. Compatible with ESC/POS thermal printers.
                  </p>
                </div>
              </div>

              <div className="nex-feature-item">
                <div className="nex-feature-item__icon-wrap">
                  <Layers size={18} />
                </div>
                <div>
                  <h4 className="nex-feature-item__title">Unified Multi-Store Management</h4>
                  <p className="nex-feature-item__desc">
                    Scale from a single boutique to nationwide chain outlets without switching systems.
                  </p>
                </div>
              </div>

              <div className="nex-feature-item">
                <div className="nex-feature-item__icon-wrap">
                  <Wifi size={18} />
                </div>
                <div>
                  <h4 className="nex-feature-item__title">Offline-First Reliability</h4>
                  <p className="nex-feature-item__desc">
                    Internet dropouts will never halt your checkout line. Sales queue locally and auto-sync when online.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="nex-feature-item">
                <div className="nex-feature-item__icon-wrap">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="nex-feature-item__title">Sub-Second Checkout</h4>
                  <p className="nex-feature-item__desc">
                    High-throughput barcode scanning, keyboard hotkeys, and rapid receipt printing.
                  </p>
                </div>
              </div>

              <div className="nex-feature-item">
                <div className="nex-feature-item__icon-wrap">
                  <Wifi size={18} />
                </div>
                <div>
                  <h4 className="nex-feature-item__title">Offline-First Engine</h4>
                  <p className="nex-feature-item__desc">
                    Keep ringing sales during internet disruptions. Automatically reconciles upon reconnect.
                  </p>
                </div>
              </div>

              <div className="nex-feature-item">
                <div className="nex-feature-item__icon-wrap">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h4 className="nex-feature-item__title">Multi-Store Synchronization</h4>
                  <p className="nex-feature-item__desc">
                    Real-time stock depletion and omnichannel visibility across all retail locations.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Social Proof / Trust */}
        <div className="nex-showcase__quote">
          {isRegister ? (
            <>
              <p className="nex-showcase__quote-text">
                “We migrated our 5 boutique stores to NEXSHOP in one afternoon. Cashiers picked it up immediately without training.”
              </p>
              <div className="nex-showcase__quote-author">
                <div className="nex-showcase__author-avatar">SL</div>
                <div>
                  <div className="nex-showcase__author-name">Sarah Lin</div>
                  <div className="nex-showcase__author-role">Founder &amp; Owner, Lin &amp; Co. Retail</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="nex-showcase__quote-text">
                “NEXSHOP POS gave our retail staff an intuitive, blazing fast checkout experience with zero downtime.”
              </p>
              <div className="nex-showcase__quote-author">
                <div className="nex-showcase__author-avatar">MV</div>
                <div>
                  <div className="nex-showcase__author-name">Marcus Vance</div>
                  <div className="nex-showcase__author-role">Director of Store Operations, Apex Retail</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
