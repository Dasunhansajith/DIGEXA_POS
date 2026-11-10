import React from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'navy'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const isDisabled = disabled || isLoading

  // Generate class names based on props
  const classes = [
    'nex-btn',
    `nex-btn--${variant}`,
    `nex-btn--${size}`,
    fullWidth ? 'nex-btn--full' : '',
    isLoading ? 'nex-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      disabled={isDisabled}
      aria-busy={isLoading}
      style={style}
      {...props}
    >
      {isLoading ? (
        <span className="nex-btn__spinner" aria-hidden="true">
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 18} />
        </span>
      ) : (
        leftIcon && <span className="nex-btn__icon nex-btn__icon--left">{leftIcon}</span>
      )}
      <span className="nex-btn__text">{children}</span>
      {!isLoading && rightIcon && (
        <span className="nex-btn__icon nex-btn__icon--right">{rightIcon}</span>
      )}
    </button>
  )
}

