import React, { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react'
import { Input } from '../common/Input'
import { Checkbox } from '../common/Checkbox'
import { Button } from '../common/Button'
import { BrandLogo } from '../common/BrandLogo'
import { ForgotPasswordModal } from './ForgotPasswordModal'

export interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void
  onNavigateToRegister?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onNavigateToRegister }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = 'Work email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid work email address'
      }
    }

    if (!password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmissionFeedback(null)

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      if (onSubmit) {
        await onSubmit({ email, password, rememberMe })
      } else {
        // UI Demonstration state: simulate async action then complete gracefully
        await new Promise((resolve) => setTimeout(resolve, 1200))
        setSubmissionFeedback(
          'Login UI validated. Ready to connect to backend authentication endpoint.'
        )
      }
    } catch (err) {
      console.error('Login action error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="nex-login-container">
      {/* Top Brand Bar */}
      <div className="nex-login-header">
        <BrandLogo size="md" />
        <div className="nex-status-indicator">
          <span className="nex-status-indicator__dot" />
          <span className="nex-status-indicator__text">POS Cloud Online</span>
        </div>
      </div>

      {/* Main Login Card / Content */}
      <div className="nex-login-card">
        <div className="nex-login-intro">
          <h1 className="nex-login-title">Sign in to your POS terminal</h1>
          <p className="nex-login-subtitle">
            Enter your credentials to access registers, inventory, and sales management.
          </p>
        </div>

        {/* Feedback Alert if triggered */}
        {submissionFeedback && (
          <div className="nex-feedback-alert" role="status">
            <span className="nex-feedback-alert__badge">Ready</span>
            <span className="nex-feedback-alert__text">{submissionFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="nex-login-form">
          {/* Email Field */}
          <Input
            id="login-email"
            label="Work Email Address"
            type="email"
            placeholder="cashier@store.nexshop.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined }))
              }
            }}
            errorMessage={errors.email}
            startIcon={<Mail size={18} className="text-slate-400" />}
            autoComplete="email"
            required
          />

          {/* Password Field */}
          <Input
            id="login-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }))
              }
            }}
            errorMessage={errors.password}
            startIcon={<Lock size={18} className="text-slate-400" />}
            autoComplete="current-password"
            required
            endAction={
              <button
                type="button"
                className="nex-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? (
                  <EyeOff size={18} className="text-slate-400 hover:text-navy-900" />
                ) : (
                  <Eye size={18} className="text-slate-400 hover:text-navy-900" />
                )}
              </button>
            }
          />

          {/* Remember Me and Forgot Password Controls */}
          <div className="nex-login-options">
            <Checkbox
              id="login-remember"
              label="Remember this terminal for 30 days"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />

            <button
              type="button"
              className="nex-link-button"
              onClick={() => setIsForgotModalOpen(true)}
            >
              Forgot password?
            </button>
          </div>

          {/* Primary Action Button */}
          <Button
            type="submit"
            variant="navy"
            size="lg"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRight size={18} />}
          >
            {isLoading ? 'Signing in to POS...' : 'Sign In to Terminal'}
          </Button>

          {/* Link to Registration */}
          <div className="nex-auth-switch">
            <span>Don't have a registered shop?</span>{' '}
            <button
              type="button"
              className="nex-link-button nex-link-button--bold"
              onClick={onNavigateToRegister}
            >
              Register your shop
            </button>
          </div>
        </form>

        {/* Enterprise Security Badge */}
        <div className="nex-security-badge">
          <ShieldCheck size={16} className="nex-security-badge__icon" />
          <span>
            Enterprise-grade security · 256-bit TLS encryption · Multi-terminal sync
          </span>
        </div>

        {/* POS Assistance / Help row */}
        <div className="nex-login-help">
          <button
            type="button"
            className="nex-help-link"
            onClick={() => alert('Terminal Support: For hardware or access assistance, please contact your store supervisor or NEXSHOP Support at 1-800-NEX-SHOP.')}
          >
            <HelpCircle size={14} />
            <span>Need POS terminal assistance?</span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
      />
    </div>
  )
}

