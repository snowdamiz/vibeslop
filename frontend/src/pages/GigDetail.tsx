import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

import {
  Loader2,
  ArrowLeft,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  FileText,
  Gavel,
  Star,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { GigStatusBadge, BidForm, BidCard, ReviewForm, ReviewCard } from '@/components/gigs'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { api, type Gig, type Bid, type GigReview } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

type GigTab = 'details' | 'bids' | 'reviews'

export function GigDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [gig, setGig] = useState<Gig | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [reviews, setReviews] = useState<GigReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBidForm, setShowBidForm] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<GigTab>('details')

  const isOwner = user && gig && user.id === gig.user.id
  const isHiredFreelancer = user && gig?.hired_bid && user.id === gig.hired_bid.user.id
  const canBid = isAuthenticated && !isOwner && gig?.status === 'open'
  const canComplete = isOwner && gig?.status === 'in_progress'
  const canReview = gig?.status === 'completed' && (isOwner || isHiredFreelancer)

  useEffect(() => {
    const fetchGigDetails = async () => {
      if (!id) return

      setIsLoading(true)
      setError('')

      try {
        const [gigRes, reviewsRes] = await Promise.all([
          api.getGig(id),
          api.getGigReviews(id)
        ])

        setGig(gigRes.data)
        setReviews(reviewsRes.data)

        // Fetch bids if authenticated
        if (isAuthenticated) {
          try {
            const bidsRes = await api.getGigBids(id)
            setBids(bidsRes.data)
          } catch (err) {
            // User might not have permission to see all bids
            console.error('Failed to fetch bids:', err)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message || 'Failed to load gig')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGigDetails()
  }, [id, isAuthenticated])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlaceBid = async (bidData: any) => {
    if (!id) return
    try {
      await api.placeBid(id, bidData)
      // Refresh bids
      const bidsRes = await api.getGigBids(id)
      setBids(bidsRes.data)
      // Refresh gig to update bids count
      const gigRes = await api.getGig(id)
      setGig(gigRes.data)
      // Switch to bids tab to show the new bid
      setActiveTab('bids')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      throw new Error(err.message || 'Failed to place bid')
    }
  }

  const handleHireBidder = async (bidId: string) => {
    if (!id) return
    try {
      const response = await api.hireForGig(id, bidId)
      setGig(response.data)
      // Refresh bids to show updated statuses
      const bidsRes = await api.getGigBids(id)
      setBids(bidsRes.data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(err.message || 'Failed to hire bidder')
    }
  }

  const handleCompleteGig = async () => {
    if (!id) return
    try {
      const response = await api.completeGig(id)
      setGig(response.data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(err.message || 'Failed to complete gig')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmitReview = async (reviewData: any) => {
    if (!id) return
    try {
      await api.createGigReview(id, reviewData)
      // Refresh reviews
      const reviewsRes = await api.getGigReviews(id)
      setReviews(reviewsRes.data)
      // Switch to reviews tab
      setActiveTab('reviews')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      throw new Error(err.message || 'Failed to submit review')
    }
  }

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Failed to load gig</h2>
          <p className="text-muted-foreground mb-4">{error || 'Gig not found'}</p>
          <Button onClick={() => navigate('/gigs')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Gigs
          </Button>
        </div>
      </div>
    )
  }

  const reviewType = isOwner ? 'client' : 'freelancer'
  const hasReviewed = reviews.some(r => r.reviewer.id === user?.id)

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex items-center gap-4 px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate('/gigs')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg leading-tight">Gig Details</h1>
            <p className="text-xs text-muted-foreground">{gig.bids_count} {gig.bids_count === 1 ? 'bid' : 'bids'}</p>
          </div>
        </div>
      </div>

      {/* Gig Info Bar */}
      <div className="max-w-[600px] mx-auto px-4 py-5">
        {/* Primary Row: Avatar + Title + Status + Actions */}
        <div className="flex items-start gap-4">
          {/* Poster Avatar */}
          <Link to={`/user/${gig.user.username}`}>
            <Avatar className="w-[72px] h-[72px] flex-shrink-0">
              {gig.user.avatar_url && (
                <AvatarImage src={gig.user.avatar_url} alt={gig.user.display_name} className="object-cover" />
              )}
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xl font-semibold">
                {gig.user.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Title + Meta */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h2 className="text-lg font-bold leading-tight line-clamp-2">{gig.title}</h2>

            {/* Poster + Stats Row */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
              <Link to={`/user/${gig.user.username}`} className="hover:underline font-medium text-foreground">
                {gig.user.display_name}
              </Link>
              <span className="text-muted-foreground/50">·</span>
              <span>@{gig.user.username}</span>
              <span className="text-muted-foreground/50">·</span>
              <GigStatusBadge status={gig.status} />
            </div>

            {/* Meta Info Row */}
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                {formatBudget(gig.budget_min, gig.budget_max, gig.currency)}
              </span>
              {gig.deadline && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Due {formatDate(gig.deadline)}
                  </span>
                </>
              )}
              <span className="text-muted-foreground/50">·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Posted {formatDate(gig.inserted_at)}
              </span>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {canComplete && (
              <Button onClick={handleCompleteGig} size="sm" className="rounded-full">
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
            {canBid && (
              <Button onClick={() => setShowBidForm(true)} className="rounded-full">
                Place Bid
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="flex sm:hidden items-center gap-2 mt-4">
          {canComplete && (
            <Button onClick={handleCompleteGig} className="flex-1 rounded-full">
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark Complete
            </Button>
          )}
          {canBid && (
            <Button onClick={() => setShowBidForm(true)} className="flex-1 rounded-full">
              Place a Bid
            </Button>
          )}
          {!canBid && !canComplete && (
            <Link to={`/user/${gig.user.username}`} className="flex-1">
              <Button variant="outline" className="w-full rounded-full">
                <ExternalLink className="w-4 h-4 mr-1" />
                View Profile
              </Button>
            </Link>
          )}
        </div>


      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-10 bg-background border-b border-border">
        <div className="max-w-[600px] mx-auto flex">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'details' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <FileText className="w-4 h-4" />
            Details
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'bids' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Gavel className="w-4 h-4" />
            Bids
            {bids.length > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{bids.length}</span>
            )}
            {activeTab === 'bids' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'reviews' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Star className="w-4 h-4" />
            Reviews
            {reviews.length > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{reviews.length}</span>
            )}
            {activeTab === 'reviews' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[600px] mx-auto">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="px-4 py-6">
            {/* Description */}
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
              <MarkdownContent content={gig.description} />
            </div>

            {/* Hired Freelancer Card */}
            {gig.hired_bid && (
              <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Freelancer Hired</p>
                    <Link
                      to={`/user/${gig.hired_bid.user.username}`}
                      className="text-sm text-primary hover:underline"
                    >
                      @{gig.hired_bid.user.username}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatBudget(gig.hired_bid.amount, undefined, gig.currency)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bids Tab */}
        {activeTab === 'bids' && (
          <div className="px-4 py-6">
            {isOwner && bids.length > 0 ? (
              <div>
                {bids.map((bid, index) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    onHire={() => handleHireBidder(bid.id)}
                    canHire={gig.status === 'open'}
                    showBorder={index !== bids.length - 1}
                  />
                ))}
              </div>
            ) : isOwner ? (
              <div className="text-center py-16">
                <Gavel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No bids yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Freelancers will appear here when they bid on your gig
                </p>
              </div>
            ) : canBid ? (
              <div className="text-center py-16">
                <Gavel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Be the first to bid!</p>
                <Button onClick={() => setShowBidForm(true)} className="rounded-full">
                  Place Your Bid
                </Button>
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {gig.bids_count} {gig.bids_count === 1 ? 'freelancer has' : 'freelancers have'} bid on this gig
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="px-4 py-6">
            {/* Leave Review CTA */}
            {canReview && !hasReviewed && (
              <div className="mb-6 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Share your experience</p>
                    <p className="text-sm text-muted-foreground">
                      Leave a review for this completed gig
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowReviewForm(true)}
                    variant="outline"
                    className="rounded-full"
                  >
                    Review
                  </Button>
                </div>
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No reviews yet</p>
                {gig.status !== 'completed' && (
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Reviews will be available after the gig is completed
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <BidForm
        isOpen={showBidForm}
        onClose={() => setShowBidForm(false)}
        onSubmit={handlePlaceBid}
      />

      <ReviewForm
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        onSubmit={handleSubmitReview}
        reviewType={reviewType}
      />
    </div>
  )
}
