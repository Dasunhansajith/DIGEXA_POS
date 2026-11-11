import React, { useState } from 'react'
import {
  Store,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Input } from '../common/Input'
import { Checkbox } from '../common/Checkbox'
import { Button } from '../common/Button'
import { BrandLogo } from '../common/BrandLogo'
import { authApi, ApiError } from '../../api/client'
import type { ShopRegistrationResponse } from '../../api/types'

export interface RegisterFormData {
  shopName: string
  ownerName: string
  email: string
  phoneNumber: string
  password: string
  confirmPassword: string
  agreeTerms: boolean
}

export interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => Promise<void> | void
  onNavigateToLogin?: () => void
  onRegisterSuccess?: (response: ShopRegistrationResponse) => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onNavigateToLogin,
  onRegisterSuccess,
}) => {
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(true)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'error' | 'success' | 'info'
    badge: string
    text: string
  } | null>(null)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Shop Name
    if (!shopName.trim()) {
      newErrors.shopName = 'Shop name is required'
    } else if (shopName.trim().length < 2) {
      newErrors.shopName = 'Shop name must be at least 2 characters'
    }

    // Owner Name
    if (!ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required'
    } else if (ownerName.trim().length < 2) {
      newErrors.ownerName = 'Owner name must be at least 2 characters'
    }

    // Email
    if (!email.trim()) {
      newErrors.email = 'Business email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    // Phone Number
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    } else if (!/^[0-9+()-\s]{7,20}$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid contact phone number'
    }

    // Password
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    // Confirm Password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Terms
    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must accept the terms to continue'
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
        await onSubmit({
          shopName,
          ownerName,
          email,
          phoneNumber,
          password,
          confirmPassword,
          agreeTerms,
        })
      } else {
        // Map form fields to backend ShopRegistrationRequest DTO:
        // shopName -> shopName
        // ownerName -> ownerFullName
        // email -> email
        // phoneNumber -> phone
        // password -> password
        // confirmPassword -> confirmPassword
        const response = await authApi.register({
          shopName: shopName.trim(),
          ownerFullName: ownerName.trim(),
          email: email.trim().toLowerCase(),
          phone: phoneNumber.trim(),
          password,
          confirmPassword,
        })

        setSubmissionFeedback({
          type: 'success',
          badge: 'Success',
          text: `Shop "${response.shopName}" registered successfully! Redirecting to login...`,
        })

        if (onRegisterSuccess) {
          onRegisterSuccess(response)
        }

        // Navigate to the existing Login page after successful registration
        setTimeout(() => {
          if (onNavigateToLogin) {
            onNavigateToLogin()
          }
        }, 1500)
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          // Network connection error
          setSubmissionFeedback({
            type: 'error',
            badge: 'Connection Error',
            text: err.message,
          })
        } else if (err.status === 400 && err.message.toLowerCase().includes('already exists')) {
          // Duplicate email error
          setErrors((prev) => ({
            ...prev,
            email: 'An account with this email already exists',
          }))
          setSubmissionFeedback({
            type: 'error',
            badge: 'Duplicate Email',
            text: 'An account with this email already exists. Please sign in or use another email.',
          })
        } else if (err.fieldErrors) {
          // Backend field-level validation errors
          const newFieldErrors: Record<string, string> = {}
          if (err.fieldErrors.shopName) newFieldErrors.shopName = err.fieldErrors.shopName
          if (err.fieldErrors.ownerFullName) newFieldErrors.ownerName = err.fieldErrors.ownerFullName
          if (err.fieldErrors.email) newFieldErrors.email = err.fieldErrors.email
          if (err.fieldErrors.phone) newFieldErrors.phoneNumber = err.fieldErrors.phone
          if (err.fieldErrors.password) newFieldErrors.password = err.fieldErrors.password
          if (err.fieldErrors.confirmPassword) newFieldErrors.confirmPassword = err.fieldErrors.confirmPassword

          setErrors((prev) => ({ ...prev, ...newFieldErrors }))
          setSubmissionFeedback({
            type: 'error',
            badge: 'Validation Error',
            text: err.message || 'Please correct the highlighted fields below.',
          })
        } else {
          setSubmissionFeedback({
            type: 'error',
            badge: 'Registration Error',
            text: err.message || 'Registration failed. Please check your information and try again.',
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
          text: 'An unexpected error occurred during registration.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  return (
    <div className="nex-login-container nex-register-container">
      {/* Top Brand Bar */}
      <div className="nex-login-header">
        <BrandLogo size="md" />
        <div className="nex-status-indicator">
          <Sparkles size={13} className="text-blue-600" />
          <span className="nex-status-indicator__text">14-Day Free Trial</span>
        </div>
      </div>

      {/* Main Registration Card / Content */}
      <div className="nex-login-card">
        <div className="nex-login-intro">
          <h1 className="nex-login-title">Register your shop</h1>
          <p className="nex-login-subtitle">
            Set up your NEXSHOP cloud POS system. Manage registers, inventory, and staff with ease.
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
          {/* Shop Name & Owner Name Row */}
          <div className="nex-form-row">
            <Input
              id="register-shop-name"
              label="Shop / Business Name"
              type="text"
              placeholder="e.g. Apex Central Retail"
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value)
                clearFieldError('shopName')
              }}
              errorMessage={errors.shopName}
              startIcon={<Store size={18} className="text-slate-400" />}
              autoComplete="organization"
              required
            />

            <Input
              id="register-owner-name"
              label="Owner Full Name"
              type="text"
              placeholder="e.g. Alex Morgan"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value)
                clearFieldError('ownerName')
              }}
              errorMessage={errors.ownerName}
              startIcon={<User size={18} className="text-slate-400" />}
              autoComplete="name"
              required
            />
          </div>

          {/* Email & Phone Row */}
          <div className="nex-form-row">
            <Input
              id="register-email"
              label="Business Email"
              type="email"
              placeholder="owner@store.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearFieldError('email')
              }}
              errorMessage={errors.email}
              startIcon={<Mail size={18} className="text-slate-400" />}
              autoComplete="email"
              required
            />

            <Input
              id="register-phone"
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 234-5678"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                clearFieldError('phoneNumber')
              }}
              errorMessage={errors.phoneNumber}
              startIcon={<Phone size={18} className="text-slate-400" />}
              autoComplete="tel"
              required
            />
          </div>

          {/* Password & Confirm Password Row */}
          <div className="nex-form-row">
            <Input
              id="register-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearFieldError('password')
              }}
              errorMessage={errors.password}
              startIcon={<Lock size={18} className="text-slate-400" />}
              autoComplete="new-password"
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

            <Input
              id="register-confirm-password"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                clearFieldError('confirmPassword')
              }}
              errorMessage={errors.confirmPassword}
              startIcon={<Lock size={18} className="text-slate-400" />}
              autoComplete="new-password"
              required
              endAction={
                <button
                  type="button"
                  className="nex-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} className="text-slate-400 hover:text-navy-900" />
                  ) : (
                    <Eye size={18} className="text-slate-400 hover:text-navy-900" />
                  )}
                </button>
              }
            />
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="nex-terms-wrapper">
            <Checkbox
              id="register-terms"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked)
                clearFieldError('agreeTerms')
              }}
              label={
                <span>
                  I agree to the <span className="nex-terms-link">Terms of Service</span> and{' '}
                  <span className="nex-terms-link">Merchant Privacy Policy</span>
                </span>
              }
            />
            {errors.agreeTerms && (
              <p className="nex-input-error-msg" role="alert" style={{ marginTop: '0.35rem' }}>
                {errors.agreeTerms}
              </p>
            )}
          </div>

          {/* Create Account Button */}
          <Button
            type="submit"
            variant="navy"
            size="lg"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRight size={18} />}
          >
            {isLoading ? 'Creating Shop Account...' : 'Create Account'}
          </Button>

          {/* Link to Login */}
          <div className="nex-auth-switch">
            <span>Already have a shop account?</span>{' '}
            <button
              type="button"
              className="nex-link-button nex-link-button--bold"
              onClick={onNavigateToLogin}
            >
              Sign In to Terminal
            </button>
          </div>
        </form>

        {/* Enterprise Security Trust Badge */}
        <div className="nex-security-badge">
          <ShieldCheck size={16} className="nex-security-badge__icon" />
          <span>
            PCI-DSS compliant · 256-bit TLS encryption · 99.99% cloud uptime SLA
          </span>
        </div>
      </div>
    </div>
  )
}
