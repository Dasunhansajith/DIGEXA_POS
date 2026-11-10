import React, { useState } from 'react'
import { X, Mail, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Input } from '../common/Input'
import { Button } from '../common/Button'

export interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail)
  const [emailError, setEmailError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  if (!isOpen) return null

  const validateEmail = (val: string): boolean => {
    if (!val.trim()) {
      setEmailError('Please enter your work email')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(val.trim())) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) return

    setIsLoading(true)
    // Simulate UI action
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
    }, 900)
  }

  const handleResetModal = () => {
    setIsSubmitted(false)
    setEmail('')
    setEmailError('')
    onClose()
  }

  return (
    <div className="nex-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="nex-modal-backdrop" onClick={handleResetModal} />
      <div className="nex-modal-card">
        <button
          onClick={handleResetModal}
          className="nex-modal-close"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="nex-modal-icon-wrap">
              <Mail size={24} className="text-blue-600" />
            </div>

            <h3 id="modal-title" className="nex-modal-title">
              Reset Your Password
            </h3>
            <p className="nex-modal-subtitle">
              Enter your registered work email address and we'll send you verification instructions to reset your POS account credentials.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <Input
                label="Registered Work Email"
                type="email"
                placeholder="cashier@store.nexshop.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) validateEmail(e.target.value)
                }}
                errorMessage={emailError}
                startIcon={<Mail size={18} />}
                required
                autoFocus
              />

              <div className="nex-modal-security-note">
                <ShieldAlert size={15} />
                <span>For terminal PIN reset or manager override, contact your store administrator.</span>
              </div>

              <div className="nex-modal-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetModal}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="navy"
                  isLoading={isLoading}
                >
                  Send Reset Link
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="nex-modal-success">
            <div className="nex-modal-icon-wrap nex-modal-icon-wrap--success">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="nex-modal-title">Instructions Sent</h3>
            <p className="nex-modal-subtitle">
              If an account is associated with <strong>{email}</strong>, you will receive password reset instructions shortly.
            </p>
            <div className="nex-modal-actions" style={{ justifyContent: 'center' }}>
              <Button
                variant="navy"
                leftIcon={<ArrowLeft size={16} />}
                onClick={handleResetModal}
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

