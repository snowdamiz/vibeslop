import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, CheckCircle2 } from 'lucide-react'
import { PremiumBadge } from '@/components/PremiumBadge'
import type { FeaturedProject } from './types'
import { cn } from '@/lib/utils'

interface FeaturedProjectCardProps {
  project: FeaturedProject
  className?: string
}

export function FeaturedProjectCard({ project, className }: FeaturedProjectCardProps) {
  const techTags = [...(project.tools || []), ...(project.stack || [])]

  return (
    <Link
      to={`/project/${project.id}`}
      className={cn(
        'block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors',
        className
      )}
    >
      {/* Project Image */}
      {project.image ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <span className="text-4xl font-bold text-primary/20">
            {project.title.charAt(0)}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h4 className="font-semibold text-sm line-clamp-1 mb-1">{project.title}</h4>

        {/* Author */}
        <div className="flex items-center gap-1.5 mb-2">
          <Avatar className="w-4 h-4">
            <AvatarImage src={project.author.avatar_url} alt={project.author.name} />
            <AvatarFallback className="text-[8px] bg-primary/10">
              {project.author.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {project.author.name}
          </span>
          {project.author.is_verified && (
            <CheckCircle2 className="w-3 h-3 text-primary fill-primary/20 flex-shrink-0" />
          )}
          {project.author.is_premium && <PremiumBadge />}
        </div>

        {/* Tech Tags */}
        {techTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {techTags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] font-normal px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
            {techTags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                +{techTags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>{project.likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>{project.comments}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
