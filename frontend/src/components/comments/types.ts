export interface CommentAuthor {
  name: string
  initials: string
  username?: string
  avatar_url?: string
}

export interface Comment {
  id: string
  author: CommentAuthor
  content: string
  likes: number
  created_at: string
  replyTo?: string // Parent comment ID
  replies?: Comment[] // Nested replies
  replyCount?: number // Total replies in thread
  isLiked?: boolean
}

export interface CommentsProps {
  comments: Comment[]
  onAddComment?: (content: string, replyTo?: string) => void
  onLikeComment?: (commentId: string) => void
  onDeleteComment?: (commentId: string) => void
  onReportComment?: (commentId: string) => void
}
