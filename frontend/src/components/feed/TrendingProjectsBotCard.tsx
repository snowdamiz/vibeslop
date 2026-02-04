import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  CheckCircle2,
  MessageCircle,
  Heart,
  Eye,
  Repeat2,
  Bookmark,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react'
import { FeaturedProjectCard } from './FeaturedProjectCard'
import type { BotPost } from './types'

interface TrendingProjectsBotCardProps {
  item: BotPost
  showBorder?: boolean
  trackRef?: (element: HTMLElement | null) => void
}

export function TrendingProjectsBotCard({
  item,
  showBorder = true,
  trackRef
}: TrendingProjectsBotCardProps) {
  const navigate = useNavigate()
  const projects = item.featured_projects || []

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a link (avatar, username, project cards)
    if ((e.target as HTMLElement).closest('a')) {
      return
    }
    navigate(`/bot-post/${item.id}`)
  }

  return (
    <article
      ref={trackRef}
      data-impression-type="bot_post"
      data-impression-id={item.id}
      onClick={handleCardClick}
      className={cn(
        'block hover:bg-muted/30 transition-colors cursor-pointer',
        showBorder && 'border-b border-border'
      )}
    >
      <div className="max-w-[600px] mx-auto px-4 py-3">
        <div className="flex gap-3">
          {/* Avatar */}
          <Link
            to={`/user/${item.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <Avatar className="w-10 h-10 hover:opacity-90 transition-opacity">
              <AvatarImage src={item.author.avatar_url} alt={item.author.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                O
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
                {item.author.is_verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/20 flex-shrink-0" />
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-primary/10 text-primary border-0 font-medium flex-shrink-0"
                >
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  Weekly Trending
                </Badge>
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
                  <DropdownMenuItem onClick={() => navigate(`/bot-post/${item.id}`)}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content Text */}
            <div className="text-[15px] text-foreground/90 leading-normal mb-3">
              {item.content}
            </div>

            {/* Projects Grid - 2 columns on desktop, 1 on mobile */}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {projects.slice(0, 2).map((project) => (
                  <FeaturedProjectCard key={project.id} project={project} />
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
                </button>

                {/* Like */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-rose-500/10 transition-colors">
                    <Heart className="w-[18px] h-[18px] text-muted-foreground group-hover:text-rose-500 transition-colors" />
                  </div>
                </button>

                {/* Impressions */}
                <div className="flex items-center gap-1.5">
                  <div className="p-2">
                    <Eye className="w-[18px] h-[18px] text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Right Column: Repost, Bookmark */}
              <div className="flex items-center gap-1">
                {/* Repost */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                    <Repeat2 className="w-[18px] h-[18px] text-muted-foreground group-hover:text-green-500 transition-colors" />
                  </div>
                </button>

                {/* Bookmark */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="group"
                >
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Bookmark className="w-[18px] h-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
