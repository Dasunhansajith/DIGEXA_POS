import React, { forwardRef } from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  description?: string
  containerClassName?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, checked, id, className = '', containerClassName = '', disabled, ...props }, ref) => {
    const generatedId = id || (typeof label === 'string' ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <label
        htmlFor={generatedId}
        className={`nex-checkbox-wrapper ${disabled ? 'nex-checkbox-wrapper--disabled' : ''} ${containerClassName}`}
      >
        <span className="nex-checkbox-control">
          <input
            ref={ref}
            id={generatedId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className={`nex-checkbox-input ${className}`}
            {...props}
          />
          <span className={`nex-checkbox-box ${checked ? 'nex-checkbox-box--checked' : ''}`} aria-hidden="true">
            {checked && <Check size={13} strokeWidth={3} className="nex-checkbox-check-icon" />}
          </span>
        </span>

        {(label || description) && (
          <span className="nex-checkbox-content">
            {label && <span className="nex-checkbox-label">{label}</span>}
            {description && <span className="nex-checkbox-description">{description}</span>}
          </span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

