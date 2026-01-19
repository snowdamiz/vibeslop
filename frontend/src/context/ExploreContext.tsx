import { createContext, useContext, useState, type ReactNode } from 'react'

// Filter data
export const aiTools = ['Cursor', 'Claude', 'GPT-4', 'v0', 'Bolt', 'Copilot', 'Replit AI', 'Midjourney']
export const techStacks = ['React', 'Next.js', 'Vue', 'Svelte', 'Astro', 'Node.js', 'Python', 'Elixir']

export type SortOption = 'trending' | 'recent' | 'top'

interface ExploreContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedTools: string[]
  setSelectedTools: React.Dispatch<React.SetStateAction<string[]>>
  selectedStacks: string[]
  setSelectedStacks: React.Dispatch<React.SetStateAction<string[]>>
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  toggleFilter: (
    item: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => void
  clearAllFilters: () => void
  hasActiveFilters: boolean
}

const ExploreContext = createContext<ExploreContextType | null>(null)

export function ExploreProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedStacks, setSelectedStacks] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('trending')

  const toggleFilter = (
    item: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item))
    } else {
      setSelected([...selected, item])
    }
  }

  const clearAllFilters = () => {
    setSelectedTools([])
    setSelectedStacks([])
    setSearchQuery('')
  }

  const hasActiveFilters = selectedTools.length > 0 || selectedStacks.length > 0

  return (
    <ExploreContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        selectedTools,
        setSelectedTools,
        selectedStacks,
        setSelectedStacks,
        sortBy,
        setSortBy,
        showFilters,
        setShowFilters,
        toggleFilter,
        clearAllFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </ExploreContext.Provider>
  )
}

export function useExplore() {
  const context = useContext(ExploreContext)
  if (!context) {
    throw new Error('useExplore must be used within an ExploreProvider')
  }
  return context
}
