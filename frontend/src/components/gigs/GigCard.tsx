import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

import { Clock, DollarSign, Users } from 'lucide-react'
import { GigStatusBadge } from './GigStatusBadge'
import { MarkdownContent } from '@/components/ui/markdown-content'
import type { Gig } from '@/lib/api'

interface GigCardProps {
  gig: Gig
  showBorder?: boolean
}

export function GigCard({ gig, showBorder = true }: GigCardProps) {
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

  return (
    <Link to={`/gigs/${gig.id}`}>
      <div
        className={cn(
          "hover:bg-muted/30 transition-colors cursor-pointer",
          showBorder && "border-b border-border"
        )}
      >
        <div className="max-w-[600px] mx-auto px-4 py-6">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              {gig.user.avatar_url && (
                <AvatarImage src={gig.user.avatar_url} alt={gig.user.display_name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-medium">
                {gig.user.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{gig.user.display_name}</span>
                <span className="text-muted-foreground text-sm">@{gig.user.username}</span>
                <GigStatusBadge status={gig.status} />
              </div>

              <h3 className="font-semibold text-lg mb-2">{gig.title}</h3>

              <div className="text-muted-foreground text-sm line-clamp-2 mb-3 [&_p]:mb-0 [&_h2]:text-sm [&_h3]:text-sm [&_strong]:font-semibold">
                <MarkdownContent content={gig.description} className="prose-sm" hideFirstHeading />
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatBudget(gig.budget_min, gig.budget_max, gig.currency)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{gig.bids_count} {gig.bids_count === 1 ? 'bid' : 'bids'}</span>
                </div>

                {gig.deadline && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDeadline(gig.deadline)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
