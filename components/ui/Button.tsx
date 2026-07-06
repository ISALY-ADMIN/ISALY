'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-[10px] cursor-pointer select-none whitespace-nowrap ' +
  'transition-all duration-150 active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'text-white border-none bg-gradient-to-br from-[#10B981] to-[#059669] shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:brightness-110',
  secondary:
    'bg-transparent text-white/85 border border-white/15 hover:bg-white/[0.06] hover:border-white/25',
  ghost:
    'bg-transparent text-white/60 border-none hover:bg-white/[0.06] hover:text-white/90',
  danger:
    'bg-transparent text-[#F87171] border border-[rgba(239,68,68,0.35)] hover:bg-[rgba(239,68,68,0.08)] hover:border-[rgba(239,68,68,0.55)]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-[12.5px]',
  md: 'px-5 py-2.5 text-[13.5px]',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      style={{ fontFamily: "'Outfit', sans-serif" }}
      {...props}
    >
      {loading && (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

export { Button }
export default Button
