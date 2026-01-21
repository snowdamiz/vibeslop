import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Search, Clock, TrendingUp, X, ArrowRight, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, type SuggestedUser } from '@/lib/api'
import { useSearchHistory } from '@/hooks/useSearchHistory'

interface SearchTypeaheadProps {
  className?: string
  onFocus?: () => void
  onBlur?: () => void
}

interface Suggestion {
  users: SuggestedUser[]
  projects: Array<{
    id: string
    title: string
    image_url?: string
    user: {
      username: string
      display_name: string
    }
  }>
  posts: Array<{
    id: string
    content: string
    user: {
      username: string
      display_name: string
    }
  }>
}

export function SearchTypeahead({ className, onFocus, onBlur }: SearchTypeaheadProps) {
  const navigate = useNavigate()
  const { history, addSearch, removeSearch } = useSearchHistory()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion>({ users: [], projects: [], posts: [] })
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Fetch suggestions with debouncing
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions({ users: [], projects: [], posts: [] })
      return
    }

    setIsLoading(true)
    try {
      const response = await api.searchSuggestions(searchQuery, 5)
      setSuggestions(response.data)
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSuggestions({ users: [], projects: [], posts: [] })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce search queries
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
    } else {
      setSuggestions({ users: [], projects: [], posts: [] })
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, fetchSuggestions])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      addSearch(searchQuery)
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      setIsFocused(false)
      setQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch(query)
    } else if (e.key === 'Escape') {
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleInputFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleInputBlur = () => {
    // Small delay to allow clicking dropdown items
    setTimeout(() => {
      onBlur?.()
    }, 200)
  }

  const showDropdown = isFocused && (history.length > 0 || suggestions.users.length > 0 || suggestions.projects.length > 0 || suggestions.posts.length > 0 || query.trim())

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-4 bg-muted/50 border border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/30 rounded-xl h-11"
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50 max-h-[400px] overflow-y-auto"
        >
          {/* Recent Searches */}
          {!query.trim() && history.length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Recent</span>
                <button
                  onClick={() => history.forEach(item => removeSearch(item.query))}
                  className="text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
              {history.slice(0, 5).map((item) => (
                <button
                  key={item.query}
                  onClick={() => handleSearch(item.query)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{item.query}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSearch(item.query)
                    }}
                    className="p-1 hover:bg-muted rounded-full"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Loading State */}
          {isLoading && query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}

          {/* User Suggestions */}
          {!isLoading && suggestions.users.length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                People
              </div>
              {suggestions.users.map((user) => {
                const initials = user.display_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      navigate(`/user/${user.username}`)
                      setIsFocused(false)
                      setQuery('')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-9 h-9 ring-2 ring-background flex-shrink-0">
                      {user.avatar_url && (
                        <AvatarImage src={user.avatar_url} alt={user.display_name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-sm truncate">{user.display_name}</div>
                      <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Project Suggestions */}
          {!isLoading && suggestions.projects.length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                Projects
              </div>
              {suggestions.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    navigate(`/project/${project.id}`)
                    setIsFocused(false)
                    setQuery('')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt=""
                      className="w-9 h-9 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-sm truncate">{project.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      by {project.user.display_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Post Suggestions */}
          {!isLoading && suggestions.posts.length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                Posts
              </div>
              {suggestions.posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => {
                    navigate(`/post/${post.id}`)
                    setIsFocused(false)
                    setQuery('')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm truncate line-clamp-2">{post.content}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      by {post.user.display_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search for query option */}
          {query.trim() && (
            <button
              onClick={() => handleSearch(query)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-primary"
            >
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm text-left">
                Search for "<span className="font-semibold">{query}</span>"
              </span>
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </button>
          )}

          {/* No results */}
          {!isLoading && query.trim() && suggestions.users.length === 0 && suggestions.projects.length === 0 && suggestions.posts.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
