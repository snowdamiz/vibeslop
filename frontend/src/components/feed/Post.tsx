import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Bookmark,
  MoreHorizontal,
  ExternalLink,
  Flag,
  UserMinus,
  Code2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedItem, ProjectPost } from './types'
import { isProjectPost } from './types'

interface PostProps {
  item: FeedItem
  showBorder?: boolean
}

export function Post({ item, showBorder = true }: PostProps) {
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isReposted, setIsReposted] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likes)
  const [repostCount, setRepostCount] = useState(item.reposts)

  const isProject = isProjectPost(item)
  const detailPath = isProject ? `/project/${item.id}` : `/post/${item.id}`

  const handlePostClick = (e: React.MouseEvent) => {
    // Only navigate if clicking on the post itself, not on interactive elements
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) {
      return
    }
    navigate(detailPath)
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsReposted(!isReposted)
    setRepostCount(isReposted ? repostCount - 1 : repostCount + 1)
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsBookmarked(!isBookmarked)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'now'
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
      onClick={handlePostClick}
      className={cn(
        'block hover:bg-muted/30 transition-colors cursor-pointer',
        showBorder && 'border-b border-border'
      )}
    >
      <div className="flex gap-3 max-w-[600px] mx-auto px-4 py-3">
        {/* Avatar */}
        <Link
          to={`/user/${item.author.username}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0"
        >
          <Avatar className="w-10 h-10 hover:opacity-90 transition-opacity">
            <AvatarImage src={`https://i.pravatar.cc/150?img=${item.author.username?.charCodeAt(0) % 70 || 1}`} alt={item.author.name} />
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
                {formatTimeAgo(item.createdAt)}
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
                <DropdownMenuItem>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Unfollow @{item.author.username}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
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
          <p className="text-[15px] text-foreground/90 leading-normal mb-3 whitespace-pre-wrap">
            {item.content}
          </p>

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
          <div className="flex items-center justify-between max-w-md -ml-2">
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

            {/* Repost */}
            <button
              onClick={handleRepost}
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

            {/* Share */}
            <button
              onClick={(e) => e.stopPropagation()}
              className="group"
            >
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                <Share className="w-[18px] h-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>

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
    </article>
  )
}

// Legacy exports for backwards compatibility during migration
export type { PostAuthor, ProjectPost as PostProject } from './types'
