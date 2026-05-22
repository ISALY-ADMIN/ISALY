import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'ok' | 'pending' | 'missing' | 'mint'
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'mint', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10.5px] font-bold px-2.5 py-1 rounded-full',
        variant === 'ok' && 'bg-[#D1FAE5] text-[#065F46]',
        variant === 'pending' && 'bg-[#FEF3C7] text-[#92400E]',
        variant === 'missing' && 'bg-[#FEE2E2] text-[#991B1B]',
        variant === 'mint' && 'bg-mint-light text-mint-dark',
        className
      )}
    >
      {children}
    </span>
  )
}
