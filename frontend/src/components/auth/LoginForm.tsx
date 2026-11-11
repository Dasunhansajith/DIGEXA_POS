import React, { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Input } from '../common/Input'
import { Checkbox } from '../common/Checkbox'
import { Button } from '../common/Button'
import { BrandLogo } from '../common/BrandLogo'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { authApi, ApiError } from '../../api/client'
import type { LoginResponse, TestAuthResponse } from '../../api/types'

export interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void
  onNavigateToRegister?: () => void
  onLoginSuccess?: (loginResponse: LoginResponse, testResponse: TestAuthResponse) => void
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onNavigateToRegister,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'error' | 'success' | 'info'
    badge: string
    text: string
  } | null>(null)

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
        // 1. Authenticate with backend: POST /api/auth/login
        const loginResponse = await authApi.login({
          email: email.trim(),
          password,
        })

        // 2. Call GET /api/test with Authorization: Bearer <accessToken> to verify authentication
        const testResponse = await authApi.testAuth(loginResponse.accessToken)

        setSubmissionFeedback({
          type: 'success',
          badge: 'Verified',
          text: `Welcome, ${loginResponse.fullName}! Session authenticated successfully.`,
        })

        // 3. Redirect to Dashboard after successful authentication
        if (onLoginSuccess) {
          onLoginSuccess(loginResponse, testResponse)
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setSubmissionFeedback({
            type: 'error',
            badge: 'Auth Failed',
            text: 'Invalid work email or password. Please verify your credentials.',
          })
        } else if (err.status === 0) {
          setSubmissionFeedback({
            type: 'error',
            badge: 'Connection Error',
            text: err.message,
          })
        } else {
          setSubmissionFeedback({
            type: 'error',
            badge: 'Error',
            text: err.message,
          })
        }
      } else if (err instanceof Error) {
        setSubmissionFeedback({
          type: 'error',
          badge: 'Error',
          text: err.message,
        })
      } else {
        setSubmissionFeedback({
          type: 'error',
          badge: 'Error',
          text: 'An unexpected error occurred during sign in.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="nex-login-container">
      {/* Top Brand Bar */}
      <div className="nex-login-header">
        <BrandLogo size="lg" />
      </div>

      {/* Main Login Card / Content */}
      <div className="nex-login-card">
        <div className="nex-login-intro">
          <h1 className="nex-login-title">Sign in to your POS terminal</h1>
          <p className="nex-login-subtitle">
            Enter your credentials to access{' '}
            <strong>registers, inventory,</strong> and{' '}
            <strong>sales management.</strong>
          </p>
        </div>

        {/* Feedback Alert if triggered */}
        {submissionFeedback && (
          <div
            className={`nex-feedback-alert ${
              submissionFeedback.type === 'error'
                ? 'nex-feedback-alert--error'
                : submissionFeedback.type === 'success'
                ? 'nex-feedback-alert--success'
                : ''
            }`}
            role="status"
          >
            <span className="nex-feedback-alert__badge">{submissionFeedback.badge}</span>
            <span className="nex-feedback-alert__text">{submissionFeedback.text}</span>
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
