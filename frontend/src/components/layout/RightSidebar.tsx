import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { TrendingUp, Sparkles, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, type SuggestedUser } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { SearchTypeahead } from '@/components/search'

// Helper to get initials from display name
function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function RightSidebar() {
  const { isAuthenticated } = useAuth()

  const [trendingProjects, setTrendingProjects] = useState<Array<{ id: string; title: string; author: string; likes: number; tag: string }>>([])
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set())
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingSuggested, setLoadingSuggested] = useState(true)

  // Fetch trending projects
  useEffect(() => {
    const fetchTrending = async () => {
      setLoadingTrending(true)
      try {
        const response = await api.getProjects({
          sort_by: 'trending',
          limit: 3
        })
        
        if (response.data && (response.data as unknown[]).length > 0) {
          // Backend returns: { id, title, author: { username }, likes, tools: string[] }
          const formatted = (response.data as Array<{ 
            id: string
            title: string
            author?: { username: string }
            likes?: number
            tools?: string[]
          }>).map((item) => ({
            id: item.id,
            title: item.title,
            author: item.author?.username || 'unknown',
            likes: item.likes || 0,
            tag: 'Project'
          }))
          
          setTrendingProjects(formatted)
        } else {
          // No data, show empty state
          setTrendingProjects([])
        }
      } catch (err) {
        console.error('Failed to fetch trending projects:', err)
        setTrendingProjects([])
      } finally {
        setLoadingTrending(false)
      }
    }

    fetchTrending()
  }, [])

  // Fetch suggested users
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      setLoadingSuggested(true)
      try {
        const response = await api.getSuggestedUsers({ limit: 3 })
        if (response.data && response.data.length > 0) {
          setSuggestedUsers(response.data)
        } else {
          setSuggestedUsers([])
        }
      } catch (err) {
        console.error('Failed to fetch suggested users:', err)
        setSuggestedUsers([])
      } finally {
        setLoadingSuggested(false)
      }
    }

    fetchSuggestedUsers()
  }, [])

  // Handle follow/unfollow
  const handleFollow = async (username: string) => {
    if (!isAuthenticated) {
      return
    }

    // Add to loading state
    setFollowLoading(prev => new Set(prev).add(username))

    try {
      const isFollowing = followingUsers.has(username)
      
      if (isFollowing) {
        await api.unfollowUser(username)
        setFollowingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(username)
          return newSet
        })
      } else {
        await api.followUser(username)
        setFollowingUsers(prev => new Set(prev).add(username))
      }
    } catch (err) {
      console.error('Failed to follow/unfollow user:', err)
    } finally {
      // Remove from loading state
      setFollowLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(username)
        return newSet
      })
    }
  }

  return (
    <aside className="hidden lg:block self-stretch w-[340px] border-l border-border/80">
      {/* Sticky inner wrapper */}
      <div className="sticky top-0 flex flex-col max-h-screen overflow-y-auto px-5 py-4 gap-5">
      {/* Search */}
      <SearchTypeahead />

      {/* Trending Projects */}
      <section className="rounded-2xl bg-muted/30 border border-border/40 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <h3 className="font-semibold text-[15px] flex items-center gap-2">
            <TrendingUp className="w-[18px] h-[18px] text-primary" />
            Trending Projects
          </h3>
        </div>
        <div className="divide-y divide-border/30">
          {loadingTrending ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : trendingProjects.length > 0 ? (
            trendingProjects.map((project, index) => (
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
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No trending projects yet
            </div>
          )}
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
          {loadingSuggested ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : suggestedUsers.length > 0 ? (
            suggestedUsers.map((user) => {
              const initials = getInitials(user.display_name)
              const isFollowing = followingUsers.has(user.username)
              const isLoading = followLoading.has(user.username)
              
              return (
                <div key={user.username} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <Link to={`/user/${user.username}`}>
                    <Avatar className="w-11 h-11 ring-2 ring-background">
                      {user.avatar_url && (
                        <AvatarImage src={user.avatar_url} alt={user.display_name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/user/${user.username}`}
                      className="font-semibold text-[14px] hover:underline truncate block leading-tight"
                    >
                      {user.display_name}
                    </Link>
                    <p className="text-[13px] text-muted-foreground truncate mt-0.5">@{user.username}</p>
                  </div>
                  {isAuthenticated && (
                    <Button 
                      size="sm" 
                      variant={isFollowing ? "default" : "outline"}
                      className={cn(
                        "rounded-full text-[13px] h-9 px-4 font-semibold",
                        isFollowing 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "border-border/60 hover:bg-foreground hover:text-background hover:border-foreground"
                      )}
                      onClick={() => handleFollow(user.username)}
                      disabled={isLoading}
                    >
                      {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  )}
                </div>
              )
            })
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No suggestions available
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="mt-auto pt-2 px-1">
        <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} hypevibe</p>
      </div>
      </div>
    </aside>
  )
}
