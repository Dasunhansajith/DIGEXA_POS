import React, { forwardRef, useState } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  errorMessage?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  endAction?: React.ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      startIcon,
      endIcon,
      endAction,
      id,
      className = '',
      containerClassName = '',
      required,
      disabled,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false)
    const generatedId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
    const errorId = generatedId ? `${generatedId}-error` : undefined
    const helperId = generatedId ? `${generatedId}-helper` : undefined

    const hasError = Boolean(errorMessage)

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    return (
      <div className={`nex-input-group ${containerClassName}`}>
        {label && (
          <label htmlFor={generatedId} className="nex-input-label">
            <span>{label}</span>
            {required && <span className="nex-input-required" aria-hidden="true">*</span>}
          </label>
        )}

        <div
          className={[
            'nex-input-wrapper',
            isFocused ? 'nex-input-wrapper--focused' : '',
            hasError ? 'nex-input-wrapper--error' : '',
            disabled ? 'nex-input-wrapper--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {startIcon && <span className="nex-input-icon nex-input-icon--start">{startIcon}</span>}

          <input
            ref={ref}
            id={generatedId}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            className={`nex-input-field ${className}`}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {endAction ? (
            <span className="nex-input-action">{endAction}</span>
          ) : endIcon ? (
            <span className="nex-input-icon nex-input-icon--end">{endIcon}</span>
          ) : null}
        </div>

        {hasError ? (
          <p id={errorId} className="nex-input-error-msg" role="alert">
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={helperId} className="nex-input-helper-msg">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

