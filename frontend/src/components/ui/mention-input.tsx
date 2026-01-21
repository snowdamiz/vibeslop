import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'

interface MentionInputProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

interface MentionState {
  show: boolean
  query: string
  position: { top: number; left: number }
  startIndex: number
  selectedIndex: number
}

export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [mentionState, setMentionState] = useState<MentionState>({
      show: false,
      query: '',
      position: { top: 0, left: 0 },
      startIndex: -1,
      selectedIndex: 0,
    })

    const { search, results, isLoading } = useDebouncedSearch()

    // Expose textarea ref to parent
    useImperativeHandle(ref, () => textareaRef.current!)

    // Search for users when mention query changes
    useEffect(() => {
      if (mentionState.show && mentionState.query) {
        search(mentionState.query)
      }
    }, [mentionState.query, mentionState.show, search])

    // Reset selected index when results change
    useEffect(() => {
      if (mentionState.selectedIndex !== 0) {
        setTimeout(() => setMentionState(prev => ({ ...prev, selectedIndex: 0 })), 0)
      }
    }, [results, mentionState.selectedIndex])

    // Calculate cursor position for dropdown
    const getCursorPosition = (textarea: HTMLTextAreaElement, caretPos: number) => {
      const div = document.createElement('div')
      const style = getComputedStyle(textarea)

      // Copy textarea styles to div
      Array.from(style).forEach(prop => {
        div.style.setProperty(prop, style.getPropertyValue(prop))
      })

      div.style.position = 'absolute'
      div.style.visibility = 'hidden'
      div.style.whiteSpace = 'pre-wrap'
      div.style.wordWrap = 'break-word'
      div.textContent = textarea.value.substring(0, caretPos)

      const span = document.createElement('span')
      span.textContent = textarea.value.substring(caretPos) || '.'
      div.appendChild(span)

      document.body.appendChild(div)

      const textareaRect = textarea.getBoundingClientRect()
      const spanRect = span.getBoundingClientRect()

      document.body.removeChild(div)

      return {
        top: spanRect.top - textareaRect.top + textarea.scrollTop + 20,
        left: spanRect.left - textareaRect.left + textarea.scrollLeft,
      }
    }

    // Handle text input
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPos = e.target.selectionStart

      onChange(newValue)

      // Check for @ mention trigger
      const textBeforeCursor = newValue.substring(0, cursorPos)
      const atMatch = textBeforeCursor.match(/@(\w*)$/)

      if (atMatch) {
        const position = getCursorPosition(e.target, cursorPos)
        setMentionState({
          show: true,
          query: atMatch[1],
          position,
          startIndex: cursorPos - atMatch[0].length,
          selectedIndex: 0,
        })
      } else {
        setMentionState(prev => ({ ...prev, show: false }))
      }
    }

    // Handle mention selection
    const selectMention = (username: string) => {
      if (!textareaRef.current) return

      const before = value.substring(0, mentionState.startIndex)
      const after = value.substring(textareaRef.current.selectionStart)
      const newValue = `${before}@${username} ${after}`

      onChange(newValue)

      // Set cursor position after mention
      const newCursorPos = mentionState.startIndex + username.length + 2
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)

      setMentionState(prev => ({ ...prev, show: false }))
    }

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mentionState.show) {
        props.onKeyDown?.(e)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % results.length,
        }))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + results.length - 1) % results.length,
        }))
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        const selectedUser = results[mentionState.selectedIndex]
        if (selectedUser) {
          selectMention(selectedUser.username)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setMentionState(prev => ({ ...prev, show: false }))
      } else {
        props.onKeyDown?.(e)
      }
    }

    // Handle click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          textareaRef.current &&
          !textareaRef.current.contains(event.target as Node)
        ) {
          setMentionState(prev => ({ ...prev, show: false }))
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full bg-muted rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all',
            className
          )}
          {...props}
        />

        {mentionState.show && (
          <div
            ref={dropdownRef}
            className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[240px] max-h-[300px] overflow-y-auto"
            style={{
              top: `${mentionState.position.top}px`,
              left: `${mentionState.position.left}px`,
            }}
          >
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              results.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => selectMention(user.username)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors',
                    index === mentionState.selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url} alt={user.display_name} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      {user.display_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.display_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    )
  }
)

MentionInput.displayName = 'MentionInput'
