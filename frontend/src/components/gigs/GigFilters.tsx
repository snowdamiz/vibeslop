import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface GigFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  minBudget: string
  onMinBudgetChange: (value: string) => void
  maxBudget: string
  onMaxBudgetChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  onClearFilters: () => void
}

export function GigFilters({
  search,
  onSearchChange,
  minBudget,
  onMinBudgetChange,
  maxBudget,
  onMaxBudgetChange,
  sortBy,
  onSortByChange,
  onClearFilters
}: GigFiltersProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-8 px-2 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          type="text"
          placeholder="Search gigs..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Budget Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minBudget}
            onChange={(e) => onMinBudgetChange(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxBudget}
            onChange={(e) => onMaxBudgetChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sort">Sort By</Label>
        <select
          id="sort"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
        >
          <option value="newest">Newest First</option>
          <option value="budget_high">Highest Budget</option>
          <option value="budget_low">Lowest Budget</option>
          <option value="bids">Most Bids</option>
        </select>
      </div>
    </div>
  )
}
