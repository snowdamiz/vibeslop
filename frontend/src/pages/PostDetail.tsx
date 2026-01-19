import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { CommentsSection } from '@/components/comments'
import { cn } from '@/lib/utils'
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Bookmark,
  ArrowLeft,
  MoreHorizontal,
  Copy,
  Check,
  Linkedin,
  BadgeCheck,
  Flag,
  UserMinus,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'

// Backup mock post data
const mockPostData = {
  id: 'u1',
  type: 'update' as const,
  content: 'Just discovered you can use Claude to refactor entire modules at once. Game changer for legacy codebases! The key is giving it enough context about your patterns.\n\nI\'ve been experimenting with feeding it the whole codebase structure first, then asking for specific refactors. The results are incredible.\n\nAnyone else doing something similar? Would love to compare notes!',
  media: [] as string[],
  likes: 89,
  comments: 12,
  reposts: 5,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  author: {
    name: 'Sarah Chen',
    username: 'sarahc',
    initials: 'SC',
    bio: 'Full-stack developer passionate about developer tools. Building things that make developers\' lives easier.',
    color: 'from-violet-500 to-purple-600',
    verified: true,
    followers: 1247,
    following: 89,
    projects: 12,
  },
  commentsList: [
    {
      id: '1',
      author: { name: 'Alex Rivera', initials: 'AR', username: 'alexr' },
      content: 'This is game changing! I\'ve been doing something similar but with smaller chunks. Never thought to feed it the whole structure first.',
      likes: 8,
      createdAt: '1 hour ago',
      replyCount: 1,
      replies: [
        {
          id: '1-1',
          author: { name: 'Sarah Chen', initials: 'SC', username: 'sarahc' },
          content: 'Yeah the context window in Claude 3.5 is huge! Definitely try it with the full structure - the results are much more coherent.',
          likes: 3,
          createdAt: '45 minutes ago',
          replyTo: '1',
        },
      ],
    },
    {
      id: '2',
      author: { name: 'Marcus Johnson', initials: 'MJ', username: 'marcusj' },
      content: 'Do you have a template prompt you could share? Would love to try this approach.',
      likes: 5,
      createdAt: '30 minutes ago',
    },
    {
      id: '3',
      author: { name: 'Luna Park', initials: 'LP', username: 'lunap' },
      content: 'This is exactly what I needed to hear today. Been struggling with a legacy Rails app and was about to give up.',
      likes: 2,
      createdAt: '15 minutes ago',
    },
  ],
}

export function PostDetail() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isReposted, setIsReposted] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [repostCount, setRepostCount] = useState(0)
  const [copiedShare, setCopiedShare] = useState(false)

  // Fetch post data
  useEffect(() => {
    if (!id) return

    const fetchPost = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await api.getPost(id)
        setPost(response.data)
        setLikeCount(response.data.likes || 0)
        setRepostCount(response.data.reposts || 0)
      } catch (err) {
        console.error('Failed to fetch post:', err)
        setError('Failed to load post')
        // Fallback to mock data
        setPost(mockPostData)
        setLikeCount(mockPostData.likes)
        setRepostCount(mockPostData.reposts)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Post not found</p>
          <Link to="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  const handleRepost = () => {
    setIsReposted(!isReposted)
    setRepostCount(isReposted ? repostCount - 1 : repostCount + 1)
  }

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto flex items-center gap-4 px-4 h-14">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Post</h1>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto">
        {/* Main Post */}
        <div className="px-4 py-4">
          {/* Author Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <Link to={`/user/${post.author.username}`}>
                <Avatar className="w-12 h-12 hover:opacity-90 transition-opacity">
                  <AvatarImage src={`https://i.pravatar.cc/150?img=${post.author.username?.charCodeAt(0) % 70 || 3}`} alt={post.author.name} />
                  <AvatarFallback className={`bg-gradient-to-br ${post.author.color} text-white text-sm font-medium`}>
                    {post.author.initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <div className="flex items-center gap-1.5">
                  <Link to={`/user/${post.author.username}`} className="font-semibold hover:underline">
                    {post.author.name}
                  </Link>
                  {post.author.verified && (
                    <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
                  )}
                </div>
                <Link to={`/user/${post.author.username}`} className="text-muted-foreground text-sm">
                  @{post.author.username}
                </Link>
              </div>
            </div>

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Unfollow @{post.author.username}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-[17px] leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </div>

          {/* Media */}
          {post.media.length > 0 && (
            <div className={cn(
              'mb-4 rounded-2xl overflow-hidden border border-border',
              post.media.length > 1 && 'grid grid-cols-2 gap-0.5'
            )}>
              {post.media.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="Post image"
                  className={cn(
                    'w-full object-cover',
                    post.media.length === 1 ? 'aspect-[16/9]' : 'aspect-square'
                  )}
                />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-muted-foreground text-sm mb-4">
            {formatDate(post.createdAt)}
          </div>

          {/* Action Buttons with Stats */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {/* Comment */}
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 group"
            >
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {post.commentsList.length > 0 && (
                <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  {post.commentsList.length}
                </span>
              )}
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className="flex items-center gap-1.5 group"
            >
              <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                <Repeat2
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isReposted ? 'text-green-500' : 'text-muted-foreground group-hover:text-green-500'
                  )}
                />
              </div>
              {repostCount > 0 && (
                <span className={cn(
                  'text-sm transition-colors',
                  isReposted ? 'text-green-500' : 'text-muted-foreground group-hover:text-green-500'
                )}>
                  {repostCount}
                </span>
              )}
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 group"
            >
              <div className="p-2 rounded-full group-hover:bg-rose-500/10 transition-colors">
                <Heart
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isLiked ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground group-hover:text-rose-500'
                  )}
                />
              </div>
              {likeCount > 0 && (
                <span className={cn(
                  'text-sm transition-colors',
                  isLiked ? 'text-rose-500' : 'text-muted-foreground group-hover:text-rose-500'
                )}>
                  {likeCount}
                </span>
              )}
            </button>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              className="flex items-center gap-1.5 group"
            >
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                <Bookmark
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isBookmarked ? 'text-primary fill-primary' : 'text-muted-foreground group-hover:text-primary'
                  )}
                />
              </div>
            </button>

            {/* Share */}
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 group"
            >
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                {copiedShare ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Share className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <CommentsSection comments={post.commentsList} />

        {/* Share Card - Sticky at bottom on mobile */}
        <div className="p-4 border-t border-border lg:hidden">
          <Card className="border-border !py-0 !gap-0">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Share this post</h3>
              <div className="grid grid-cols-3 gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.content.slice(0, 100))}...&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="w-full h-auto py-3 flex flex-col gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="text-[10px]">X</span>
                  </Button>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="w-full h-auto py-3 flex flex-col gap-1.5">
                    <Linkedin className="w-4 h-4" />
                    <span className="text-[10px]">LinkedIn</span>
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full h-auto py-3 flex flex-col gap-1.5',
                    copiedShare && 'bg-green-500/10 border-green-500/30 text-green-600'
                  )}
                  onClick={copyShareLink}
                >
                  {copiedShare ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="text-[10px]">{copiedShare ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
