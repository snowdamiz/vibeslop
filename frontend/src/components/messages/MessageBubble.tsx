import { cn } from '@/lib/utils'
import type { Message } from './types'

interface MessageBubbleProps {
  message: Message
}

const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { content, timestamp, isFromMe } = message

  return (
    <div
      className={cn(
        'flex flex-col max-w-[75%]',
        isFromMe ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      <div
        className={cn(
          'px-4 py-2.5 text-[15px] leading-relaxed',
          isFromMe
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-muted rounded-2xl rounded-bl-md'
        )}
      >
        {content}
      </div>
      <span className="text-[11px] text-muted-foreground mt-1 px-1">
        {formatMessageTime(timestamp)}
      </span>
    </div>
  )
}
