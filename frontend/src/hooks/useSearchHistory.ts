import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'onvibe_recent_searches'
const MAX_HISTORY_ITEMS = 10

export interface SearchHistoryItem {
  query: string
  timestamp: number
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load search history:', error)
      return []
    }
  })
  const historyRef = useRef<SearchHistoryItem[]>(history)

  // Keep ref in sync with state
  useEffect(() => {
    historyRef.current = history
  }, [history])

  // Save history to localStorage
  const saveToStorage = useCallback((newHistory: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }, [])

  // Add a search query to history - stable function that doesn't depend on history state
  const addSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    const currentHistory = historyRef.current
    const newHistory = [
      { query: trimmedQuery, timestamp: Date.now() },
      ...currentHistory.filter(item => item.query !== trimmedQuery)
    ].slice(0, MAX_HISTORY_ITEMS)

    historyRef.current = newHistory
    setHistory(newHistory)
    saveToStorage(newHistory)
  }, [saveToStorage])

  // Remove a specific search from history
  const removeSearch = useCallback((query: string) => {
    const currentHistory = historyRef.current
    const newHistory = currentHistory.filter(item => item.query !== query)
    historyRef.current = newHistory
    setHistory(newHistory)
    saveToStorage(newHistory)
  }, [saveToStorage])

  // Clear all search history
  const clearHistory = useCallback(() => {
    historyRef.current = []
    setHistory([])
    saveToStorage([])
  }, [saveToStorage])

  return {
    history,
    addSearch,
    removeSearch,
    clearHistory
  }
}
