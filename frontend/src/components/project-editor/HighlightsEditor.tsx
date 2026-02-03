import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X, Plus, Sparkles } from 'lucide-react'

interface HighlightsEditorProps {
  highlights: string[]
  onChange: (highlights: string[]) => void
  disabled?: boolean
}

export function HighlightsEditor({
  highlights,
  onChange,
  disabled = false,
}: HighlightsEditorProps) {
  const [newHighlight, setNewHighlight] = useState('')

  const addHighlight = () => {
    if (disabled) return
    const trimmed = newHighlight.trim()
    if (trimmed) {
      onChange([...highlights, trimmed])
      setNewHighlight('')
    }
  }

  const removeHighlight = (index: number) => {
    if (disabled) return
    onChange(highlights.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addHighlight()
    }
  }

  return (
    <div className={cn("space-y-3", disabled && "opacity-50")}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-muted-foreground" />
        Key Highlights
        {highlights.length > 0 && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {highlights.length}
          </span>
        )}
      </label>

      <div className="space-y-2">
        {highlights.map((highlight, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg group"
          >
            <span className="text-sm flex-1">{highlight}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeHighlight(idx)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <div className="flex gap-2">
            <Input
              placeholder="Add a key feature or highlight..."
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addHighlight}
              disabled={!newHighlight.trim()}
              className="h-9 px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
