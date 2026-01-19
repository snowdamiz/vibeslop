import { useState, useEffect } from 'react'
import { Post } from './Post'
import type { FeedItem } from './types'
import { ComposeBox } from './ComposeBox'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

// Backup mock data in case API fails
const mockFeedData: FeedItem[] = [
  // Status update
  {
    type: 'update',
    id: 'u1',
    content: 'Just discovered you can use Claude to refactor entire modules at once. Game changer for legacy codebases! The key is giving it enough context about your patterns.',
    likes: 89,
    comments: 12,
    reposts: 5,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
  },
  // Project post
  {
    type: 'project',
    id: 'p1',
    title: 'AI-Powered Code Review Dashboard',
    content: 'A real-time dashboard that uses Claude to analyze pull requests and provide actionable feedback. Built this over the weekend and it\'s already saved my team hours!',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
    tools: ['Cursor', 'Claude'],
    stack: ['React', 'Node.js'],
    likes: 234,
    comments: 45,
    reposts: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
  },
  // Status update
  {
    type: 'update',
    id: 'u2',
    content: 'Hot take: vibe coding isn\'t about replacing developers, it\'s about amplifying what we can build. I shipped more this month than the entire Q1 last year.',
    likes: 156,
    comments: 34,
    reposts: 18,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Marcus Johnson', username: 'marcusj', initials: 'MJ' },
  },
  // Project post
  {
    type: 'project',
    id: 'p2',
    title: 'Conversational Data Explorer',
    content: 'Chat with your data using natural language. Built in a weekend with v0 and GPT-4. The vibe coding workflow is incredible for prototyping.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    tools: ['v0', 'GPT-4'],
    stack: ['Next.js'],
    likes: 189,
    comments: 32,
    reposts: 8,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Marcus Johnson', username: 'marcusj', initials: 'MJ' },
  },
  // Status update with tip
  {
    type: 'update',
    id: 'u3',
    content: 'Pro tip: When using Cursor, keep your project structure flat at first. Let the AI help you refactor into modules once patterns emerge. Fighting the AI early leads to frustration.',
    likes: 203,
    comments: 28,
    reposts: 42,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Luna Park', username: 'lunap', initials: 'LP' },
  },
  // Project post
  {
    type: 'project',
    id: 'p3',
    title: 'Generative Art Studio',
    content: 'Create stunning visuals with AI. A creative playground combining multiple AI tools. Just shipped the gallery feature!',
    image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=400&fit=crop',
    tools: ['Midjourney', 'Claude'],
    stack: ['Svelte'],
    likes: 312,
    comments: 67,
    reposts: 24,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Luna Park', username: 'lunap', initials: 'LP' },
  },
  // Status update - question
  {
    type: 'update',
    id: 'u4',
    content: 'Anyone else finding that Claude 3.5 Sonnet handles React better than GPT-4? Curious what your experiences have been. Thinking of switching my whole workflow.',
    likes: 67,
    comments: 89,
    reposts: 3,
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Alex Rivera', username: 'alexr', initials: 'AR' },
  },
  // Project post
  {
    type: 'project',
    id: 'p4',
    title: 'Smart Budget Tracker',
    content: 'Personal finance app that categorizes expenses using AI and provides spending insights. Finally got the ML model working!',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
    tools: ['Bolt', 'GPT-4'],
    stack: ['Vue'],
    likes: 156,
    comments: 28,
    reposts: 5,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Alex Rivera', username: 'alexr', initials: 'AR' },
  },
  // Status update - celebration
  {
    type: 'update',
    id: 'u5',
    content: '🎉 Just hit 1000 users on my vibe-coded SaaS! Built the whole thing in 3 weeks with Cursor + Claude. Wild times we\'re living in.',
    likes: 445,
    comments: 56,
    reposts: 23,
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Jordan Lee', username: 'jordanl', initials: 'JL' },
  },
  // Project post
  {
    type: 'project',
    id: 'p5',
    title: 'Documentation Generator',
    content: 'Automatically generate beautiful docs from your codebase. Just point and click. This has been a game changer for my open source projects.',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=600&h=400&fit=crop',
    tools: ['Cursor', 'Claude'],
    stack: ['Astro'],
    likes: 278,
    comments: 51,
    reposts: 18,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Jordan Lee', username: 'jordanl', initials: 'JL' },
  },
  // Status update - learning
  {
    type: 'update',
    id: 'u6',
    content: 'TIL: You can paste error messages directly into Claude and ask it to explain what went wrong AND fix it. Debugging has never been this fast.',
    likes: 178,
    comments: 15,
    reposts: 31,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Mia Thompson', username: 'miat', initials: 'MT' },
  },
  // Project post
  {
    type: 'project',
    id: 'p6',
    title: 'Recipe Remix App',
    content: 'Upload any recipe and get variations based on dietary preferences, ingredients on hand, or cuisine style. Built with love for home cooks.',
    image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&h=400&fit=crop',
    tools: ['Replit AI', 'Claude'],
    stack: ['React'],
    likes: 145,
    comments: 23,
    reposts: 7,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Mia Thompson', username: 'miat', initials: 'MT' },
  },
]

type FeedTab = 'for-you' | 'following'

interface FeedProps {
  showCompose?: boolean
  showTabs?: boolean
  initialTab?: FeedTab
  posts?: FeedItem[]
}

export function Feed({ 
  showCompose = true, 
  showTabs = true, 
  initialTab = 'for-you',
  posts: providedPosts
}: FeedProps) {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<FeedTab>(initialTab)
  const [isLoading, setIsLoading] = useState(false)
  const [hasNewPosts, setHasNewPosts] = useState(false)
  const [posts, setPosts] = useState<FeedItem[]>(providedPosts || [])
  const [error, setError] = useState<string | null>(null)

  // Fetch posts when tab changes
  useEffect(() => {
    if (providedPosts) {
      setPosts(providedPosts)
      return
    }

    const fetchPosts = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await api.getPosts({
          feed: activeTab,
          limit: 20
        })
        
        setPosts(response.data || [])
      } catch (err) {
        console.error('Failed to fetch posts:', err)
        setError('Failed to load posts')
        // Fallback to mock data on error
        setPosts(mockFeedData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [activeTab, providedPosts])

  // Simulate new posts arriving
  const handleShowNewPosts = () => {
    setHasNewPosts(false)
    // In a real app, this would prepend new posts to the feed
  }

  const filteredPosts = posts

  return (
    <div className="min-h-screen">
      {/* Sticky Header with Tabs */}
      {showTabs && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex max-w-[600px] mx-auto">
            <button
              onClick={() => setActiveTab('for-you')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
                activeTab === 'for-you' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              For You
              {activeTab === 'for-you' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
                activeTab === 'following' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Following
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* New Posts Indicator */}
      {hasNewPosts && (
        <button
          onClick={handleShowNewPosts}
          className="w-full py-3 text-sm text-primary hover:bg-primary/5 transition-colors border-b border-border"
        >
          Show new posts
        </button>
      )}

      {/* Compose Box */}
      {showCompose && isAuthenticated && (
        <ComposeBox />
      )}

      {/* Posts Feed */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((item, index) => (
            <Post
              key={item.id}
              item={item}
              showBorder={index !== filteredPosts.length - 1}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="max-w-[600px] mx-auto px-4">
              <p className="text-muted-foreground">No posts yet</p>
              {activeTab === 'following' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Follow some creators to see their posts here
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredPosts.length > 0 && (
        <div className="py-8 text-center border-t border-border">
          <div className="max-w-[600px] mx-auto px-4">
            <Button variant="outline" className="rounded-full">
              Load more
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
