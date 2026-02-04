import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CommentsSection } from '@/components/comments'
import type { Comment as CommentType } from '@/components/comments/types'
import { FeaturedProjectCard } from '@/components/feed/FeaturedProjectCard'
import type { BotPost, FeaturedProject } from '@/components/feed/types'
import { cn } from '@/lib/utils'
import {
  Heart,
  MessageCircle,
  Repeat2,
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
  Eye,
  Quote,
  TrendingUp,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { PremiumBadge } from '@/components/PremiumBadge'

// Backup mock post data
const mockPostData = {
  id: 'u1',
  type: 'update' as const,
  content: 'Just discovered you can use Claude to refactor entire modules at once. Game changer for legacy codebases! The key is giving it enough context about your patterns.\n\nI\'ve been experimenting with feeding it the whole codebase structure first, then asking for specific refactors. The results are incredible.\n\nAnyone else doing something similar? Would love to compare notes!',
  media: [] as string[],
  likes: 89,
  comments: 12,
  reposts: 5,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  author: {
    name: 'Sarah Chen',
    username: 'sarahc',
    initials: 'SC',
    avatar_url: undefined as string | undefined,
    bio: 'Full-stack developer passionate about developer tools. Building things that make developers\' lives easier.',
    color: 'from-blue-500 to-indigo-600',
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
      created_at: '1 hour ago',
      replyCount: 1,
      replies: [
        {
          id: '1-1',
          author: { name: 'Sarah Chen', initials: 'SC', username: 'sarahc' },
          content: 'Yeah the context window in Claude 3.5 is huge! Definitely try it with the full structure - the results are much more coherent.',
          likes: 3,
          created_at: '45 minutes ago',
          replyTo: '1',
        },
      ],
    },
    {
      id: '2',
      author: { name: 'Marcus Johnson', initials: 'MJ', username: 'marcusj' },
      content: 'Do you have a template prompt you could share? Would love to try this approach.',
      likes: 5,
      created_at: '30 minutes ago',
    },
    {
      id: '3',
      author: { name: 'Luna Park', initials: 'LP', username: 'lunap' },
      content: 'This is exactly what I needed to hear today. Been struggling with a legacy Rails app and was about to give up.',
      likes: 2,
      created_at: '15 minutes ago',
    },
  ],
}

