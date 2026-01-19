import { useState } from 'react'
import { ConversationList, ChatThread } from '@/components/messages'
import type { ConversationWithMessages } from '@/components/messages'
import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock conversation data - vibe coding themed
const mockConversations: ConversationWithMessages[] = [
  {
    id: 'c1',
    participant: {
      name: 'Sarah Chen',
      username: 'sarahc',
      initials: 'SC',
    },
    lastMessage: {
      content: 'The AI-powered code review tool sounds amazing! Would love to collaborate.',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isFromMe: false,
    },
    unreadCount: 2,
    messages: [
      {
        id: 'm1',
        content: 'Hey! I saw your project on the feed. Really impressive work with Cursor!',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm2',
        content: 'Thanks so much! It was my first time using Claude for a full project.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm3',
        content: 'How long did it take you? The UI looks really polished.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm4',
        content: 'About a weekend! Claude helped me iterate on the design really fast. I just described what I wanted and it generated the components.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm5',
        content: 'That\'s incredible. I\'m working on something similar - an AI-powered code review tool.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm6',
        content: 'The AI-powered code review tool sounds amazing! Would love to collaborate.',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
    ],
  },
  {
    id: 'c2',
    participant: {
      name: 'Marcus Johnson',
      username: 'marcusj',
      initials: 'MJ',
    },
    lastMessage: {
      content: 'Let me know if you need help with the deployment!',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      isFromMe: true,
    },
    unreadCount: 0,
    messages: [
      {
        id: 'm7',
        content: 'Hey Marcus! I\'m having trouble with my Fly.io deployment. Any tips?',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm8',
        content: 'Sure! What error are you seeing?',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm9',
        content: 'It keeps timing out during the build step. My Phoenix app is taking forever.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm10',
        content: 'Ah, classic! Try adding a .dockerignore and excluding deps and _build. Also bump your builder memory.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm11',
        content: 'That worked! Thanks so much 🙏',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm12',
        content: 'Let me know if you need help with the deployment!',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
    ],
  },
  {
    id: 'c3',
    participant: {
      name: 'Luna Park',
      username: 'lunap',
      initials: 'LP',
    },
    lastMessage: {
      content: 'The prompt chaining technique is a game changer!',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      isFromMe: false,
    },
    unreadCount: 1,
    messages: [
      {
        id: 'm13',
        content: 'Love your generative art project! How do you handle the Midjourney API?',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm14',
        content: 'Thanks! I actually use a combination of their web API and some automation.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm15',
        content: 'I chain prompts through Claude first to refine them before sending to Midjourney.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 62 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm16',
        content: 'That\'s so smart! Does it improve the output quality significantly?',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm17',
        content: 'The prompt chaining technique is a game changer!',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
    ],
  },
  {
    id: 'c4',
    participant: {
      name: 'Alex Rivera',
      username: 'alexr',
      initials: 'AR',
    },
    lastMessage: {
      content: 'See you at the vibe coding meetup next week!',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isFromMe: false,
    },
    unreadCount: 0,
    messages: [
      {
        id: 'm18',
        content: 'Are you going to the SF vibe coding meetup?',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
      {
        id: 'm19',
        content: 'Yes! Really excited to meet other builders in person.',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm20',
        content: 'See you at the vibe coding meetup next week!',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
    ],
  },
  {
    id: 'c5',
    participant: {
      name: 'Jordan Lee',
      username: 'jordanl',
      initials: 'JL',
    },
    lastMessage: {
      content: 'Thanks for the v0 tip, it saved me hours!',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      isFromMe: false,
    },
    unreadCount: 0,
    messages: [
      {
        id: 'm21',
        content: 'Pro tip: v0 works best when you give it a reference screenshot!',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        isFromMe: true,
      },
      {
        id: 'm22',
        content: 'Thanks for the v0 tip, it saved me hours!',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        isFromMe: false,
      },
    ],
  },
]

export function Messages() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    mockConversations[0]?.id ?? null
  )

  const selectedConversation = mockConversations.find(c => c.id === selectedConversationId)

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id)
  }

  const handleBack = () => {
    setSelectedConversationId(null)
  }

  return (
    <div className="h-[calc(100vh-1px)] flex">
      {/* Conversation List - Hidden on mobile when a chat is selected */}
      <div
        className={cn(
          'w-full md:w-[320px] lg:w-[360px] border-r border-border flex-shrink-0 overflow-hidden',
          selectedConversationId ? 'hidden md:block' : 'block'
        )}
      >
        <ConversationList
          conversations={mockConversations}
          activeConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Thread - Hidden on mobile when no chat is selected */}
      <div
        className={cn(
          'flex-1 min-w-0',
          !selectedConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        {selectedConversation ? (
          <div className="w-full">
            <ChatThread
              conversation={selectedConversation}
              onBack={handleBack}
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
  )
}
