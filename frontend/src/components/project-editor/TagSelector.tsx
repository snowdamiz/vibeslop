import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface TagSelectorProps {
  selected: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

export function TagSelector({
  selected,
  onChange,
  suggestions,
  label,
  icon,
  disabled = false,
}: TagSelectorProps) {
  const [customValue, setCustomValue] = useState('')

  const toggleTag = (tag: string) => {
    if (disabled) return
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag))
    } else {
      onChange([...selected, tag])
    }
  }

  const addCustomTag = () => {
    if (disabled) return
    const trimmed = customValue.trim()
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed])
      setCustomValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomTag()
    }
  }

  // Tags that are selected but not in suggestions (custom tags)
  const customTags = selected.filter(tag => !suggestions.includes(tag))

  return (
    <div className={cn("space-y-3", disabled && "opacity-50")}>
      <label className="text-sm font-medium flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            disabled={disabled}
            className={cn(
              'text-sm px-3 py-1.5 rounded-lg transition-colors border',
              selected.includes(tag)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted text-foreground border-border',
              disabled && 'cursor-not-allowed'
            )}
          >
            {tag}
          </button>
        ))}
        {customTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            disabled={disabled}
            className={cn(
              "text-sm px-3 py-1.5 rounded-lg transition-colors border bg-primary text-primary-foreground border-primary flex items-center gap-1.5",
              disabled && 'cursor-not-allowed'
            )}
          >
            {tag}
            <X className="w-3 h-3" />
          </button>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2 max-w-xs">
          <Input
            placeholder="Add custom..."
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustomTag}
            disabled={!customValue.trim()}
            className="h-9 px-3"
          >
            Add
          </Button>
        </div>
      )}
    </div>
  )
}

// Common suggestions for reuse
export const AI_TOOLS_SUGGESTIONS = ['Cursor', 'Claude', 'GPT-4', 'v0', 'Bolt', 'Copilot', 'Replit AI', 'GitHub Copilot']
export const TECH_STACK_SUGGESTIONS = ['React', 'TypeScript', 'Node.js', 'Python', 'Next.js', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'Express', 'Vue', 'Angular', 'Django', 'FastAPI']
