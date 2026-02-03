import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tag {
    id: string
    name: string
    slug: string
    category?: string
}

interface SearchableTagSelectorProps {
    label: string
    icon?: React.ReactNode
    items: Tag[]
    selectedIds: string[]
    onToggle: (id: string) => void
    placeholder?: string
    maxHeight?: number
    groupByCategory?: boolean
}

export function SearchableTagSelector({
    label,
    icon,
    items,
    selectedIds,
    onToggle,
    placeholder = 'Search...',
    maxHeight = 280,
    groupByCategory = false,
}: SearchableTagSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [isExpanded, setIsExpanded] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Filter items based on search query
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items
        const query = searchQuery.toLowerCase()
        return items.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.slug.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query)
        )
    }, [items, searchQuery])

    // Group items by category if enabled
    const groupedItems = useMemo(() => {
        if (!groupByCategory) return { '': filteredItems }

        const groups: Record<string, Tag[]> = {}
        filteredItems.forEach((item) => {
            const category = item.category || 'Other'
            if (!groups[category]) groups[category] = []
            groups[category].push(item)
        })

        // Sort categories alphabetically
        return Object.fromEntries(
            Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
        )
    }, [filteredItems, groupByCategory])

    // Get selected items for the top section
    const selectedItems = useMemo(() => {
        return items.filter((item) => selectedIds.includes(item.id))
    }, [items, selectedIds])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsExpanded(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className="space-y-3">
            {/* Label */}
            <label className="text-sm font-semibold flex items-center gap-2">
                {icon && (
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        {icon}
                    </div>
                )}
                {label}
                {selectedIds.length > 0 && (
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                        {selectedIds.length} selected
                    </span>
                )}
            </label>

            {/* Selected Tags */}
            {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onToggle(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            {item.name}
                            <X className="w-3 h-3" />
                        </button>
                    ))}
                </div>
            )}

            {/* Search & Expand Toggle */}
            <div className="space-y-2">
                <button
                    onClick={() => {
                        setIsExpanded(!isExpanded)
                        if (!isExpanded) {
                            setTimeout(() => inputRef.current?.focus(), 100)
                        }
                    }}
                    className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all',
                        'bg-muted/50 border border-border/50 hover:bg-muted/80',
                        isExpanded && 'bg-muted border-border'
                    )}
                >
                    <span className="text-muted-foreground">
                        {isExpanded ? 'Click to collapse' : `Browse ${items.length} options...`}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={placeholder}
                                className={cn(
                                    'w-full h-10 pl-9 pr-8 rounded-lg text-sm',
                                    'bg-background border border-border',
                                    'placeholder:text-muted-foreground',
                                    'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
                                    'transition-all'
                                )}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Results Count */}
                        {searchQuery && (
                            <p className="text-xs text-muted-foreground px-1">
                                {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchQuery}"
                            </p>
                        )}

                        {/* Scrollable Tag List */}
                        <div
                            className="overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-muted/30"
                            style={{ maxHeight }}
                        >
                            {filteredItems.length === 0 ? (
                                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                    No results found
                                </div>
                            ) : groupByCategory ? (
                                <div className="divide-y divide-border/50">
                                    {Object.entries(groupedItems).map(([category, categoryItems]) => (
                                        <div key={category} className="p-3">
                                            {category && (
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                    {category}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
                                                {categoryItems.map((item) => {
                                                    const isSelected = selectedIds.includes(item.id)
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => onToggle(item.id)}
                                                            className={cn(
                                                                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                                                                isSelected
                                                                    ? 'bg-primary/15 text-primary border border-primary/30'
                                                                    : 'bg-background border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground'
                                                            )}
                                                        >
                                                            {isSelected && <Check className="w-3 h-3" />}
                                                            {item.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 flex flex-wrap gap-1.5">
                                    {filteredItems.map((item) => {
                                        const isSelected = selectedIds.includes(item.id)
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => onToggle(item.id)}
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                                                    isSelected
                                                        ? 'bg-primary/15 text-primary border border-primary/30'
                                                        : 'bg-background border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground'
                                                )}
                                            >
                                                {isSelected && <Check className="w-3 h-3" />}
                                                {item.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