export function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<typeof mockPostData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isReposted, setIsReposted] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [repostCount, setRepostCount] = useState(0)
  const [impressions, setImpressions] = useState(0)
  const [copiedShare, setCopiedShare] = useState(false)
  const [comments, setComments] = useState<CommentType[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  // Fetch post data
  useEffect(() => {
    if (!id) return

    const fetchPost = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await api.getPost(id)
        const postData = response.data as typeof mockPostData & { impressions?: number; type?: string }

        // Redirect bot posts to dedicated page
        if ((postData as { type?: string }).type === 'bot_post') {
          navigate(`/bot-post/${id}`, { replace: true })
          return
        }

        setPost(postData)
        setLikeCount(postData.likes || 0)
        setRepostCount(postData.reposts || 0)
        setCommentCount(postData.comments || 0)
        setImpressions(postData.impressions || 0)
      } catch (err) {
        console.error('Failed to fetch post:', err)
        setError('Failed to load post')
        // Fallback to mock data
        setPost(mockPostData)
        setLikeCount(mockPostData.likes)
        setRepostCount(mockPostData.reposts)
        setCommentCount(mockPostData.comments)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [id, navigate])

  // Fetch comments after post loads
  useEffect(() => {
    if (!id || !post) return

    const fetchComments = async () => {
      setIsLoadingComments(true)
      try {
        const response = await api.getComments('post', id)
        setComments(response.data as CommentType[])
        setCommentCount((response.data as CommentType[]).length)
      } catch (err) {
        console.error('Failed to fetch comments:', err)
        // Keep any existing comments from mock data
      } finally {
        setIsLoadingComments(false)
      }
    }

    fetchComments()
  }, [id, post])

  // Handle adding a comment
  const handleAddComment = async (content: string, parentId?: string) => {
    if (!id) return

    try {
      const response = await api.createComment({
        commentable_type: 'Post',
        commentable_id: id,
        content,
        parent_id: parentId,
      })

      const newComment = response.data as CommentType

      if (parentId) {
        // If it's a reply, refetch all comments to keep nested structure correct
        const commentsResponse = await api.getComments('post', id)
        setComments(commentsResponse.data as CommentType[])
      } else {
        // Add new top-level comment to the beginning
        setComments(prev => [newComment, ...prev])
      }

      // Update comment count
      setCommentCount(prev => prev + 1)
    } catch (err) {
      console.error('Failed to create comment:', err)
    }
  }

  // Handle liking a comment
  const handleLikeComment = async (commentId: string) => {
    try {
      await api.toggleLike('comment', commentId)
    } catch (err) {
      console.error('Failed to like comment:', err)
    }
  }

  // Handle deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId)
      setCommentCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to delete comment:', err)
      throw err // Re-throw so the UI can handle it
    }
  }

  // Handle reporting a comment
  const handleReportComment = async (commentId: string) => {
    try {
      await api.reportComment(commentId)
      // Show success feedback (could add a toast notification here)
      console.log('Comment reported successfully')
    } catch (err) {
      console.error('Failed to report comment:', err)
    }
  }

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

  const handleQuote = () => {
    if (!post) return
    // Navigate to home with quote data in state
    navigate('/', {
      state: {
        quotePost: {
          id: post.id,
          type: 'update' as const,
          content: post.content,
          author: post.author,
          created_at: post.created_at,
        }
      }
    })
  }

  const handleBookmark = async () => {
    try {
      const response = await api.toggleBookmark('post', id!)
      setIsBookmarked(response.bookmarked)
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
    }
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
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
    <div className="min-h-screen pb-20">
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
        <div className={cn(
          'px-4 py-4',
          (post as unknown as BotPost).type === 'bot_post' && 'bg-gradient-to-r from-primary/5 via-transparent to-primary/5'
        )}>
          {/* Author Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <Link to={`/user/${post.author.username}`}>
                <Avatar className={cn(
                  'w-12 h-12 hover:opacity-90 transition-opacity',
                  (post as unknown as BotPost).type === 'bot_post' && 'ring-2 ring-primary/20'
                )}>
                  <AvatarImage src={post.author.avatar_url} alt={post.author.name} />
                  <AvatarFallback className={`bg-gradient-to-br ${post.author.color || 'from-primary to-primary'} text-white text-sm font-medium`}>
                    {post.author.initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link to={`/user/${post.author.username}`} className="font-semibold hover:underline">
                    {post.author.name}
                  </Link>
                  {(post.author.verified || (post.author as { is_verified?: boolean }).is_verified) && (
                    <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
                  )}
                  {(post.author as { is_premium?: boolean }).is_premium && <PremiumBadge />}
                  {/* Bot Post Badge */}
                  {(post as unknown as BotPost).type === 'bot_post' && (post as unknown as BotPost).bot_type === 'trending_projects' && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-primary/10 text-primary border-0 font-medium"
                    >
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                      Weekly Trending
                    </Badge>
                  )}
                </div>
                <Link to={`/user/${post.author.username}`} className="text-muted-foreground text-sm">
                  @{post.author.username}
                </Link>
              </div>
            </div>

            {/* More Menu - Hide for bot posts */}
            {(post as unknown as BotPost).type !== 'bot_post' && (
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
            )}
          </div>

          {/* Content */}
          <div className="mb-4 text-[17px] leading-relaxed">
            <MarkdownContent content={post.content} />
          </div>

          {/* Featured Projects for Bot Posts */}
          {(post as unknown as BotPost).type === 'bot_post' && (post as unknown as BotPost).featured_projects && (post as unknown as BotPost).featured_projects!.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {(post as unknown as BotPost).featured_projects!.map((project: FeaturedProject) => (
                <FeaturedProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {/* Media - Only for non-bot posts */}
          {(post as unknown as BotPost).type !== 'bot_post' && post.media.length > 0 && (
            <div className={cn(
              'mb-4 rounded-2xl overflow-hidden border border-border',
              post.media.length > 1 && 'grid grid-cols-2 gap-0.5'
            )}>
              {post.media.slice(0, 4).map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  alt="Post image"
                  className="w-full object-cover aspect-[16/9]"
                />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-muted-foreground text-sm mb-4">
            {formatDate(post.created_at)}
          </div>

          {/* Action Buttons with Stats - Hide for bot posts */}
          {(post as unknown as BotPost).type !== 'bot_post' && (
            <div className="flex items-center justify-between pt-3 border-t border-border -ml-2">
              {/* Left Column: Comments, Likes, Views */}
              <div className="flex items-center gap-1">
                {/* Comment */}
                <button
                  onClick={() => { }}
                  className="flex items-center gap-1.5 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                    <MessageCircle className="w-[18px] h-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    {commentCount > 0 && commentCount}
                  </span>
                </button>

                {/* Like */}
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-rose-500/10 transition-colors">
                    <Heart
                      className={cn(
                        'w-[18px] h-[18px] transition-colors',
                        isLiked ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground group-hover:text-rose-500'
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      isLiked ? 'text-rose-500' : 'text-muted-foreground group-hover:text-rose-500'
                    )}
                  >
                    {likeCount > 0 && likeCount}
                  </span>
                </button>

                {/* Views/Impressions */}
                <div className="flex items-center gap-1.5">
                  <div className="p-2">
                    <Eye className="w-[18px] h-[18px] text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {impressions > 0 && formatCount(impressions)}
                  </span>
                </div>
              </div>

              {/* Right Column: Repost, Bookmark */}
              <div className="flex items-center gap-1">
                {/* Repost */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 group"
                    >
                      <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                        <Repeat2
                          className={cn(
                            'w-[18px] h-[18px] transition-colors',
                            isReposted ? 'text-green-500' : 'text-muted-foreground group-hover:text-green-500'
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-sm transition-colors',
                          isReposted ? 'text-green-500' : 'text-muted-foreground group-hover:text-green-500'
                        )}
                      >
                        {repostCount > 0 && repostCount}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={handleRepost}>
                      <Repeat2 className="w-4 h-4 mr-2" />
                      {isReposted ? 'Undo repost' : 'Repost'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleQuote}>
                      <Quote className="w-4 h-4 mr-2" />
                      Quote
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Bookmark */}
                <button
                  onClick={handleBookmark}
                  className="group"
                >
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Bookmark
                      className={cn(
                        'w-[18px] h-[18px] transition-colors',
                        isBookmarked ? 'text-primary fill-primary' : 'text-muted-foreground group-hover:text-primary'
                      )}
                    />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Comments Section - Hide for bot posts */}
        {(post as unknown as BotPost).type !== 'bot_post' && (
          isLoadingComments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="px-4">
              <CommentsSection
                comments={comments}
                onAddComment={handleAddComment}
                onLikeComment={handleLikeComment}
                onDeleteComment={handleDeleteComment}
                onReportComment={handleReportComment}
              />
            </div>
          )
        )}

        {/* Share Card - Sticky at bottom on mobile, hide for bot posts */}
        {(post as unknown as BotPost).type !== 'bot_post' && (
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
        )}
      </div>
    </div>
  )
}
