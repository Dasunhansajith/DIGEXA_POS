import React, { useState, useEffect } from 'react'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { POSFeatureShowcase } from './components/auth/POSFeatureShowcase'
import './styles/auth.css'

export type AuthView = 'login' | 'register'

export const App: React.FC = () => {
  const [view, setView] = useState<AuthView>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#register') {
      return 'register'
    }
    return 'login'
  })

  // Synchronize view state with window hash and history
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#register') {
        setView('register')
      } else {
        setView('login')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (targetView: AuthView) => {
    setView(targetView)
    if (typeof window !== 'undefined') {
      window.location.hash = targetView === 'register' ? 'register' : 'login'
    }
  }

  return (
    <main className="nex-auth-layout">
      {/* Left Column: Focused SaaS POS Authentication / Registration */}
      <section
        className="nex-auth-layout__form-pane"
        aria-label={view === 'login' ? 'Sign in to POS terminal' : 'Register your shop'}
      >
        {view === 'login' ? (
          <LoginForm onNavigateToRegister={() => navigateTo('register')} />
        ) : (
          <RegisterForm onNavigateToLogin={() => navigateTo('login')} />
        )}
      </section>

      {/* Right Column: POS Feature Showcase & Live Terminal Status (Desktop) */}
      <section
        className="nex-auth-layout__showcase-pane"
        aria-label="POS System Highlights and Merchant Onboarding"
      >
        <POSFeatureShowcase mode={view} />
      </section>
    </main>
  )
}

export default App
