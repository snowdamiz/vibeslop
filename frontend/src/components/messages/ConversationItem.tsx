import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Conversation } from './types'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'now'
  if (diffInMinutes < 60) return `${diffInMinutes}m`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { participant, lastMessage, unreadCount } = conversation
  const hasUnread = unreadCount > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors overflow-hidden',
        isActive
          ? 'bg-primary/10'
          : 'hover:bg-muted/60',
        hasUnread && !isActive && 'bg-primary/5'
      )}
    >
      {/* Avatar */}
      <Avatar className="w-12 h-12 flex-shrink-0">
        <AvatarImage
          src={participant.avatarUrl || `https://i.pravatar.cc/150?img=${participant.username?.charCodeAt(0) % 70 || 1}`}
          alt={participant.name}
        />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-medium">
          {participant.initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(
            'text-[15px] truncate block',
            hasUnread ? 'font-semibold' : 'font-medium'
          )}>
            {participant.name}
          </span>
          <span className={cn(
            'text-xs shrink-0',
            hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'
          )}>
            {formatTimeAgo(lastMessage.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={cn(
              'text-sm truncate block flex-1 min-w-0',
              hasUnread ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {lastMessage.isFromMe && <span className="text-muted-foreground">You: </span>}
            {lastMessage.content}
          </span>
          {hasUnread && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
