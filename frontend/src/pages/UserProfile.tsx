import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Post } from '@/components/feed'
import type { FeedItem } from '@/components/feed'
import {
  Heart,
  Github,
  Globe,
  Twitter,
  MapPin,
  Calendar,
  Sparkles,
  MoreHorizontal,
  CheckCircle2,
  ArrowLeft,
  Code2,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// Backup mock user data
const mockUserData = {
  username: 'sarahc',
  name: 'Sarah Chen',
  initials: 'SC',
  bio: 'Full-stack developer passionate about developer tools and AI-assisted workflows. Building things that make developers\' lives easier. Currently obsessed with real-time collaboration features.',
  location: 'San Francisco, CA',
  website: 'https://sarahchen.dev',
  twitter: 'sarahcdev',
  github: 'sarahc',
  joinedDate: 'December 2025',
  color: 'from-violet-500 to-purple-600',
  specializations: ['Frontend', 'Developer Tools', 'AI Integration', 'React', 'TypeScript'],
  favoriteTools: ['Cursor', 'Claude', 'v0'],
  isVerified: true,
  stats: {
    projects: 12,
    posts: 28,
    likes: 1456,
    followers: 342,
    following: 128,
  },
  isFollowing: false,
  // Mixed feed of projects and updates
  posts: [
    {
      type: 'update' as const,
      id: 'u1',
      content: 'Just discovered you can use Claude to refactor entire modules at once. Game changer for legacy codebases! The key is giving it enough context about your patterns.',
      likes: 89,
      comments: 12,
      reposts: 5,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
    {
      type: 'project' as const,
      id: 'p1',
      title: 'AI-Powered Code Review Dashboard',
      content: 'A real-time dashboard that uses Claude to analyze pull requests and provide actionable feedback. Built this over the weekend!',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
      tools: ['Cursor', 'Claude'],
      stack: ['React', 'Node.js'],
      likes: 234,
      comments: 45,
      reposts: 12,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
    {
      type: 'update' as const,
      id: 'u2',
      content: 'Working on a new feature for the code review dashboard - automatic PR summaries. Should ship by end of week!',
      likes: 45,
      comments: 8,
      reposts: 2,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
    {
      type: 'project' as const,
      id: 'p10',
      title: 'Git Commit Message Generator',
      content: 'AI-powered tool that writes meaningful commit messages from your diffs. No more "fix stuff" commits!',
      image: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=600&h=400&fit=crop',
      tools: ['GPT-4', 'Node.js'],
      likes: 156,
      comments: 28,
      reposts: 8,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
    {
      type: 'update' as const,
      id: 'u3',
      content: 'Pro tip: When you hit a wall with Claude, try rephrasing your request as a conversation. "Let\'s think about this together..." works way better than imperatives.',
      likes: 178,
      comments: 34,
      reposts: 45,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
    {
      type: 'project' as const,
      id: 'p11',
      title: 'PR Description Writer',
      content: 'Automatically generate comprehensive PR descriptions from your changes. Saved my team hours.',
      image: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&h=400&fit=crop',
      tools: ['Claude', 'TypeScript'],
      likes: 98,
      comments: 15,
      reposts: 5,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
  ] as FeedItem[],
  // Projects only (filtered)
  projects: [] as FeedItem[], // Will be filtered from posts
  // Liked items (can be mixed)
  likedPosts: [
    {
      type: 'project' as const,
      id: 'p2',
      title: 'Conversational Data Explorer',
      content: 'Chat with your data using natural language. Built in a weekend with v0 and GPT-4.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
      tools: ['v0', 'GPT-4'],
      stack: ['Next.js'],
      likes: 189,
      comments: 32,
      reposts: 8,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Marcus Johnson', username: 'marcusj', initials: 'MJ' },
    },
    {
      type: 'update' as const,
      id: 'u10',
      content: 'The future of coding is collaborative - you and the AI, working together. Not AI replacing you, but AI amplifying you.',
      likes: 312,
      comments: 67,
      reposts: 89,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Luna Park', username: 'lunap', initials: 'LP' },
    },
    {
      type: 'project' as const,
      id: 'p3',
      title: 'Generative Art Studio',
      content: 'Create stunning visuals with AI. A creative playground combining multiple AI tools.',
      image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=400&fit=crop',
      tools: ['Midjourney', 'Claude'],
      stack: ['Svelte'],
      likes: 312,
      comments: 67,
      reposts: 24,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Luna Park', username: 'lunap', initials: 'LP' },
    },
  ] as FeedItem[],
}

type ProfileTab = 'posts' | 'projects' | 'likes'

export function UserProfile() {
  const { username } = useParams()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const [tabContent, setTabContent] = useState<FeedItem[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  // Fetch user data
  useEffect(() => {
    if (!username) return

    const fetchUser = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await api.getUser(username)
        setUser(response.data)
      } catch (err) {
        console.error('Failed to fetch user:', err)
        setError('Failed to load user')
        // Fallback to mock data
        setUser(mockUserData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [username])

  // Fetch tab content when tab changes
  useEffect(() => {
    if (!username || !user) return

    const fetchTabContent = async () => {
      setTabLoading(true)
      
      try {
        let response
        switch (activeTab) {
          case 'posts':
            response = await api.getUserPosts(username, { limit: 20 })
            break
          case 'projects':
            response = await api.getUserProjects(username, { limit: 20 })
            break
          case 'likes':
            response = await api.getUserLikes(username, { limit: 20 })
            break
        }
        
        setTabContent(response.data || [])
      } catch (err) {
        console.error(`Failed to fetch ${activeTab}:`, err)
        // Fallback to mock data
        if (activeTab === 'posts') {
          setTabContent(mockUserData.posts)
        } else if (activeTab === 'projects') {
          setTabContent(mockUserData.posts.filter((p: any) => p.type === 'project'))
        } else {
          setTabContent(mockUserData.likedPosts)
        }
      } finally {
        setTabLoading(false)
      }
    }

    fetchTabContent()
  }, [activeTab, username, user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">User not found</p>
          <Link to="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto flex items-center gap-4 px-4 h-14">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight">{user.display_name}</h1>
            <p className="text-xs text-muted-foreground">{user.stats?.posts_count || 0} posts</p>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 sm:h-40 bg-gradient-to-br from-primary/30 via-primary/10 to-primary/20" />

      {/* Profile Info */}
      <div className="max-w-[600px] mx-auto px-4 pb-4">
        {/* Avatar & Follow Button Row */}
        <div className="flex justify-between items-start -mt-16 mb-3">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 ring-4 ring-background">
            <AvatarImage src={`https://i.pravatar.cc/150?img=${user.username?.charCodeAt(0) % 70 || 3}`} alt={user.name} />
            <AvatarFallback className={`bg-gradient-to-br ${user.color} text-white text-2xl sm:text-3xl font-semibold`}>
              {user.initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-2 mt-20">
            <Button variant="ghost" size="icon" className="rounded-full border border-border">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              onClick={() => setIsFollowing(!isFollowing)}
              className="rounded-full px-5"
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>

        {/* Name & Username */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-bold">{user.display_name}</h2>
            {user.is_verified && (
              <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
            )}
          </div>
          <p className="text-muted-foreground">@{user.username}</p>
        </div>

        {/* Bio */}
        <p className="text-[15px] mb-3 whitespace-pre-wrap">{user.bio}</p>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
          {user.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {user.location}
            </span>
          )}
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="w-4 h-4" />
              {user.website.replace('https://', '')}
            </a>
          )}
          {user.joined_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {new Date(user.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-3 mb-3">
          {user.twitter && (
            <a
              href={`https://twitter.com/${user.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
          )}
          {user.github && (
            <a
              href={`https://github.com/${user.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm mb-4">
          <button className="hover:underline">
            <span className="font-bold">{user.stats?.following_count || 0}</span>{' '}
            <span className="text-muted-foreground">Following</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold">{user.stats?.followers_count || 0}</span>{' '}
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-10 bg-background border-b border-border">
        <div className="max-w-[600px] mx-auto flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'posts' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Posts
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'projects' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Projects
            {activeTab === 'projects' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'likes' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Heart className="w-4 h-4" />
            Likes
            {activeTab === 'likes' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {tabLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : tabContent.length > 0 ? (
          tabContent.map((post, index) => (
            <Post
              key={post.id}
              item={post}
              showBorder={index !== tabContent.length - 1}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <div className="max-w-[600px] mx-auto px-4">
              {activeTab === 'posts' && (
                <>
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No posts yet</p>
                </>
              )}
              {activeTab === 'projects' && (
                <>
                  <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No projects yet</p>
                </>
              )}
              {activeTab === 'likes' && (
                <>
                  <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No liked posts yet</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
