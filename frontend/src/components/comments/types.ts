export interface CommentAuthor {
  name: string
  initials: string
  username?: string
}

export interface Comment {
  id: string
  author: CommentAuthor
  content: string
  likes: number
  createdAt: string
  replyTo?: string // Parent comment ID
  replies?: Comment[] // Nested replies
  replyCount?: number // Total replies in thread
  isLiked?: boolean
}

export interface CommentsProps {
  comments: Comment[]
  onAddComment?: (content: string, replyTo?: string) => void
  onLikeComment?: (commentId: string) => void
}
