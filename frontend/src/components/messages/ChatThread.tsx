import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, MoreHorizontal, Send, Image, Smile } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import type { ConversationWithMessages, Participant } from './types'

interface ChatThreadProps {
  conversation: ConversationWithMessages
  onBack: () => void
  onSendMessage?: (content: string) => Promise<void>
}

// Helper to group messages by date
const groupMessagesByDate = (messages: ConversationWithMessages['messages']) => {
  const groups: { date: string; messages: ConversationWithMessages['messages'] }[] = []
  
  messages.forEach((message) => {
    const messageDate = new Date(message.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let dateLabel: string
    if (messageDate.toDateString() === today.toDateString()) {
      dateLabel = 'Today'
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      dateLabel = 'Yesterday'
    } else {
      dateLabel = messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
    
    const existingGroup = groups.find(g => g.date === dateLabel)
    if (existingGroup) {
      existingGroup.messages.push(message)
    } else {
      groups.push({ date: dateLabel, messages: [message] })
    }
  })
  
  return groups
}

function ChatHeader({ participant, onBack }: { participant: Participant; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 h-14">
        {/* Back button - visible on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Avatar */}
        <Avatar className="w-9 h-9">
          <AvatarImage
            src={participant.avatarUrl || `https://i.pravatar.cc/150?img=${participant.username?.charCodeAt(0) % 70 || 1}`}
            alt={participant.name}
          />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-medium">
            {participant.initials}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] truncate">{participant.name}</h2>
          <p className="text-xs text-muted-foreground">@{participant.username}</p>
        </div>

        {/* More options */}
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}

function MessageInput({ onSend }: { onSend?: (content: string) => Promise<void> }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !onSend || sending) return

    try {
      setSending(true)
      await onSend(message.trim())
      setMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="sticky bottom-0 bg-background border-t border-border p-3">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0" disabled type="button">
            <Image className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start a new message"
              className="pr-10 rounded-full bg-muted/50 border-transparent focus-visible:border-input"
              disabled={sending}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full w-7 h-7"
              disabled
              type="button"
            >
              <Smile className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          <Button 
            size="icon" 
            className="rounded-full flex-shrink-0" 
            disabled={!message.trim() || sending}
            type="submit"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

export function ChatThread({ conversation, onBack, onSendMessage }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageGroups = groupMessagesByDate(conversation.messages)

  // Auto-scroll to bottom on mount and when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation.id, conversation.messages.length])

  return (
    <div className="flex flex-col h-full">
      <ChatHeader participant={conversation.participant} onBack={onBack} />
      
      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-4 py-4 space-y-6">
          {messageGroups.length > 0 ? (
            messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
                    {group.date}
                  </span>
                </div>
                
                {/* Messages */}
                <div className="space-y-3">
                  {group.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <MessageInput onSend={onSendMessage} />
    </div>
  )
}
