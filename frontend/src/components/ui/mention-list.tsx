import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { SuggestedUser } from '@/lib/api'

export interface MentionListProps {
  items: SuggestedUser[]
  command: (item: { id: string; label: string }) => void
  isLoading?: boolean
}

export type MentionListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command, isLoading }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Reset selected index when items change
    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) {
        command({ id: item.username, label: item.username })
      }
    }

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length)
    }

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length)
    }

    const enterHandler = () => {
      selectItem(selectedIndex)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler()
          return true
        }

        if (event.key === 'ArrowDown') {
          downHandler()
          return true
        }

        if (event.key === 'Enter') {
          enterHandler()
          return true
        }

        return false
      },
    }))

    if (isLoading) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[240px]">
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Searching...
          </div>
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[240px]">
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No users found
          </div>
        </div>
      )
    }

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[240px] max-h-[300px] overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => selectItem(index)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            )}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={item.avatar_url} alt={item.display_name} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                {item.display_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {item.display_name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                @{item.username}
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
