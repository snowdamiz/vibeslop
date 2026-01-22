import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Loader2, Briefcase, Search, SlidersHorizontal, DollarSign, ArrowUpDown, X } from 'lucide-react'
import { GigCard, GigPostForm, BidCard } from '@/components/gigs'
import { api, type Gig, type Bid } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type GigsTab = 'browse' | 'my-gigs' | 'my-bids'

export function Gigs() {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<GigsTab>('browse')
  const [gigs, setGigs] = useState<Gig[]>([])
  const [myGigs, setMyGigs] = useState<Gig[]>([])
  const [myBids, setMyBids] = useState<Bid[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [showFiltersDialog, setShowFiltersDialog] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Fetch gigs based on active tab
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        if (activeTab === 'browse') {
          const response = await api.getGigs({
            search: debouncedSearch || undefined,
            min_budget: minBudget ? parseInt(minBudget) * 100 : undefined,
            max_budget: maxBudget ? parseInt(maxBudget) * 100 : undefined,
            sort_by: sortBy,
            status: 'open'
          })
          setGigs(response.data)
        } else if (activeTab === 'my-gigs' && isAuthenticated) {
          const response = await api.getMyGigs()
          setMyGigs(response.data)
        } else if (activeTab === 'my-bids' && isAuthenticated) {
          const response = await api.getMyBids()
          setMyBids(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch gigs:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeTab, debouncedSearch, minBudget, maxBudget, sortBy, isAuthenticated])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePostGig = async (data: any) => {
    try {
      await api.createGig(data)
      // Refresh gigs
      if (activeTab === 'browse') {
        const response = await api.getGigs({ status: 'open' })
        setGigs(response.data)
      } else {
        setActiveTab('my-gigs')
        const response = await api.getMyGigs()
        setMyGigs(response.data)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      throw new Error(err.message || 'Failed to post gig')
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setMinBudget('')
    setMaxBudget('')
    setSortBy('newest')
  }

  const hasActiveFilters = search || minBudget || maxBudget || sortBy !== 'newest'

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'budget_high', label: 'Highest Budget' },
    { value: 'budget_low', label: 'Lowest Budget' },
    { value: 'bids', label: 'Most Bids' }
  ]

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md">
        <div className="max-w-[600px] mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-bold text-lg leading-tight">Vibe Gigs</h1>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'browse' && `${gigs.length} ${gigs.length === 1 ? 'gig' : 'gigs'}`}
                {activeTab === 'my-gigs' && `${myGigs.length} ${myGigs.length === 1 ? 'gig' : 'gigs'}`}
                {activeTab === 'my-bids' && `${myBids.length} ${myBids.length === 1 ? 'bid' : 'bids'}`}
              </p>
            </div>
          </div>
          {isAuthenticated && (
            <Button onClick={() => setShowPostForm(true)} size="sm" className="h-8 text-xs font-semibold px-3">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Post a Gig
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-border" />

      {/* Tabs */}
      <div className="max-w-[600px] mx-auto flex">
        <button
          onClick={() => setActiveTab('browse')}
          className={cn(
            'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
            activeTab === 'browse' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Browse Gigs
          {activeTab === 'browse' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
          )}
        </button>

        {isAuthenticated && (
          <>
            <button
              onClick={() => setActiveTab('my-gigs')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
                activeTab === 'my-gigs' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              My Gigs
              {activeTab === 'my-gigs' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('my-bids')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
                activeTab === 'my-bids' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              My Bids
              {activeTab === 'my-bids' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
              )}
            </button>
          </>
        )}
      </div>

      <div className="border-b border-border" />

      {/* Content */}
      <div className="py-6">
        {activeTab === 'browse' && (
          <div className="max-w-[600px] mx-auto px-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search gigs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-sm bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersDialog(true)}
                className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground relative"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div>
            {activeTab === 'browse' && (
              <>
                {gigs.length > 0 ? (
                  gigs.map((gig, index) => (
                    <GigCard
                      key={gig.id}
                      gig={gig}
                      showBorder={index !== gigs.length - 1}
                    />
                  ))
                ) : (
                  <div className="text-center py-16 px-4 max-w-[600px] mx-auto">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No gigs found</h3>
                    <p className="text-muted-foreground">
                      {hasActiveFilters
                        ? 'Try adjusting your filters or search terms'
                        : 'Be the first to post a gig and find talented vibe coders!'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        onClick={handleClearFilters}
                        className="mt-4"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'my-gigs' && (
              <>
                {myGigs.length > 0 ? (
                  myGigs.map((gig, index) => (
                    <GigCard
                      key={gig.id}
                      gig={gig}
                      showBorder={index !== myGigs.length - 1}
                    />
                  ))
                ) : (
                  <div className="text-center py-16 px-4 max-w-[600px] mx-auto">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No gigs posted yet</h3>
                    <p className="text-muted-foreground">
                      Post your first gig and connect with talented freelancers.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'my-bids' && (
              <>
                {myBids.length > 0 ? (
                  myBids.map((bid, index) => (
                    <div key={bid.id}>
                      {bid.gig && (
                        <GigCard
                          gig={bid.gig}
                          showBorder={false} // Gig card in bid view usually doesn't need border if bid card follows
                        />
                      )}
                      <BidCard
                        bid={bid}
                        showBorder={index !== myBids.length - 1}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 px-4 max-w-[600px] mx-auto">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No bids submitted yet</h3>
                    <p className="text-muted-foreground">
                      Browse open gigs and submit your first bid.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters Dialog */}
      <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
        <DialogContent className="sm:max-w-[450px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
              </div>
              <DialogTitle>Filter Gigs</DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-8">
            {/* Sorting Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <Label className="text-sm font-semibold">Sort By</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={cn(
                      "flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-medium border transition-all",
                      sortBy === option.value
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Range Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Label className="text-sm font-semibold">Budget Range (USD)</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="min-budget" className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Min</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="min-budget"
                      type="number"
                      placeholder="0"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                      className="pl-7 h-11 bg-muted/20 border-border focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-budget" className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Max</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="max-budget"
                      type="number"
                      placeholder="Any"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                      className="pl-7 h-11 bg-muted/20 border-border focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/30 border-t border-border flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1 h-11 rounded-xl font-semibold text-muted-foreground hover:text-foreground border-border"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <Button
              onClick={() => setShowFiltersDialog(false)}
              className="flex-[1.5] h-11 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg shadow-primary/20"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Gig Form Modal */}
      <GigPostForm
        isOpen={showPostForm}
        onClose={() => setShowPostForm(false)}
        onSubmit={handlePostGig}
      />
    </div >
  )
}
