import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Star, GitFork, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description?: string
  owner: {
    login: string
    avatar_url: string
  }
  html_url: string
  private: boolean
  stargazers_count: number
  language?: string
  pushed_at: string
  created_at: string
  updated_at: string
}

interface RepoSelectorProps {
  repos: GitHubRepo[]
  loading: boolean
  onSelect: (repo: GitHubRepo) => void
  selectedRepo?: GitHubRepo
}

export function RepoSelector({ repos, loading, onSelect, selectedRepo }: RepoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  // Calculate items per page based on viewport height (stable, not content-dependent)
  const itemsPerPage = useMemo(() => {
    // Dialog max-height is 90vh, account for fixed elements:
    // - Dialog header: ~60px
    // - Description text: ~40px
    // - Search input + margin: ~56px
    // - Pagination: ~52px
    // - Footer buttons: ~72px
    // - Dialog padding/borders: ~48px
    const fixedHeight = 328
    
    // Each repo item is ~110px (accounts for items with 2-line descriptions + gap)
    const itemHeight = 110
    
    // Calculate available height for repo list
    const dialogMaxHeight = window.innerHeight * 0.9
    const availableHeight = dialogMaxHeight - fixedHeight
    
    // Calculate how many items fit
    const calculatedItems = Math.floor(availableHeight / itemHeight)
    
    // Ensure at least 3 items, max 6 items
    return Math.max(3, Math.min(6, calculatedItems))
  }, [])

  // Filter repos based on search query
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repos

    const query = searchQuery.toLowerCase()
    return repos.filter(repo =>
      repo.name.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      repo.language?.toLowerCase().includes(query)
    )
  }, [repos, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredRepos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRepos = filteredRepos.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-muted rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (repos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No repositories found. Make sure your GitHub account has public repositories.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-4 flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Repository List */}
      <div className="flex-1 space-y-2 min-h-0 overflow-y-auto">
        {paginatedRepos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No repositories match your search.
          </div>
        ) : (
          paginatedRepos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className={cn(
                'w-full text-left border border-border rounded-lg p-4 hover:bg-muted/50 transition-all',
                selectedRepo?.id === repo.id && 'bg-primary/10 border-primary'
              )}
            >
              <div className="flex items-start gap-3">
                <img
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  className="w-10 h-10 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">{repo.name}</h4>
                    {repo.private && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/20">
                        Private
                      </span>
                    )}
                  </div>
                  
                  {repo.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {repo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {repo.stargazers_count}
                    </span>
                    <span>Updated {formatDate(repo.pushed_at)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-border flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredRepos.length)} of {filteredRepos.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
