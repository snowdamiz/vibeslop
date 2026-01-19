export interface Participant {
  name: string
  username: string
  initials: string
  avatarUrl?: string
}

export interface LastMessage {
  content: string
  timestamp: string
  isFromMe: boolean
}

export interface Conversation {
  id: string
  participant: Participant
  lastMessage: LastMessage
  unreadCount: number
}

export interface Message {
  id: string
  content: string
  timestamp: string
  isFromMe: boolean
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}
