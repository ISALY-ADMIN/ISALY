import { cn, getInitials, getAvatarColor } from '@/lib/utils'

interface AvatarProps {
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  style?: React.CSSProperties
}

export default function Avatar({ firstName, lastName, imageUrl, size = 'md', className, style }: AvatarProps) {
  const initials = getInitials(firstName, lastName)
  const color = getAvatarColor(initials)

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-[68px] h-[68px] text-2xl',
    xl: 'w-20 h-20 text-3xl',
  }[size]

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={initials}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
        style={style}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-extrabold text-white flex-shrink-0',
        sizeClass,
        className
      )}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, ...style }}
    >
      {initials}
    </div>
  )
}
