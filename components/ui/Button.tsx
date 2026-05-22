'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[50px] font-semibold cursor-pointer transition-all duration-200 border-none',
        variant === 'primary' && 'bg-mint text-white hover:bg-mint-dark hover:-translate-y-px',
        variant === 'ghost' && 'bg-transparent text-charcoal border border-[1.5px] border-gray-border hover:border-mint hover:text-mint-dark',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        size === 'sm' && 'px-4 py-2 text-sm',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-7 py-3.5 text-base',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
