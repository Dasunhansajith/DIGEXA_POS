import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="digexa-toast-container" role="region" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 4500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const icons = {
    success: <CheckCircle2 size={18} className="digexa-toast__icon--success" />,
    error: <AlertCircle size={18} className="digexa-toast__icon--error" />,
    warning: <AlertTriangle size={18} className="digexa-toast__icon--warning" />,
    info: <Info size={18} className="digexa-toast__icon--info" />,
  }

  return (
    <div className={`digexa-toast digexa-toast--${toast.type}`}>
      <div className="digexa-toast__icon-wrapper">{icons[toast.type]}</div>
      <div className="digexa-toast__content">
        <div className="digexa-toast__title">{toast.title}</div>
        {toast.message && <div className="digexa-toast__message">{toast.message}</div>}
      </div>
      <button
        type="button"
        className="digexa-toast__close"
        onClick={onDismiss}
        aria-label="Close notification"
      >
        <X size={15} />
      </button>
    </div>
  )
}

