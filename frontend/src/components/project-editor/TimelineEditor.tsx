import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Calendar, Clock, Plus, Trash2 } from 'lucide-react'

export interface TimelineEntry {
  date: string
  title: string
  description: string
}

interface TimelineEditorProps {
  timeline: TimelineEntry[]
  onChange: (timeline: TimelineEntry[]) => void
  disabled?: boolean
}

export function TimelineEditor({
  timeline,
  onChange,
  disabled = false,
}: TimelineEditorProps) {
  const addEntry = () => {
    if (disabled) return
    onChange([...timeline, { date: '', title: '', description: '' }])
  }

  const updateEntry = (index: number, field: keyof TimelineEntry, value: string) => {
    if (disabled) return
    onChange(
      timeline.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    )
  }

  const removeEntry = (index: number) => {
    if (disabled) return
    onChange(timeline.filter((_, i) => i !== index))
  }

  return (
    <div className={cn("space-y-3", disabled && "opacity-50")}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        Build Timeline
        {timeline.length > 0 && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {timeline.length}
          </span>
        )}
      </label>

      <div className="space-y-3">
        {timeline.map((entry, idx) => (
          <div
            key={idx}
            className="p-3 bg-muted/20 rounded-lg border border-border space-y-2.5"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Date (e.g., Week 1, Jan 2024)"
                  value={entry.date}
                  onChange={(e) => updateEntry(idx, 'date', e.target.value)}
                  disabled={disabled}
                  className="h-9 pl-9 text-sm"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <Input
              placeholder="Milestone title"
              value={entry.title}
              onChange={(e) => updateEntry(idx, 'title', e.target.value)}
              disabled={disabled}
              className="h-9 text-sm font-medium"
            />
            <Input
              placeholder="Description (optional)"
              value={entry.description}
              onChange={(e) => updateEntry(idx, 'description', e.target.value)}
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
        ))}

        {!disabled && (
          <button
            type="button"
            onClick={addEntry}
            className="w-full h-9 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Timeline Entry
          </button>
        )}
      </div>
    </div>
  )
}
