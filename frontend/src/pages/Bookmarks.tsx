import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bookmark,
  MoreHorizontal,
  Settings,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Post } from '@/components/feed'
import type { FeedItem } from '@/components/feed/types'

type BookmarkTab = 'all' | 'posts' | 'projects'

// Transform backend response to FeedItem format
// Backend returns already-transformed data via UserJSON.render_liked_item
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBackendItem(item: any): FeedItem | null {
  // Backend already returns transformed data with type, content, author, etc.
  if (item.type === 'update') {
    return {
      id: item.id,
      type: 'update',
      content: item.content,
      likes: item.likes || 0,
      comments: item.comments || 0,
      reposts: item.reposts || 0,
      created_at: item.created_at,
      media: item.media || [],
      author: item.author || {
        name: 'Unknown',
        username: 'unknown',
        initials: 'U',
      },
      liked: item.liked,
      bookmarked: true, // It's in bookmarks, so it's bookmarked
      reposted: item.reposted,
      impressions: item.impressions || 0,
    }
  } else if (item.type === 'project') {
    return {
      id: item.id,
      type: 'project',
      title: item.title,
      content: item.description || item.content || '',
      likes: item.likes || 0,
      comments: item.comments || 0,
      reposts: item.reposts || 0,
      created_at: item.created_at,
      image: item.image,
      tools: item.tools || [],
      stack: item.stack || [],
      author: item.author || {
        name: 'Unknown',
        username: 'unknown',
        initials: 'U',
      },
      liked: item.liked,
      bookmarked: true, // It's in bookmarks, so it's bookmarked
      reposted: item.reposted,
      impressions: item.impressions || 0,
    }
  }
  return null
}

export function Bookmarks() {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<BookmarkTab>('all')
  const [bookmarks, setBookmarks] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch bookmarks on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const fetchBookmarks = async () => {
      try {
        setIsLoading(true)
        const response = await api.getBookmarks({ limit: 50 })
        const transformed = response.data
          .map(transformBackendItem)
          .filter((item): item is FeedItem => item !== null)
        setBookmarks(transformed)
      } catch (err) {
        console.error('Failed to fetch bookmarks:', err)
        setError('Failed to load bookmarks')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookmarks()
  }, [isAuthenticated])

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (activeTab === 'posts') return bookmark.type === 'update'
    if (activeTab === 'projects') return bookmark.type === 'project'
    return true
  })

  const handleUnbookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  // Show login message if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sign in to see bookmarks</h3>
          <p className="text-muted-foreground">
            You need to be signed in to view your bookmarks.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-bold text-lg leading-tight">Bookmarks</h1>
              <p className="text-xs text-muted-foreground">
                {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Bookmark settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="border-b border-border" />

        {/* Tabs */}
        <div className="flex max-w-[600px] mx-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
              activeTab === 'all' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            All
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
              activeTab === 'posts' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Posts
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
              activeTab === 'projects' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Projects
            {activeTab === 'projects' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Bookmark List */}
      <div className="max-w-[600px] mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load bookmarks</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : filteredBookmarks.length > 0 ? (
          filteredBookmarks.map((bookmark) => (
            <Post key={bookmark.id} item={bookmark} onUnbookmark={handleUnbookmark} />
          ))
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'posts' && 'No bookmarked posts yet'}
              {activeTab === 'projects' && 'No bookmarked projects yet'}
              {activeTab === 'all' && 'No bookmarks yet'}
            </h3>
            <p className="text-muted-foreground">
              {activeTab === 'posts' && 'When you bookmark posts, they will show up here.'}
              {activeTab === 'projects' && 'When you bookmark projects, they will show up here.'}
              {activeTab === 'all' && 'When you bookmark posts or projects, they will show up here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
