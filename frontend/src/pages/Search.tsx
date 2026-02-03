import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search as SearchIcon, ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, type SuggestedUser } from '@/lib/api'
import { UserResultCard, ProjectResultCard, PostResultCard, GigResultCard, AdvancedSearchModal } from '@/components/search'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import type { FeedItem } from '@/components/feed/types'

type SearchTab = 'top' | 'people' | 'projects' | 'posts' | 'gigs'

interface TopResults {
  users: SuggestedUser[]
  projects: Array<FeedItem & { type: 'project' }>
  posts: Array<FeedItem & { type: 'update' }>
  gigs: any[]
}

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addSearch } = useSearchHistory()

  const queryParam = searchParams.get('q') || ''
  const typeParam = (searchParams.get('type') || 'top') as SearchTab

  const [query, setQuery] = useState(queryParam)
  const [activeTab, setActiveTab] = useState<SearchTab>(typeParam)
  const [isLoading, setIsLoading] = useState(false)
  const [topResults, setTopResults] = useState<TopResults>({ users: [], projects: [], posts: [], gigs: [] })
  const [peopleResults, setPeopleResults] = useState<SuggestedUser[]>([])
  const [projectResults, setProjectResults] = useState<Array<FeedItem & { type: 'project' }>>([])
  const [postResults, setPostResults] = useState<Array<FeedItem & { type: 'update' }>>([])
  const [gigResults, setGigResults] = useState<any[]>([])
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

  // Track the last query we added to history to avoid duplicates
  const lastAddedQueryRef = useRef<string>('')

  // Perform search when query or tab changes
  useEffect(() => {
    const performSearch = async () => {
      if (!queryParam) {
        setTopResults({ users: [], projects: [], posts: [], gigs: [] })
        setPeopleResults([])
        setProjectResults([])
        setPostResults([])
        setGigResults([])
        return
      }

      setIsLoading(true)

      try {
        const response = await api.search({
          q: queryParam,
          type: activeTab,
          limit: 20
        })

        if (activeTab === 'top') {
          const data = response.data as TopResults
          setTopResults(data)
        } else if (activeTab === 'people') {
          setPeopleResults(response.data as SuggestedUser[])
        } else if (activeTab === 'projects') {
          setProjectResults(response.data as Array<FeedItem & { type: 'project' }>)
        } else if (activeTab === 'posts') {
          setPostResults(response.data as Array<FeedItem & { type: 'update' }>)
        } else if (activeTab === 'gigs') {
          setGigResults(response.data as any[])
        }

        // Add to search history only once per unique query
        if (queryParam !== lastAddedQueryRef.current) {
          lastAddedQueryRef.current = queryParam
          addSearch(queryParam)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [queryParam, activeTab, addSearch])

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchParams({ q: query.trim(), type: activeTab })
    }
  }

  // Handle tab change
  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab)
    if (queryParam) {
      setSearchParams({ q: queryParam, type: tab })
    }
  }

  const hasResults = activeTab === 'top'
    ? topResults.users.length > 0 || topResults.projects.length > 0 || topResults.posts.length > 0 || topResults.gigs.length > 0
    : activeTab === 'people'
      ? peopleResults.length > 0
      : activeTab === 'projects'
        ? projectResults.length > 0
        : activeTab === 'posts'
          ? postResults.length > 0
          : gigResults.length > 0

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <div className="sticky top-4 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto px-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for people, projects, posts, or gigs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-4 bg-muted/50 border border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/30 rounded-xl h-10"
                  autoFocus
                />
              </div>
            </form>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowAdvancedSearch(true)}
              title="Advanced search"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex">
            {(['top', 'people', 'projects', 'posts', 'gigs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
                  activeTab === tab ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-[600px] mx-auto mt-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !queryParam ? (
          <div className="text-center py-12 px-4">
            <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Search Onvibe</h3>
            <p className="text-muted-foreground">
              Find people, projects, posts, and gigs
            </p>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-12 px-4">
            <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              Try searching for something else
            </p>
          </div>
        ) : (
          <div>
            {activeTab === 'top' && (
              <>
                {topResults.users.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-muted-foreground px-4 py-2">
                      People
                    </h2>
                    {topResults.users.map((user) => (
                      <UserResultCard key={user.id} user={user} />
                    ))}
                  </div>
                )}

                {topResults.projects.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-muted-foreground px-4 py-2">
                      Projects
                    </h2>
                    {topResults.projects.map((project) => (
                      <ProjectResultCard key={project.id} project={project} />
                    ))}
                  </div>
                )}

                {topResults.posts.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-muted-foreground px-4 py-2">
                      Posts
                    </h2>
                    {topResults.posts.map((post) => (
                      <PostResultCard key={post.id} post={post} />
                    ))}
                  </div>
                )}

                {topResults.gigs.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-muted-foreground px-4 py-2">
                      Gigs
                    </h2>
                    {topResults.gigs.map((gig) => (
                      <GigResultCard key={gig.id} gig={gig} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'people' && peopleResults.map((user) => (
              <UserResultCard key={user.id} user={user} />
            ))}

            {activeTab === 'projects' && projectResults.map((project) => (
              <ProjectResultCard key={project.id} project={project} />
            ))}

            {activeTab === 'posts' && postResults.map((post) => (
              <PostResultCard key={post.id} post={post} />
            ))}

            {activeTab === 'gigs' && gigResults.map((gig) => (
              <GigResultCard key={gig.id} gig={gig} />
            ))}
          </div>
        )}
      </div>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
      />
    </div>
  )
}
