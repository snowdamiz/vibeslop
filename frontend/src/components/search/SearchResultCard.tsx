import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, FileCode, MessageSquare } from 'lucide-react'
import type { FeedItem } from '@/components/feed/types'
import type { SuggestedUser } from '@/lib/api'

interface UserResultProps {
  user: SuggestedUser
}

export function UserResultCard({ user }: UserResultProps) {
  const initials = user.display_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link
      to={`/user/${user.username}`}
      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
    >
      <Avatar className="w-12 h-12 ring-2 ring-background">
        {user.avatar_url && (
          <AvatarImage src={user.avatar_url} alt={user.display_name} />
        )}
        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[15px] truncate">{user.display_name}</h3>
          {user.is_verified && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Verified</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
        {user.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>
        )}
      </div>
      <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </Link>
  )
}

interface ProjectResultProps {
  project: FeedItem & { type: 'project' }
}

export function ProjectResultCard({ project }: ProjectResultProps) {
  return (
    <Link
      to={`/project/${project.id}`}
      className="block p-4 hover:bg-muted/50 transition-colors border-b border-border"
    >
      <div className="flex gap-3">
        {project.image && (
          <img
            src={project.image}
            alt={project.title}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <FileCode className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <h3 className="font-semibold text-[15px] line-clamp-2">{project.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {project.content}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {project.author && (
              <span>by @{project.author.username}</span>
            )}
            <span>•</span>
            <span>{project.likes} likes</span>
            <span>•</span>
            <span>{project.comments} comments</span>
          </div>
          {project.tools && project.tools.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.tools.slice(0, 3).map((tool) => (
                <Badge key={tool} variant="secondary" className="text-[10px] h-5">
                  {tool}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

interface PostResultProps {
  post: FeedItem & { type: 'update' }
}

export function PostResultCard({ post }: PostResultProps) {
  const authorInitials = post.author?.initials || 'U'

  return (
    <Link
      to={`/post/${post.id}`}
      className="block p-4 hover:bg-muted/50 transition-colors border-b border-border"
    >
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 ring-2 ring-background flex-shrink-0">
          {post.author?.avatar_url && (
            <AvatarImage src={post.author.avatar_url} alt={post.author.name} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-semibold">
            {authorInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            {post.author && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold">{post.author.name}</span>
                <span className="text-muted-foreground">@{post.author.username}</span>
              </div>
            )}
          </div>
          <p className="text-sm line-clamp-3 whitespace-pre-wrap mb-2">
            {post.content}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{post.likes} likes</span>
            <span>•</span>
            <span>{post.comments} comments</span>
            {post.reposts && post.reposts > 0 && (
              <>
                <span>•</span>
                <span>{post.reposts} reposts</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
