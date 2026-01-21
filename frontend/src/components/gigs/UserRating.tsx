import { Star } from 'lucide-react'

interface UserRatingProps {
  rating: number
  count: number
  size?: 'sm' | 'md' | 'lg'
}

export function UserRating({ rating, count, size = 'md' }: UserRatingProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  if (count === 0) {
    return (
      <span className={`text-muted-foreground ${sizeClasses[size]}`}>
        No reviews yet
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
      <Star className={`${starSizes[size]} fill-yellow-400 text-yellow-400`} />
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  )
}
