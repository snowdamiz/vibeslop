import { cn } from '@/lib/utils'

interface PremiumBadgeProps {
  className?: string
  size?: 'sm' | 'md'
}

export function PremiumBadge({ className, size = 'sm' }: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        size === 'sm' && 'text-[9px] px-1.5 py-0.5',
        size === 'md' && 'text-[10px] px-2 py-0.5',
        className
      )}
      title="Premium member"
    >
      PRO
    </span>
  )
}
