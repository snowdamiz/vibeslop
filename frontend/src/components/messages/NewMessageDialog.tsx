import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { SuggestedUser } from '@/lib/api'

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectUser: (username: string) => void
}

export function NewMessageDialog({ open, onOpenChange, onSelectUser }: NewMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.searchUsers(searchQuery, { limit: 10 })
        setSearchResults(response.data)
      } catch (error) {
        console.error('Failed to search users:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [open])

  const handleSelectUser = useCallback((username: string) => {
    onSelectUser(username)
    onOpenChange(false)
  }, [onSelectUser, onOpenChange])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for a user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full bg-muted/50 border-transparent focus-visible:border-input"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <ScrollArea className="max-h-[400px] border-t border-border">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-border">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.username)}
                  className="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={user.avatar_url} alt={user.display_name} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-medium">
                      {getInitials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">
                        {user.display_name}
                      </span>
                      {user.is_verified && (
                        <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="flex items-center justify-center py-12 text-center px-6">
              <p className="text-sm text-muted-foreground">
                No users found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-center px-6">
              <p className="text-sm text-muted-foreground">
                Search for a user to start a conversation
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
