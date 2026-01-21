import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  MoreHorizontal,
  ExternalLink,
  Flag,
  UserMinus,
  Code2,
  Trash2,
  Quote,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { QuotedPostPreview } from './QuotedPostPreview'
import type { FeedItem, ProjectPost, StatusUpdate } from './types'
import { isProjectPost, isStatusUpdate } from './types'

interface PostProps {
  item: FeedItem
  showBorder?: boolean
  onDelete?: (id: string) => void
  onUnbookmark?: (id: string) => void
  onQuote?: (item: FeedItem) => void
  trackRef?: (element: HTMLElement | null) => void
}

export function Post({ item, showBorder = true, onDelete, onUnbookmark, onQuote, trackRef }: PostProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(item.liked ?? false)
  const [isBookmarked, setIsBookmarked] = useState(item.bookmarked ?? false)
  const [isReposted, setIsReposted] = useState(item.reposted ?? false)
  const [likeCount, setLikeCount] = useState(item.likes)
  const [repostCount, setRepostCount] = useState(item.reposts)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // No need for useEffect to sync state if we use a key on the Post component in the parent
  // However, if we can't ensure that, we can use this pattern:
  const [lastItemId, setLastItemId] = useState(item.id)

  if (item.id !== lastItemId) {
    setIsLiked(item.liked ?? false)
    setIsBookmarked(item.bookmarked ?? false)
    setIsReposted(item.reposted ?? false)
    setLikeCount(item.likes)
    setRepostCount(item.reposts)
    setLastItemId(item.id)
  }

  const isProject = isProjectPost(item)
  // For reposts, use original_id to navigate to the original content
  const contentId = item.original_id || item.id
  const detailPath = isProject ? `/project/${contentId}` : `/post/${contentId}`
  const isOwner = user?.username === item.author.username

  const handlePostClick = (e: React.MouseEvent) => {
    // Only navigate if clicking on the post itself, not on interactive elements
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) {
      return
    }
    navigate(detailPath)
  }

  // For reposts, engagement actions target the original content
  const engagementId = contentId

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const type = isProject ? 'project' : 'post'
      const response = await api.toggleLike(type, engagementId)
      setIsLiked(response.liked)
      setLikeCount(response.liked ? likeCount + 1 : likeCount - 1)
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleRepost = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const type = isProject ? 'project' : 'post'
      const response = await api.toggleRepost(type, engagementId)
      setIsReposted(response.reposted)
      setRepostCount(response.reposted ? repostCount + 1 : repostCount - 1)
    } catch (error) {
      console.error('Failed to toggle repost:', error)
    }
  }

  const handleQuote = (e: React.MouseEvent) => {
    e.stopPropagation()
    onQuote?.(item)
  }

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const type = isProject ? 'project' : 'post'
      const response = await api.toggleBookmark(type, engagementId)
      setIsBookmarked(response.bookmarked)
      // Notify parent if unbookmarked (useful for bookmarks page)
      if (!response.bookmarked && onUnbookmark) {
        onUnbookmark(item.id)
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      // For reposts, use original_id to delete the actual post/project
      const deleteId = item.original_id || item.id
      if (isProject) {
        await api.deleteProject(deleteId)
      } else {
        await api.deletePost(deleteId)
      }
      setShowDeleteDialog(false)
      setIsDeleting(false)
      // Use the item's actual id (repost id for reposts) for filtering
      onDelete?.(item.id)
    } catch (error) {
      console.error(`Failed to delete ${isProject ? 'project' : 'post'}:`, error)
      setIsDeleting(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInSeconds < 60) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInDays < 7) return `${diffInDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  // Get image(s) based on post type
  const getImages = (): string[] => {
    if (isProject) {
      return (item as ProjectPost).image ? [(item as ProjectPost).image!] : []
    }
    return item.media || []
  }

  const images = getImages()

  return (
    <article
      ref={trackRef}
      data-impression-type={isProject ? 'project' : 'post'}
      data-impression-id={contentId}
      onClick={handlePostClick}
      className={cn(
        'block hover:bg-muted/30 transition-colors cursor-pointer',
        showBorder && 'border-b border-border'
      )}
    >
      <div className="max-w-[600px] mx-auto px-4 py-3">
        {/* Reposted By Indicator */}
        {item.is_repost && item.reposted_by && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-2 ml-[52px]">
            <Repeat2 className="w-3.5 h-3.5" />
            <Link
              to={`/user/${item.reposted_by.username}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium hover:underline"
            >
              {item.reposted_by.name}
            </Link>
            <span>reposted</span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <Link
            to={`/user/${item.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <Avatar className="w-10 h-10 hover:opacity-90 transition-opacity">
              <AvatarImage src={item.author.avatar_url} alt={item.author.name} />
              <AvatarFallback
                className={cn(
                  'text-white text-sm font-medium',
                  item.author.color || 'bg-gradient-to-br from-violet-500 to-purple-600'
                )}
              >
                {item.author.initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <Link
                  to={`/user/${item.author.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-sm hover:underline truncate"
                >
                  {item.author.name}
                </Link>
                <Link
                  to={`/user/${item.author.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground text-sm truncate"
                >
                  @{item.author.username}
                </Link>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatTimeAgo(item.created_at)}
                </span>
              </div>

              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full hover:bg-primary/10 hover:text-primary -mr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(detailPath)}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {isProject ? 'Open project' : 'Open post'}
                  </DropdownMenuItem>
                  {!isOwner && (
                    <DropdownMenuItem>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Unfollow @{item.author.username}
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={handleDeleteClick}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isOwner && (
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Project Title (only for project posts) */}
            {isProject && (
              <h3 className="font-semibold text-[15px] mt-0.5 mb-1">
                {(item as ProjectPost).title}
              </h3>
            )}

            {/* Description/Content */}
            <div className="text-[15px] text-foreground/90 leading-normal mb-3">
              {item.content.length > 300 ? (
                <>
                  <MarkdownContent content={item.content.slice(0, 300).trimEnd() + '...'} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(detailPath)
                    }}
                    className="text-primary hover:underline text-sm font-medium mt-1 inline-block"
                  >
                    Read more
                  </button>
                </>
              ) : (
                <MarkdownContent content={item.content} />
              )}
            </div>

            {/* Images */}
            {images.length > 0 && (
              <div className={cn(
                'mt-2 mb-3 rounded-2xl overflow-hidden border border-border',
                images.length > 1 && 'grid grid-cols-2 gap-0.5'
              )}>
                {images.slice(0, 4).map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={isProject ? (item as ProjectPost).title : 'Post image'}
                    className={cn(
                      'w-full object-cover',
                      images.length === 1 ? 'aspect-[16/9]' : 'aspect-square'
                    )}
                  />
                ))}
              </div>
            )}

            {/* Quoted Post/Project */}
            {isStatusUpdate(item) && (item as StatusUpdate).quoted_post && (
              <QuotedPostPreview
                item={(item as StatusUpdate).quoted_post!}
                className="mb-3"
              />
            )}
            {isStatusUpdate(item) && (item as StatusUpdate).quoted_project && (
              <QuotedPostPreview
                item={(item as StatusUpdate).quoted_project!}
                className="mb-3"
              />
            )}

            {/* Built With Tags (only for project posts) */}
            {isProject && ((item as ProjectPost).tools?.length || (item as ProjectPost).stack?.length) && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                {(item as ProjectPost).tools?.map((tool) => (
                  <span
                    key={tool}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                  >
                    {tool}
                  </span>
                ))}
                {(item as ProjectPost).stack?.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {/* Engagement Actions */}
            <div className="flex items-center justify-between -ml-2">
              {/* Left Column: Comments, Likes, Views */}
              <div className="flex items-center gap-1">
                {/* Reply/Comment */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                    <MessageCircle className="w-[18px] h-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    {item.comments > 0 && item.comments}
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
                        isLiked
                          ? 'text-rose-500 fill-rose-500'
                          : 'text-muted-foreground group-hover:text-rose-500'
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      isLiked
                        ? 'text-rose-500'
                        : 'text-muted-foreground group-hover:text-rose-500'
                    )}
                  >
                    {likeCount > 0 && likeCount}
                  </span>
                </button>

                {/* Impressions */}
                <div className="flex items-center gap-1.5">
                  <div className="p-2">
                    <Eye className="w-[18px] h-[18px] text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.impressions > 0 && formatCount(item.impressions)}
                  </span>
                </div>
              </div>

              {/* Right Column: Repost, Bookmark */}
              <div className="flex items-center gap-1">
                {/* Repost */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 group"
                    >
                      <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                        <Repeat2
                          className={cn(
                            'w-[18px] h-[18px] transition-colors',
                            isReposted
                              ? 'text-green-500'
                              : 'text-muted-foreground group-hover:text-green-500'
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-sm transition-colors',
                          isReposted
                            ? 'text-green-500'
                            : 'text-muted-foreground group-hover:text-green-500'
                        )}
                      >
                        {repostCount > 0 && repostCount}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => handleRepost()}>
                      <Repeat2 className="w-4 h-4 mr-2" />
                      {isReposted ? 'Undo repost' : 'Repost'}
                    </DropdownMenuItem>
                    {onQuote && (
                      <DropdownMenuItem onClick={handleQuote}>
                        <Quote className="w-4 h-4 mr-2" />
                        Quote
                      </DropdownMenuItem>
                    )}
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
                        isBookmarked
                          ? 'text-primary fill-primary'
                          : 'text-muted-foreground group-hover:text-primary'
                      )}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={isProject ? "Delete project?" : "Delete post?"}
        description={isProject
          ? "This can't be undone. The project and all its associated data will be permanently removed from your profile and the feed."
          : "This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </article>
  )
}

// Legacy exports for backwards compatibility during migration
export type { PostAuthor, ProjectPost as PostProject } from './types'
