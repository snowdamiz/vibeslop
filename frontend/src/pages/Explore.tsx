import { useState, useEffect } from 'react'
import { Post } from '@/components/feed'
import type { FeedItem, ProjectPost } from '@/components/feed'
import { isProjectPost } from '@/components/feed'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExplore } from '@/context/ExploreContext'
import { api } from '@/lib/api'

// Backup mock feed data
const mockFeedItems: FeedItem[] = [
  {
    type: 'project',
    id: 'p1',
    title: 'AI-Powered Code Review Dashboard',
    content: 'A real-time dashboard that uses Claude to analyze pull requests and provide actionable feedback.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
    tools: ['Cursor', 'Claude'],
    stack: ['React', 'Node.js'],
    likes: 234,
    comments: 45,
    reposts: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
  },
  {
    type: 'update',
    id: 'u1',
    content: 'Hot take: vibe coding isn\'t about replacing developers, it\'s about amplifying what we can build. I shipped more this month than the entire Q1 last year.',
    likes: 156,
    comments: 34,
    reposts: 18,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Marcus Johnson', username: 'marcusj', initials: 'MJ' },
  },
  {
    type: 'project',
    id: 'p2',
    title: 'Conversational Data Explorer',
    content: 'Chat with your data using natural language. Built in a weekend with v0 and GPT-4.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    tools: ['v0', 'GPT-4'],
    stack: ['Next.js'],
    likes: 189,
    comments: 32,
    reposts: 8,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Marcus Johnson', username: 'marcusj', initials: 'MJ' },
  },
  {
    type: 'update',
    id: 'u2',
    content: 'Pro tip: When using Cursor, keep your project structure flat at first. Let the AI help you refactor into modules once patterns emerge. Fighting the AI early leads to frustration.',
    likes: 203,
    comments: 28,
    reposts: 42,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Luna Park', username: 'lunap', initials: 'LP' },
  },
  {
    type: 'project',
    id: 'p3',
    title: 'Generative Art Studio',
    content: 'Create stunning visuals with AI. A creative playground combining multiple AI tools.',
    image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=400&fit=crop',
    tools: ['Midjourney', 'Claude'],
    stack: ['Svelte'],
    likes: 312,
    comments: 67,
    reposts: 24,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Luna Park', username: 'lunap', initials: 'LP' },
  },
  {
    type: 'update',
    id: 'u3',
    content: 'Anyone else finding that Claude 3.5 Sonnet handles React better than GPT-4? Curious what your experiences have been. Thinking of switching my whole workflow.',
    likes: 67,
    comments: 89,
    reposts: 3,
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Alex Rivera', username: 'alexr', initials: 'AR' },
  },
  {
    type: 'project',
    id: 'p4',
    title: 'Smart Budget Tracker',
    content: 'Personal finance app that categorizes expenses using AI and provides spending insights.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
    tools: ['Bolt', 'GPT-4'],
    stack: ['Vue'],
    likes: 156,
    comments: 28,
    reposts: 5,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Alex Rivera', username: 'alexr', initials: 'AR' },
  },
  {
    type: 'project',
    id: 'p5',
    title: 'Documentation Generator',
    content: 'Automatically generate beautiful docs from your codebase. Just point and click.',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=600&h=400&fit=crop',
    tools: ['Cursor', 'Claude'],
    stack: ['Astro'],
    likes: 278,
    comments: 51,
    reposts: 18,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Jordan Lee', username: 'jordanl', initials: 'JL' },
  },
  {
    type: 'update',
    id: 'u4',
    content: '🎉 Just hit 1000 users on my vibe-coded SaaS! Built the whole thing in 3 weeks with Cursor + Claude. Wild times we\'re living in.',
    likes: 445,
    comments: 56,
    reposts: 23,
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Jordan Lee', username: 'jordanl', initials: 'JL' },
  },
  {
    type: 'project',
    id: 'p6',
    title: 'Recipe Remix App',
    content: 'Upload any recipe and get variations based on dietary preferences, ingredients on hand, or cuisine style.',
    image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&h=400&fit=crop',
    tools: ['Replit AI', 'Claude'],
    stack: ['React'],
    likes: 145,
    comments: 23,
    reposts: 7,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Mia Thompson', username: 'miat', initials: 'MT' },
  },
  {
    type: 'project',
    id: 'p7',
    title: 'AI Writing Assistant',
    content: 'A minimalist writing app with intelligent suggestions that adapts to your style.',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=400&fit=crop',
    tools: ['GPT-4', 'Cursor'],
    stack: ['Next.js', 'Node.js'],
    likes: 203,
    comments: 41,
    reposts: 14,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Chris Wu', username: 'chrisw', initials: 'CW' },
  },
  {
    type: 'project',
    id: 'p8',
    title: 'Portfolio Builder',
    content: 'Drag-and-drop portfolio creator with AI-powered content suggestions and layout optimization.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
    tools: ['v0', 'Claude'],
    stack: ['React', 'Node.js'],
    likes: 167,
    comments: 29,
    reposts: 9,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Emma Davis', username: 'emmad', initials: 'ED' },
  },
  {
    type: 'project',
    id: 'p9',
    title: 'Music Mood Analyzer',
    content: 'Analyze your Spotify playlists and discover patterns in your listening habits.',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
    tools: ['Cursor', 'GPT-4'],
    stack: ['Python', 'React'],
    likes: 198,
    comments: 37,
    reposts: 11,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    author: { name: 'Ryan Kim', username: 'ryank', initials: 'RK' },
  },
]

export function Explore() {
  const {
    searchQuery,
    selectedTools,
    selectedStacks,
    sortBy,
    setSortBy,
    clearAllFilters,
  } = useExplore()

  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch posts/projects when filters change
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await api.getPosts({
          type: 'explore',
          search: searchQuery || undefined,
          tools: selectedTools.length > 0 ? selectedTools : undefined,
          stacks: selectedStacks.length > 0 ? selectedStacks : undefined,
          sort_by: sortBy,
          limit: 20
        })
        
        setItems(response.data || [])
      } catch (err) {
        console.error('Failed to fetch explore items:', err)
        setError('Failed to load items')
        // Fallback to mock data on error
        setItems(mockFeedItems)
      } finally {
        setIsLoading(false)
      }
    }

    fetchItems()
  }, [searchQuery, selectedTools, selectedStacks, sortBy])

  const filteredItems = items

  // Determine if we're filtering (to show appropriate empty state)
  const hasActiveFilters = searchQuery !== '' || selectedTools.length > 0 || selectedStacks.length > 0

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        {/* Sort Tabs */}
        <div className="flex max-w-[600px] mx-auto">
          {(['trending', 'recent', 'top'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 capitalize',
                sortBy === option ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {option}
              {sortBy === option && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <Post
              key={item.id}
              item={item}
              showBorder={index !== filteredItems.length - 1}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <div className="max-w-[600px] mx-auto px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? 'No results found' : 'No posts yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your filters or search query'
                  : 'Be the first to share something!'
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters} className="rounded-full">
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredItems.length > 0 && (
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
