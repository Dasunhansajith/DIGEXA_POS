import React, { useState, useEffect, useRef } from 'react'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { POSFeatureShowcase } from './components/auth/POSFeatureShowcase'
import { Dashboard } from './components/dashboard/Dashboard'
import { ProductManagement } from './components/products/ProductManagement'
import { POSTerminal } from './components/pos/POSTerminal'
import { InventoryManagement } from './components/inventory/InventoryManagement'
import { SalesManagement } from './components/sales/SalesManagement'
import { AppLayout } from './components/layout/AppLayout'
import type { NavItemKey } from './components/layout/Sidebar'
import { authApi, getAuthUser } from './api/client'
import type { AuthUser, LoginResponse, TestAuthResponse } from './api/types'
import './styles/auth.css'
import './styles/dashboard.css'
import './styles/products.css'
import './styles/pos.css'
import './styles/inventory.css'
import './styles/sales.css'

export type AuthView = 'login' | 'register' | 'dashboard' | 'products' | 'terminal' | 'inventory' | 'sales'

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getAuthUser())
  const [testResult, setTestResult] = useState<TestAuthResponse | null>(null)

  // Ref to trigger the Add Product modal from topnav button
  const addProductTriggerRef = useRef<(() => void) | null>(null)

  const [view, setView] = useState<AuthView>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (getAuthUser()) {
        if (hash === '#dashboard') return 'dashboard'
        if (hash === '#terminal') return 'terminal'
        if (hash === '#inventory') return 'inventory'
        if (hash === '#sales') return 'sales'
        return 'products'
      }
      if (hash === '#register') {
        return 'register'
      }
    }
    return 'login'
  })

  // Synchronize view state with window hash and history
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#register') {
        setView('register')
      } else if (hash === '#dashboard') {
        if (currentUser) {
          setView('dashboard')
        } else {
          window.location.hash = 'login'
          setView('login')
        }
      } else if (hash === '#terminal') {
        if (currentUser) {
          setView('terminal')
        } else {
          window.location.hash = 'login'
          setView('login')
        }
      } else if (hash === '#inventory') {
        if (currentUser) {
          setView('inventory')
        } else {
          window.location.hash = 'login'
          setView('login')
        }
      } else if (hash === '#sales') {
        if (currentUser) {
          setView('sales')
        } else {
          window.location.hash = 'login'
          setView('login')
        }
      } else if (hash === '#products') {
        if (currentUser) {
          setView('products')
        } else {
          window.location.hash = 'login'
          setView('login')
        }
      } else {
        if (currentUser) {
          setView('products')
        } else {
          setView('login')
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [currentUser])

  const navigateTo = (targetView: AuthView) => {
    setView(targetView)
    if (typeof window !== 'undefined') {
      window.location.hash = targetView
    }
  }

  const handleLoginSuccess = (loginResp: LoginResponse, testResp: TestAuthResponse) => {
    const user: AuthUser = {
      userId: loginResp.userId,
      shopId: loginResp.shopId,
      fullName: loginResp.fullName,
      email: loginResp.email,
      role: loginResp.role,
    }
    setCurrentUser(user)
    setTestResult(testResp)
    // Land on the Products view directly on login
    navigateTo('products')
  }

  const handleSignOut = () => {
    authApi.logout()
    setCurrentUser(null)
    setTestResult(null)
    navigateTo('login')
  }

  // Authenticated Application Shell Views
  if (
    currentUser &&
    (view === 'products' ||
      view === 'dashboard' ||
      view === 'terminal' ||
      view === 'inventory' ||
      view === 'sales')
  ) {
    const isProducts = view === 'products'
    const isTerminal = view === 'terminal'
    const isInventory = view === 'inventory'
    const isSales = view === 'sales'

    return (
      <AppLayout
        user={currentUser}
        activeNav={view}
        onNavigate={(itemKey: NavItemKey) => {
          if (itemKey === 'products') navigateTo('products')
          else if (itemKey === 'dashboard') navigateTo('dashboard')
          else if (itemKey === 'terminal') navigateTo('terminal')
          else if (itemKey === 'inventory') navigateTo('inventory')
          else if (itemKey === 'sales') navigateTo('sales')
        }}
        onSignOut={handleSignOut}
        onAddProductClick={
          isProducts ? () => addProductTriggerRef.current?.() : undefined
        }
        pageTitle={
          isProducts
            ? 'Product Management'
            : isTerminal
            ? 'POS Cashier Terminal'
            : isInventory
            ? 'Inventory Management'
            : isSales
            ? 'Sales Management'
            : 'Sales Analytics Dashboard'
        }
        breadcrumb={{
          section: 'Workspace',
          page: isProducts
            ? 'Products'
            : isTerminal
            ? 'POS Terminal'
            : isInventory
            ? 'Inventory Management'
            : isSales
            ? 'Sales Management'
            : 'Analytics Overview',
        }}
      >
        {isProducts ? (
          <ProductManagement
            onRegisterProductModalTrigger={(trigger) => {
              addProductTriggerRef.current = trigger
            }}
          />
        ) : isTerminal ? (
          <POSTerminal />
        ) : isInventory ? (
          <InventoryManagement onSignOut={handleSignOut} />
        ) : isSales ? (
          <SalesManagement onSignOut={handleSignOut} />
        ) : (
          <Dashboard
            user={currentUser}
            testResponse={testResult}
            onSignOut={handleSignOut}
            onNavigateToProducts={() => navigateTo('products')}
            onNavigateToTerminal={() => navigateTo('terminal')}
          />
        )}
      </AppLayout>
    )
  }

  // Unauthenticated Authentication / Registration View
  return (
    <main className="nex-auth-layout">
      {/* Left Column: Focused SaaS POS Authentication / Registration */}
      <section
        className="nex-auth-layout__form-pane"
        aria-label={view === 'login' ? 'Sign in to POS terminal' : 'Register your shop'}
      >
        {view === 'login' ? (
          <LoginForm
            onNavigateToRegister={() => navigateTo('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <RegisterForm onNavigateToLogin={() => navigateTo('login')} />
        )}
      </section>

      {/* Right Column: Hero Showcase & Supermarket Background */}
      <section
        className="nex-auth-layout__showcase-pane"
        aria-label="POS System Highlights and Merchant Onboarding"
      >
        <POSFeatureShowcase mode={view === 'register' ? 'register' : 'login'} />
      </section>
    </main>
  )
}

export default App
