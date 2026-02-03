import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
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
  MessageSquare,
  Camera,
  Flag,
  Zap,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, type GigReview } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { AvatarEditDialog } from '@/components/AvatarEditDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ReviewCard } from '@/components/gigs'
import { useSEO } from '@/hooks/useSEO'
import { PremiumBadge } from '@/components/PremiumBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Helper function to format large numbers with abbreviations
function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`
  }
  return score.toString()
}

// GitHub stats breakdown type
interface GitHubStatsBreakdown {
  score_breakdown?: {
    commits?: number
    pull_requests?: number
    issues?: number
    repos?: number
    stars?: number
    forks?: number
    followers?: number
    consistency?: number
    language_diversity?: number
  }
  commits_count?: number
  prs_count?: number
  prs_merged_count?: number
  issues_count?: number
  public_repos?: number
  total_stars?: number
  total_forks?: number
  followers?: number
  languages?: string[]
  active_weeks?: number
  current_streak?: number
}

// Backup mock user data
const mockUserData = {
  id: 'mock-id',
  username: 'sarahc',
  name: 'Sarah Chen',
  initials: 'SC',
  avatar_url: undefined as string | undefined,
  bio: 'Full-stack developer passionate about developer tools and AI-assisted workflows. Building things that make developers\' lives easier. Currently obsessed with real-time collaboration features.',
  location: 'San Francisco, CA',
  website: 'https://sarahchen.dev',
  twitter: 'sarahcdev',
  github: 'sarahc',
  joinedDate: 'December 2025',
  color: 'from-blue-500 to-indigo-600',
  specializations: ['Frontend', 'Developer Tools', 'AI Integration', 'React', 'TypeScript'],
  favoriteTools: ['Cursor', 'Claude', 'v0'],
  isVerified: true,
  isPremium: false,
  developerScore: 1855,
  githubStats: null as GitHubStatsBreakdown | null,
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
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
    {
      type: 'update' as const,
      id: 'u2',
      content: 'Working on a new feature for the code review dashboard - automatic PR summaries. Should ship by end of week!',
      likes: 45,
      comments: 8,
      reposts: 2,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Sarah Chen', username: 'sarahc', initials: 'SC' },
    },
    {
      type: 'update' as const,
      id: 'u3',
      content: 'Pro tip: When you hit a wall with Claude, try rephrasing your request as a conversation. "Let\'s think about this together..." works way better than imperatives.',
      likes: 178,
      comments: 34,
      reposts: 45,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
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
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
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
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Marcus Johnson', username: 'marcusj', initials: 'MJ' },
    },
    {
      type: 'update' as const,
      id: 'u10',
      content: 'The future of coding is collaborative - you and the AI, working together. Not AI replacing you, but AI amplifying you.',
      likes: 312,
      comments: 67,
      reposts: 89,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
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
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      author: { name: 'Luna Park', username: 'lunap', initials: 'LP' },
    },
  ] as FeedItem[],
}

type ProfileTab = 'posts' | 'projects' | 'likes' | 'reviews'

export function UserProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, isAuthenticated } = useAuth()
  const [user, setUser] = useState<typeof mockUserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const [tabContent, setTabContent] = useState<FeedItem[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [reviews, setReviews] = useState<GigReview[]>([])

  // Dynamic SEO for user profile
  useSEO(user ? {
    title: `@${user.username}`,
    description: user.bio || `Check out ${user.name}'s projects and posts on Onvibe`,
    image: user.avatar_url || undefined,
    url: `https://onvibe.dev/user/${username}`,
    type: 'profile',
  } : {})

  // Fetch user data
  useEffect(() => {
    if (!username) return

    const fetchUser = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await api.getUser(username)
        const apiData = response.data as {
          id: string
          username: string
          display_name: string
          bio?: string
          location?: string
          website_url?: string
          twitter_handle?: string
          github_username?: string
          avatar_url?: string
          is_verified: boolean
          is_premium?: boolean
          joined_at?: string
          developer_score?: number
          developer_score_updated_at?: string
          github_stats?: GitHubStatsBreakdown
          favorite_ai_tools?: Array<{ id: string; name: string; slug: string }>
          preferred_tech_stacks?: Array<{ id: string; name: string; slug: string; category?: string }>
          stats?: {
            followers_count?: number
            following_count?: number
            posts_count?: number
            projects_count?: number
          }
        }

        // Map API response to component format
        const mappedUser: typeof mockUserData = {
          id: apiData.id,
          username: apiData.username,
          name: apiData.display_name,
          initials: apiData.display_name
            .split(' ')
            .slice(0, 2)
            .map(n => n[0])
            .join('')
            .toUpperCase(),
          avatar_url: apiData.avatar_url,
          bio: apiData.bio || '',
          location: apiData.location || '',
          website: apiData.website_url || '',
          twitter: apiData.twitter_handle || '',
          github: apiData.github_username || '',
          joinedDate: apiData.joined_at
            ? new Date(apiData.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : '',
          color: 'from-blue-500 to-indigo-600',
          specializations: apiData.preferred_tech_stacks?.map(t => t.name) || [],
          favoriteTools: apiData.favorite_ai_tools?.map(t => t.name) || [],
          isVerified: apiData.is_verified,
          isPremium: apiData.is_premium || false,
          developerScore: apiData.developer_score || 0,
          githubStats: apiData.github_stats || null,
          stats: {
            projects: apiData.stats?.projects_count || 0,
            posts: apiData.stats?.posts_count || 0,
            likes: 0,
            followers: apiData.stats?.followers_count || 0,
            following: apiData.stats?.following_count || 0,
          },
          isFollowing: false,
          posts: [],
          projects: [],
          likedPosts: [],
        }

        setUser(mappedUser)
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
            response = await api.getUserTimeline(username, { limit: 20 })
            setTabContent((response.data as FeedItem[]) || [])
            break
          case 'projects':
            response = await api.getUserProjects(username, { limit: 20 })
            setTabContent((response.data as FeedItem[]) || [])
            break
          case 'likes':
            response = await api.getUserLikes(username, { limit: 20 })
            setTabContent((response.data as FeedItem[]) || [])
            break
          case 'reviews':
            response = await api.getUserReviews(username)
            setReviews((response.data as GigReview[]) || [])
            break
        }
      } catch (err) {
        console.error(`Failed to fetch ${activeTab}:`, err)
        // Fallback to mock data
        if (activeTab === 'posts') {
          setTabContent(mockUserData.posts)
        } else if (activeTab === 'projects') {
          setTabContent(mockUserData.posts.filter(p => p.type === 'project'))
        } else {
          setTabContent(mockUserData.likedPosts)
        }
      } finally {
        setTabLoading(false)
      }
    }

    fetchTabContent()
  }, [activeTab, username, user])

  const handleMessageClick = () => {
    if (!username) return
    // Navigate to messages page with username param to auto-start conversation
    navigate(`/messages?user=${username}`)
  }

  const handleReportUser = async () => {
    if (!user?.id) return

    setIsReporting(true)
    try {
      await api.reportUser(user.id)
      console.log('User reported successfully')
      setShowReportDialog(false)
    } catch (err) {
      console.error('Failed to report user:', err)
    } finally {
      setIsReporting(false)
    }
  }

  // Check if viewing own profile
  const isOwnProfile = currentUser?.username === username

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Skeleton Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="max-w-[600px] mx-auto flex items-center gap-4 px-4 h-14">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-muted rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton Profile Section */}
        <div className="max-w-[600px] mx-auto px-4 py-5">
          <div className="flex items-start gap-4">
            {/* Avatar skeleton */}
            <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse flex-shrink-0" />

            {/* Info skeleton */}
            <div className="flex-1 min-w-0">
              <div className="h-6 w-40 bg-muted rounded animate-pulse mb-2" />
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="w-24 h-10 rounded-full bg-muted animate-pulse" />
            </div>
          </div>

          {/* Bio skeleton */}
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="border-b border-border">
          <div className="max-w-[600px] mx-auto flex">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 py-4 flex justify-center">
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="max-w-[600px] mx-auto divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  </div>
                  {i % 2 === 0 && (
                    <div className="aspect-[16/9] w-full bg-muted rounded-2xl animate-pulse mb-3" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
            <h1 className="font-bold text-lg leading-tight">{user.name}</h1>
            <p className="text-xs text-muted-foreground">{user.stats?.posts || 0} posts</p>
          </div>
        </div>
      </div>

      {/* Profile Bar */}
      <div className="max-w-[600px] mx-auto px-4 py-5">
        {/* Primary Row: Avatar + Identity + Stats + Actions */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {isOwnProfile ? (
            <button
              onClick={() => setShowAvatarDialog(true)}
              className="relative group cursor-pointer flex-shrink-0"
            >
              <Avatar className="w-[72px] h-[72px]">
                <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
                <AvatarFallback className={`bg-gradient-to-br ${user.color} text-white text-xl font-semibold`}>
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
          ) : (
            <Avatar className="w-[72px] h-[72px] flex-shrink-0">
              <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
              <AvatarFallback className={`bg-gradient-to-br ${user.color} text-white text-xl font-semibold`}>
                {user.initials}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Identity + Stats */}
          <div className="flex-1 min-w-0">
            {/* Name Row */}
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold truncate">{user.name}</h2>
              {user.isVerified && (
                <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20 flex-shrink-0" />
              )}
              {user.isPremium && <PremiumBadge size="md" />}
            </div>

            {/* Username + Integrated Stats */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span>@{user.username}</span>
              <span className="text-muted-foreground/50">·</span>
              <button className="hover:underline">
                <span className="font-semibold text-foreground">{user.stats?.following || 0}</span> Following
              </button>
              <span className="text-muted-foreground/50">·</span>
              <button className="hover:underline">
                <span className="font-semibold text-foreground">{user.stats?.followers || 0}</span> Followers
              </button>
            </div>

            {/* Meta Info Row */}
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground flex-wrap">
              {user.location && (
                <>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {user.location}
                  </span>
                  {(user.website || user.joinedDate || user.twitter || user.github) && (
                    <span className="text-muted-foreground/50">·</span>
                  )}
                </>
              )}
              {user.website && (
                <>
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {user.website.replace('https://', '')}
                  </a>
                  {(user.joinedDate || user.twitter || user.github) && (
                    <span className="text-muted-foreground/50">·</span>
                  )}
                </>
              )}
              {user.joinedDate && (
                <>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {user.joinedDate}
                  </span>
                  {(user.twitter || user.github) && (
                    <span className="text-muted-foreground/50">·</span>
                  )}
                </>
              )}
              {/* Social Icons inline */}
              {user.twitter && (
                <a
                  href={`https://twitter.com/${user.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {user.github && (
                <>
                  <a
                    href={`https://github.com/${user.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                  {user.developerScore > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium cursor-help text-xs">
                            <span className="font-semibold">{formatScore(user.developerScore)}</span>
                            <span className="text-primary/70">pts</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="w-80 p-0 overflow-hidden">
                          <div className="bg-primary px-4 py-3">
                            <p className="font-semibold text-primary-foreground flex items-center gap-2">
                              <Github className="w-4 h-4" />
                              GitHub Developer Score
                            </p>
                          </div>
                          <div className="p-4 space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              A score calculated from your public GitHub activity including commits, pull requests, repositories, and community engagement.
                            </p>
                            {user.githubStats?.score_breakdown && (
                              <>
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Points Breakdown</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    {user.githubStats.score_breakdown.commits !== undefined && (
                                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                                        <span className="text-xs text-muted-foreground">Commits</span>
                                        <span className="text-sm font-semibold text-foreground">+{user.githubStats.score_breakdown.commits}</span>
                                      </div>
                                    )}
                                    {user.githubStats.score_breakdown.pull_requests !== undefined && (
                                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                                        <span className="text-xs text-muted-foreground">PRs</span>
                                        <span className="text-sm font-semibold text-foreground">+{user.githubStats.score_breakdown.pull_requests}</span>
                                      </div>
                                    )}
                                    {user.githubStats.score_breakdown.repos !== undefined && (
                                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                                        <span className="text-xs text-muted-foreground">Repositories</span>
                                        <span className="text-sm font-semibold text-foreground">+{user.githubStats.score_breakdown.repos}</span>
                                      </div>
                                    )}
                                    {user.githubStats.score_breakdown.issues !== undefined && (
                                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                                        <span className="text-xs text-muted-foreground">Issues</span>
                                        <span className="text-sm font-semibold text-foreground">+{user.githubStats.score_breakdown.issues}</span>
                                      </div>
                                    )}
                                    {user.githubStats.score_breakdown.consistency !== undefined && (
                                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                                        <span className="text-xs text-muted-foreground">Consistency</span>
                                        <span className="text-sm font-semibold text-foreground">+{user.githubStats.score_breakdown.consistency}</span>
                                      </div>
                                    )}
                                    {user.githubStats.score_breakdown.language_diversity !== undefined && (
                                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                                        <span className="text-xs text-muted-foreground">Languages</span>
                                        <span className="text-sm font-semibold text-foreground">+{user.githubStats.score_breakdown.language_diversity}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="border-t border-border pt-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">Total Score</span>
                                    <span className="text-lg font-bold text-primary">{user.developerScore.toLocaleString()}</span>
                                  </div>
                                </div>
                              </>
                            )}
                            {user.githubStats?.current_streak !== undefined && user.githubStats.current_streak > 0 && (
                              <div className="flex items-center gap-2 pt-2 pb-1 px-3 -mx-1 rounded-md bg-primary/5 border border-primary/10">
                                <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                                <p className="text-xs text-foreground">
                                  <span className="font-semibold">{user.githubStats.current_streak} week</span> contribution streak!
                                </p>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {!isOwnProfile && isAuthenticated && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border border-border"
                onClick={handleMessageClick}
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            )}
            {!isOwnProfile && isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full border border-border">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowReportDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isOwnProfile && (
              <Button
                variant={isFollowing ? 'outline' : 'default'}
                onClick={() => setIsFollowing(!isFollowing)}
                className="rounded-full px-5"
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Actions - Stacked below on small screens */}
        {!isOwnProfile && (
          <div className="flex sm:hidden items-center gap-2 mt-4">
            {isAuthenticated && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border border-border"
                onClick={handleMessageClick}
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            )}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full border border-border">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowReportDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              onClick={() => setIsFollowing(!isFollowing)}
              className="rounded-full px-5 flex-1"
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        )}

        {/* Bio - Full Width Below */}
        {user.bio && (
          <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap">{user.bio}</p>
        )}

        {/* Preferred Technologies */}
        {(user.favoriteTools.length > 0 || user.specializations.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {user.favoriteTools.map((tool) => (
              <span
                key={`tool-${tool}`}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {tool}
              </span>
            ))}
            {user.specializations.map((tech) => (
              <span
                key={`tech-${tech}`}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
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
          <button
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'reviews' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Star className="w-4 h-4" />
            Reviews
            {activeTab === 'reviews' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {tabLoading ? (
          <div className="max-w-[600px] mx-auto divide-y divide-border">
            {/* Skeleton tab content - show 4 items */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex gap-3">
                  {/* Avatar skeleton */}
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />

                  {/* Content skeleton */}
                  <div className="flex-1 min-w-0">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                    </div>

                    {/* Title skeleton (for projects) */}
                    {i % 2 === 0 && (
                      <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
                    )}

                    {/* Content skeleton */}
                    <div className="space-y-2 mb-3">
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                      <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    </div>

                    {/* Image skeleton (show on some items) */}
                    {i % 2 === 0 && (
                      <div className="aspect-[16/9] w-full bg-muted rounded-2xl animate-pulse mb-3" />
                    )}

                    {/* Engagement actions skeleton */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-5 w-10 bg-muted rounded animate-pulse" />
                        <div className="h-5 w-10 bg-muted rounded animate-pulse" />
                        <div className="h-5 w-10 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-8 bg-muted rounded animate-pulse" />
                        <div className="h-5 w-8 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'reviews' ? (
          reviews.length > 0 ? (
            <div className="max-w-[600px] mx-auto space-y-3 px-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-[600px] mx-auto px-4">
                <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No reviews yet</p>
              </div>
            </div>
          )
        ) : tabContent.length > 0 ? (
          tabContent.map((post, index) => (
            <Post
              key={post.id}
              item={post}
              showBorder={index !== tabContent.length - 1}
              onDelete={(id) => setTabContent(prev => prev.filter(item => item.id !== id))}
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

      {/* Avatar Edit Dialog */}
      <AvatarEditDialog
        open={showAvatarDialog}
        onOpenChange={setShowAvatarDialog}
      />

      {/* Report User Dialog */}
      <ConfirmDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        title="Report User"
        description="Are you sure you want to report this user? Our moderation team will review your report."
        confirmLabel={isReporting ? "Reporting..." : "Report"}
        variant="destructive"
        isLoading={isReporting}
        onConfirm={handleReportUser}
      />
    </div>
  )
}
