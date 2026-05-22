import { cn } from '@/lib/utils'
import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-bold text-charcoal mb-1.5">{label}</label>
      )}
      <input
        className={cn(
          'w-full px-3.5 py-2.5 border-[1.5px] border-gray-border rounded-[9px] text-[13.5px] outline-none transition-colors bg-white',
          'focus:border-mint',
          className
        )}
        {...props}
      />
    </div>
  )
}
