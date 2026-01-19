import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, TrendingUp, Sparkles, Heart, SlidersHorizontal, X } from 'lucide-react'
import { useExplore, aiTools, techStacks } from '@/context/ExploreContext'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// Backup mock trending data
const mockTrendingProjects = [
  { id: '1', title: 'AI Code Review Dashboard', author: 'sarahc', likes: 234, tag: 'Developer Tools' },
  { id: '2', title: 'Conversational Data Explorer', author: 'marcusj', likes: 189, tag: 'AI/ML' },
  { id: '3', title: 'Generative Art Studio', author: 'lunap', likes: 312, tag: 'Creative' },
]

const mockSuggestedUsers = [
  { username: 'marcusj', name: 'Marcus Johnson', initials: 'MJ', bio: 'Building AI tools' },
  { username: 'lunap', name: 'Luna Park', initials: 'LP', bio: 'Creative coding' },
  { username: 'alexr', name: 'Alex Rivera', initials: 'AR', bio: 'Full-stack dev' },
]

export function RightSidebar() {
  const location = useLocation()
  const isExplorePage = location.pathname === '/explore'
  const {
    searchQuery,
    setSearchQuery,
    selectedTools,
    setSelectedTools,
    selectedStacks,
    setSelectedStacks,
    showFilters,
    setShowFilters,
    toggleFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useExplore()

  const [trendingProjects, setTrendingProjects] = useState(mockTrendingProjects)
  const [suggestedUsers, setSuggestedUsers] = useState(mockSuggestedUsers)

  // Fetch trending projects
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await api.getProjects({
          sort_by: 'trending',
          limit: 3
        })
        
        if (response.data && response.data.length > 0) {
          const formatted = response.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            author: item.author?.username || 'unknown',
            likes: item.likes || 0,
            tag: item.tools?.[0] || 'Project'
          }))
          setTrendingProjects(formatted)
        }
      } catch (err) {
        console.error('Failed to fetch trending projects:', err)
        // Keep mock data on error
      }
    }

    fetchTrending()
  }, [])

  // For suggested users, we'd need a backend endpoint
  // For now, we keep the mock data

  return (
    <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-[340px] px-5 py-4 gap-5 overflow-y-auto border-l border-border/80">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "pl-10 bg-muted/50 border border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/30 rounded-xl h-11",
            isExplorePage ? "pr-11" : "pr-4"
          )}
        />
        {isExplorePage && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className={cn('w-4 h-4', (showFilters || hasActiveFilters) && 'text-primary')} />
          </Button>
        )}
      </div>

      {/* Filters Panel (only on Explore page) */}
      {isExplorePage && showFilters && (
        <section className="rounded-2xl bg-muted/30 border border-border/40 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-[15px] flex items-center gap-2">
              <SlidersHorizontal className="w-[18px] h-[18px] text-primary" />
              Filters
            </h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs px-2">
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="px-4 pb-4 space-y-4">
            {/* AI Tools */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                AI Tools
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {aiTools.map((tool) => (
                  <Badge
                    key={tool}
                    variant={selectedTools.includes(tool) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs py-1"
                    onClick={() => toggleFilter(tool, selectedTools, setSelectedTools)}
                  >
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {techStacks.map((stack) => (
                  <Badge
                    key={stack}
                    variant={selectedStacks.includes(stack) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs py-1"
                    onClick={() => toggleFilter(stack, selectedStacks, setSelectedStacks)}
                  >
                    {stack}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Active Filters (collapsed view, only on Explore page) */}
      {isExplorePage && hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {[...selectedTools, ...selectedStacks].map((filter) => (
            <Badge key={filter} variant="secondary" className="gap-1 text-xs py-1">
              {filter}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => {
                  setSelectedTools(selectedTools.filter((t) => t !== filter))
                  setSelectedStacks(selectedStacks.filter((s) => s !== filter))
                }}
              />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs px-2">
            Clear
          </Button>
        </div>
      )}

      {/* Trending Projects */}
      <section className="rounded-2xl bg-muted/30 border border-border/40 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <h3 className="font-semibold text-[15px] flex items-center gap-2">
            <TrendingUp className="w-[18px] h-[18px] text-primary" />
            Trending Projects
          </h3>
        </div>
        <div className="divide-y divide-border/30">
          {trendingProjects.map((project, index) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50"
            >
              <span className="text-[13px] font-semibold text-muted-foreground/70 w-5 text-center pt-0.5">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                  {project.tag}
                </span>
                <p className="font-medium text-[14px] leading-snug mt-0.5">
                  {project.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{project.likes.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-border/30">
          <Link
            to="/explore"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Show more
          </Link>
        </div>
      </section>

      {/* Who to Follow */}
      <section className="rounded-2xl bg-muted/30 border border-border/40 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <h3 className="font-semibold text-[15px] flex items-center gap-2">
            <Sparkles className="w-[18px] h-[18px] text-primary" />
            Who to Follow
          </h3>
        </div>
        <div className="divide-y divide-border/30">
          {suggestedUsers.map((user) => (
            <div key={user.username} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <Link to={`/user/${user.username}`}>
                <Avatar className="w-11 h-11 ring-2 ring-background">
                  <AvatarImage src={`https://i.pravatar.cc/150?img=${user.username?.charCodeAt(0) % 70 || 2}`} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/user/${user.username}`}
                  className="font-semibold text-[14px] hover:underline truncate block leading-tight"
                >
                  {user.name}
                </Link>
                <p className="text-[13px] text-muted-foreground truncate mt-0.5">@{user.username}</p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="rounded-full text-[13px] h-9 px-4 font-semibold border-border/60 hover:bg-foreground hover:text-background hover:border-foreground"
              >
                Follow
              </Button>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-border/30">
          <Link
            to="/explore"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Show more
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-auto pt-2 px-1">
        <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Vibeslop</p>
      </div>
    </aside>
  )
}
