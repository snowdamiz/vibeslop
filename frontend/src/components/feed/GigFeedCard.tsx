import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Briefcase, Clock, DollarSign, Users, CheckCircle2 } from 'lucide-react'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { PremiumBadge } from '@/components/PremiumBadge'
import type { GigPost } from './types'

interface GigFeedCardProps {
  item: GigPost
  showBorder?: boolean
  trackRef?: (element: HTMLElement | null) => void
}

export function GigFeedCard({ item, showBorder = true, trackRef }: GigFeedCardProps) {
  const navigate = useNavigate()

  const formatBudget = (min?: number, max?: number, currency = 'USD') => {
    if (!min && !max) return 'Budget not specified'

    const format = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount / 100)
    }

    if (min && max) {
      return `${format(min)} - ${format(max)}`
    }
    if (min) return `From ${format(min)}`
    if (max) return `Up to ${format(max)}`
    return 'Budget not specified'
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Deadline passed'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays <= 7) return `Due in ${diffDays} days`
    return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInSeconds < 60) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInDays < 7) return `${diffInDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) {
      return
    }
    navigate(`/gigs/${item.id}`)
  }

  const techTags = [...(item.tools || []), ...(item.stack || [])]

  return (
    <article
      ref={trackRef}
      data-impression-type="gig"
      data-impression-id={item.id}
      onClick={handleClick}
      className={cn(
        'block hover:bg-muted/30 transition-colors cursor-pointer',
        showBorder && 'border-b border-border'
      )}
    >
      <div className="max-w-[600px] mx-auto px-4 py-3">
        {/* Gig Opportunity Indicator */}
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-sm mb-2 ml-[52px]">
          <Briefcase className="w-3.5 h-3.5" />
          <span className="font-medium">Gig opportunity</span>
        </div>

        <div className="flex gap-3">
          {/* Avatar */}
          <Link
            to={`/user/${item.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <Avatar className="w-10 h-10 hover:opacity-90 transition-opacity">
              <AvatarImage src={item.author.avatar_url} alt={item.author.name} />
              <AvatarFallback
                className={cn(
                  'text-white text-sm font-medium',
                  item.author.color || 'bg-gradient-to-br from-blue-500 to-indigo-600'
                )}
              >
                {item.author.initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1 min-w-0 mb-1">
              <Link
                to={`/user/${item.author.username}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-sm hover:underline truncate"
              >
                {item.author.name}
              </Link>
              {item.author.is_verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/20 flex-shrink-0" />
              )}
              {item.author.is_premium && <PremiumBadge />}
              <Link
                to={`/user/${item.author.username}`}
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground text-sm truncate"
              >
                @{item.author.username}
              </Link>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                {formatTimeAgo(item.created_at)}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-base mb-2">{item.title}</h3>

            {/* Description */}
            <div className="text-muted-foreground text-sm line-clamp-2 mb-3 [&_p]:mb-0 [&_h2]:text-sm [&_h3]:text-sm [&_strong]:font-semibold">
              <MarkdownContent content={item.content} className="prose-sm" hideFirstHeading />
            </div>

            {/* Tech Tags */}
            {techTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {techTags.slice(0, 5).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {tag}
                  </Badge>
                ))}
                {techTags.length > 5 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    +{techTags.length - 5}
                  </Badge>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>{formatBudget(item.budget_min, item.budget_max, item.currency)}</span>
              </div>

              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{item.bids_count} {item.bids_count === 1 ? 'bid' : 'bids'}</span>
              </div>

              {item.deadline && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDeadline(item.deadline)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
