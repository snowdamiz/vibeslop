import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuotedItem, FeedItem } from './types'

interface QuotedPostPreviewProps {
  item: QuotedItem | FeedItem
  onClick?: (e: React.MouseEvent) => void
  className?: string
}

export function QuotedPostPreview({ item, onClick, className }: QuotedPostPreviewProps) {
  const isProject = item.type === 'project'
  const detailPath = isProject ? `/project/${item.id}` : `/post/${item.id}`

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(e)
  }

  // Get title for projects
  const title = 'title' in item ? item.title : undefined
  
  // Get image for display
  const image = 'image' in item ? item.image : undefined
  
  // Get tools/stack for projects
  const tools = 'tools' in item ? item.tools : undefined
  const stack = 'stack' in item ? item.stack : undefined

  return (
    <Link
      to={detailPath}
      onClick={handleClick}
      className={cn(
        "block border border-border rounded-xl overflow-hidden hover:bg-muted/30 transition-colors",
        className
      )}
    >
      <div className="p-3">
        {/* Author info */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-5 h-5">
            <AvatarImage src={item.author.avatar_url} alt={item.author.name} />
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              {item.author.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">{item.author.name}</span>
          <span className="text-sm text-muted-foreground">@{item.author.username}</span>
        </div>

        {/* Project title */}
        {isProject && title && (
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
        )}

        {/* Content preview */}
        <p className="text-sm text-foreground/90 line-clamp-2">
          {item.content}
        </p>

        {/* Image preview for projects */}
        {image && (
          <div className="mt-2 rounded-lg overflow-hidden">
            <img
              src={image}
              alt={title || 'Project image'}
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        {/* Media preview for posts */}
        {'media' in item && item.media && item.media.length > 0 && (
          <div className="mt-2 rounded-lg overflow-hidden">
            <img
              src={item.media[0]}
              alt="Post image"
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        {/* Tools/Stack tags for projects */}
        {isProject && (tools?.length || stack?.length) && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Code2 className="w-3 h-3 text-muted-foreground" />
            {tools?.slice(0, 2).map((tool) => (
              <span
                key={tool}
                className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
              >
                {tool}
              </span>
            ))}
            {stack?.slice(0, 2).map((tech) => (
              <span
                key={tech}
                className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
