import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Star } from 'lucide-react'
import type { GigReview } from '@/lib/api'

interface ReviewCardProps {
  review: GigReview
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="p-4 border-border">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          {review.reviewer.avatar_url && (
            <AvatarImage src={review.reviewer.avatar_url} alt={review.reviewer.display_name} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-medium">
            {review.reviewer.display_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{review.reviewer.display_name}</span>
            <span className="text-muted-foreground text-sm">@{review.reviewer.username}</span>
          </div>

          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < review.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
            <span className="text-sm text-muted-foreground ml-1">
              ({review.rating}/5)
            </span>
          </div>

          {review.content && (
            <p className="text-sm whitespace-pre-wrap">{review.content}</p>
          )}

          <div className="mt-2">
            <span className="text-xs text-muted-foreground">
              {new Date(review.inserted_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
