import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConversationList, ChatThread, NewMessageDialog } from '@/components/messages'
import type { Conversation, ConversationWithMessages } from '@/components/messages'
import { Mail, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

export function Messages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationData, setSelectedConversationData] = useState<ConversationWithMessages | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getConversations()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conversationsData = response.data as any[]

      // Transform API response to match component types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedConversations: Conversation[] = conversationsData.map((conv: any) => ({
        id: conv.id,
        participant: {
          name: conv.participant.display_name,
          username: conv.participant.username,
          initials: conv.participant.initials,
          avatarUrl: conv.participant.avatar_url,
        },
        lastMessage: conv.last_message ? {
          content: conv.last_message.content,
          timestamp: conv.last_message.timestamp,
          isFromMe: conv.last_message.is_from_me,
        } : {
          content: 'No messages yet',
          timestamp: new Date().toISOString(),
          isFromMe: false,
        },
        unreadCount: conv.unread_count,
      }))

      setConversations(transformedConversations)
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleRefreshConversations = useCallback(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedConversationId(null)
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedConversationId) return

    try {
      const response = await api.sendMessage(selectedConversationId, content)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newMessage = response.data as any

      // Add the new message to the current conversation
      setSelectedConversationData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          messages: [...prev.messages, {
            id: newMessage.id,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            isFromMe: newMessage.is_from_me,
          }]
        }
      })

      // Refresh conversations list to update last message
      handleRefreshConversations()
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }, [selectedConversationId, handleRefreshConversations])

  const handleNewConversation = useCallback(async (username: string) => {
    setIsCreatingConversation(true)
    try {
      const response = await api.createConversation(username)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conversationData = response.data as any

      // Check if conversation already exists in list
      const existingConv = conversations.find(c => c.id === conversationData.id)

      if (!existingConv) {
        // Add new conversation to the list
        const newConversation: Conversation = {
          id: conversationData.id,
          participant: {
            name: conversationData.participant.display_name,
            username: conversationData.participant.username,
            initials: conversationData.participant.initials,
            avatarUrl: conversationData.participant.avatar_url,
          },
          lastMessage: {
            content: 'No messages yet',
            timestamp: new Date().toISOString(),
            isFromMe: false,
          },
          unreadCount: 0,
        }

        setConversations(prev => [newConversation, ...prev])
      }

      // Select the conversation
      setSelectedConversationId(conversationData.id)
    } catch (err) {
      console.error('Failed to create conversation:', err)
      alert('Failed to start conversation. Please try again.')
    } finally {
      setIsCreatingConversation(false)
    }
  }, [conversations])

  const fetchConversationMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true)
      const response = await api.getConversation(conversationId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convData = response.data as any

      const conversation = conversations.find(c => c.id === conversationId)
      if (!conversation) return

      // Transform messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedMessages = convData.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.timestamp,
        isFromMe: msg.is_from_me,
      }))

      const conversationWithMessages: ConversationWithMessages = {
        ...conversation,
        messages: transformedMessages,
      }

      setSelectedConversationData(conversationWithMessages)

      // Mark conversation as read
      await api.markConversationRead(conversationId)

      // Update the unread count in the conversations list
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ))
    } catch (err) {
      console.error('Failed to fetch conversation messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [conversations])

  // Handle URL params for auto-starting conversations
  useEffect(() => {
    const username = searchParams.get('user')
    const conversationId = searchParams.get('conversation')

    if (username && !isCreatingConversation) {
      // Auto-start conversation with a user
      handleNewConversation(username)
      // Remove the param after processing
      searchParams.delete('user')
      setSearchParams(searchParams)
    } else if (conversationId && !selectedConversationId) {
      // Auto-select a conversation
      setSelectedConversationId(conversationId)
      // Remove the param after processing
      searchParams.delete('conversation')
      setSearchParams(searchParams)
    }
  }, [searchParams, isCreatingConversation, selectedConversationId, handleNewConversation, setSearchParams])

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      fetchConversationMessages(selectedConversationId)
    } else {
      setSelectedConversationData(null)
    }
  }, [selectedConversationId, fetchConversationMessages])

  if (loading) {
    return (
      <div className="h-[calc(100vh-1px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-1px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <button
            onClick={fetchConversations}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-[calc(100vh-1px)] flex">
        {/* Conversation List - Hidden on mobile when a chat is selected */}
        <div
          className={cn(
            'w-full md:w-[320px] lg:w-[360px] border-r border-border flex-shrink-0 overflow-hidden',
            selectedConversationId ? 'hidden md:block' : 'block'
          )}
        >
          <ConversationList
            conversations={conversations}
            activeConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onNewMessage={() => setNewMessageDialogOpen(true)}
          />
        </div>

        {/* Chat Thread - Hidden on mobile when no chat is selected */}
        <div
          className={cn(
            'flex-1 min-w-0',
            !selectedConversationId ? 'hidden md:flex' : 'flex'
          )}
        >
          {loadingMessages ? (
            <div className="flex items-center justify-center w-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedConversationData ? (
            <div className="w-full">
              <ChatThread
                conversation={selectedConversationData}
                onBack={handleBack}
                onSendMessage={handleSendMessage}
              />
            </div>
          ) : (
            // Empty state for desktop when no conversation selected
            <div className="hidden md:flex flex-col items-center justify-center w-full text-center px-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mail className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">Select a message</h2>
              <p className="text-muted-foreground max-w-[280px]">
                Choose from your existing conversations or start a new one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      <NewMessageDialog
        open={newMessageDialogOpen}
        onOpenChange={setNewMessageDialogOpen}
        onSelectUser={handleNewConversation}
      />
    </>
  )
}
