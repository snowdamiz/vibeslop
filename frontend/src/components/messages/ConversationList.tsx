import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PenSquare, Search, Mail } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import type { Conversation } from './types'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewMessage?: () => void
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewMessage,
}: ConversationListProps) {
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <h1 className="font-bold text-lg leading-tight">Messages</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={onNewMessage}
            disabled={!onNewMessage}
          >
            <PenSquare className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              className="pl-9 rounded-full bg-muted/50 border-transparent focus-visible:border-input"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Conversation List - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {conversations.length > 0 ? (
          <div className="divide-y divide-border">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => onSelectConversation(conversation.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground text-sm">
              When you message someone, it will show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
