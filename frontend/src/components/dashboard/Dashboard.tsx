import React from 'react'
import {
  Store,
  User,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  ShoppingBag,
  Package,
  BarChart3,
  Clock,
  Laptop,
} from 'lucide-react'
import { BrandLogo } from '../common/BrandLogo'
import { Button } from '../common/Button'
import type { AuthUser, TestAuthResponse } from '../../api/types'

export interface DashboardProps {
  user: AuthUser | null
  testResponse?: TestAuthResponse | null
  onSignOut: () => void
  onNavigateToProducts?: () => void
  onNavigateToTerminal?: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  testResponse,
  onSignOut,
  onNavigateToProducts,
  onNavigateToTerminal,
}) => {
  return (
    <div className="nex-dashboard-container">
      {/* Top Navigation Bar */}
      <header className="nex-dashboard-header">
        <div className="nex-dashboard-brand">
          <BrandLogo size="md" />
          <div className="nex-dashboard-badge">
            <span className="nex-status-indicator__dot" />
            <span>POS Terminal Active</span>
          </div>
        </div>

        <div className="nex-dashboard-actions">
          <div className="nex-dashboard-user-info">
            <div className="nex-dashboard-avatar">
              <User size={18} />
            </div>
            <div className="nex-dashboard-user-details">
              <span className="nex-dashboard-user-name">{user?.fullName || 'POS Merchant'}</span>
              <span className="nex-dashboard-user-role">{user?.role || 'OWNER'}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onSignOut}
            leftIcon={<LogOut size={16} />}
          >
            Lock Terminal
          </Button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="nex-dashboard-main">
        {/* Verification Success Banner */}
        <div className="nex-dashboard-verified-banner" role="status">
          <div className="nex-dashboard-verified-icon">
            <CheckCircle2 size={24} className="text-emerald-500" />
          </div>
          <div className="nex-dashboard-verified-text">
            <h3>Authentication & Session Verified</h3>
            <p>
              Successfully authenticated via Spring Boot backend! Protected endpoint <code>GET /api/test</code> verified with Bearer token.
            </p>
            {testResponse && (
              <div className="nex-dashboard-test-payload">
                <span>Verified Subject: <strong>{testResponse.email}</strong></span>
                <span>User ID: <strong>{testResponse.userId}</strong></span>
                <span>Assigned Role: <strong>{testResponse.role}</strong></span>
                <span>In-Memory Token: <strong>Active (Secure)</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="nex-dashboard-grid">
          {/* Card 1: Shop & Terminal Info */}
          <div className="nex-dashboard-card">
            <div className="nex-dashboard-card__header">
              <div className="nex-dashboard-card__icon nex-dashboard-card__icon--blue">
                <Store size={20} />
              </div>
              <h4>Registered Terminal</h4>
            </div>
            <div className="nex-dashboard-card__body">
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Shop ID:</span>
                <span className="nex-dashboard-value">#{user?.shopId ?? 1}</span>
              </div>
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Work Email:</span>
                <span className="nex-dashboard-value">{user?.email}</span>
              </div>
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Terminal ID:</span>
                <span className="nex-dashboard-value">TERM-01 (Main Register)</span>
              </div>
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Token Storage:</span>
                <span className="nex-dashboard-value nex-dashboard-value--tag">Memory Only</span>
              </div>
            </div>
          </div>

          {/* Card 2: Security & Sync Status */}
          <div className="nex-dashboard-card">
            <div className="nex-dashboard-card__header">
              <div className="nex-dashboard-card__icon nex-dashboard-card__icon--emerald">
                <ShieldCheck size={20} />
              </div>
              <h4>Security Status</h4>
            </div>
            <div className="nex-dashboard-card__body">
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Algorithm:</span>
                <span className="nex-dashboard-value">HMAC-SHA256 (HS256)</span>
              </div>
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Token Expiration:</span>
                <span className="nex-dashboard-value">1 Hour (Stateless)</span>
              </div>
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Backend URL:</span>
                <span className="nex-dashboard-value">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'}</span>
              </div>
              <div className="nex-dashboard-detail-row">
                <span className="nex-dashboard-label">Cloud Sync:</span>
                <span className="nex-dashboard-value nex-dashboard-value--active">Live (PostgreSQL)</span>
              </div>
            </div>
          </div>

          {/* Card 3: POS Quick Access */}
          <div className="nex-dashboard-card">
            <div className="nex-dashboard-card__header">
              <div className="nex-dashboard-card__icon nex-dashboard-card__icon--purple">
                <Laptop size={20} />
              </div>
              <h4>POS Quick Navigation</h4>
            </div>
            <div className="nex-dashboard-card__body">
              <div className="nex-dashboard-quick-actions">
                <button
                  type="button"
                  className="nex-dashboard-action-btn"
                  onClick={onNavigateToTerminal}
                >
                  <ShoppingBag size={18} />
                  <span>Start New Sale</span>
                </button>
                <button
                  type="button"
                  className="nex-dashboard-action-btn"
                  onClick={onNavigateToProducts}
                >
                  <Package size={18} />
                  <span>Product Catalog</span>
                </button>
                <button type="button" className="nex-dashboard-action-btn">
                  <BarChart3 size={18} />
                  <span>Today's Receipts</span>
                </button>
                <button type="button" className="nex-dashboard-action-btn">
                  <Clock size={18} />
                  <span>Shift Summary</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

