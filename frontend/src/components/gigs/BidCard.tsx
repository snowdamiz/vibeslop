import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, DollarSign, CheckCircle } from 'lucide-react'
import type { Bid } from '@/lib/api'

interface BidCardProps {
  bid: Bid
  onHire?: () => void
  canHire?: boolean
  showBorder?: boolean
}

export function BidCard({ bid, onHire, canHire, showBorder = true }: BidCardProps) {
  const formatAmount = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100)
  }

  const statusConfig = {
    pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
    accepted: { label: 'Accepted', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
    rejected: { label: 'Rejected', className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400' },
    withdrawn: { label: 'Withdrawn', className: 'bg-red-500/10 text-red-700 dark:text-red-400' }
  }

  const status = statusConfig[bid.status]

  return (
    <div
      className={cn(
        "hover:bg-muted/10 transition-colors",
        showBorder && "border-b border-border"
      )}
    >
      <div className="max-w-[600px] mx-auto px-4 py-6">
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-12">
            {bid.user.avatar_url && (
              <AvatarImage src={bid.user.avatar_url} alt={bid.user.display_name} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-medium">
              {bid.user.display_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{bid.user.display_name}</span>
                  <Badge variant="default" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">@{bid.user.username}</span>
                  {bid.user.developer_score !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      • Score: {bid.user.developer_score}
                    </span>
                  )}
                </div>
              </div>

              {canHire && bid.status === 'pending' && onHire && (
                <Button onClick={onHire} size="sm" className="ml-2">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Hire
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4 mb-3 text-sm">
              <div className="flex items-center gap-1 font-semibold text-primary">
                <DollarSign className="w-4 h-4" />
                <span>{formatAmount(bid.amount, bid.currency)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{bid.delivery_days} {bid.delivery_days === 1 ? 'day' : 'days'}</span>
              </div>
            </div>

            <p className="text-sm whitespace-pre-wrap">{bid.proposal}</p>

            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Bid placed {new Date(bid.inserted_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
