import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { SuggestedUser } from '@/lib/api'

interface UseDebouncedSearchResult {
  search: (query: string) => void
  results: SuggestedUser[]
  isLoading: boolean
  error: string | null
}

/**
 * Hook for debounced user search with 300ms delay
 * @param delay - Debounce delay in milliseconds (default: 300)
 * @param limit - Maximum number of results (default: 10)
 */
export function useDebouncedSearch(delay: number = 300, limit: number = 10): UseDebouncedSearchResult {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SuggestedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
      try {
        const response = await api.searchUsers(query, { limit })
        setResults(response.data)
      } catch (err) {
        console.error('Search error:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [query, delay, limit])

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery)
  }, [])

  return {
    search,
    results,
    isLoading,
    error,
  }
}
