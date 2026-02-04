import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { Comment } from './Comment'
import type { Comment as CommentType } from './types'
import { cn } from '@/lib/utils'
import { ArrowUpDown, Clock, Flame, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { MentionInput } from '@/components/ui/mention-input'

interface CommentsSectionProps {
  comments: CommentType[]
  onAddComment?: (content: string, replyTo?: string) => void
  onLikeComment?: (commentId: string) => void
  onDeleteComment?: (commentId: string) => void
  onReportComment?: (commentId: string) => void
  autoFocus?: boolean
}

type SortOption = 'newest' | 'oldest' | 'top'

export function CommentsSection({
  comments: initialComments,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onReportComment,
  autoFocus = false,
}: CommentsSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentType[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [isFocused, setIsFocused] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle autoFocus - scroll to and focus the comment input
  useEffect(() => {
    if (autoFocus && commentInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        commentInputRef.current?.focus()
      }, 100)
    }
  }, [autoFocus])

  const MAX_CHARS = 500

  // Helper to recursively add a reply to the correct comment
  const addReplyToComment = (
    commentList: CommentType[],
    parentId: string,
    newReply: CommentType
  ): CommentType[] => {
    return commentList.map((comment) => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
          replyCount: (comment.replyCount || comment.replies?.length || 0) + 1,
        }
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, parentId, newReply),
        }
      }
      return comment
    })
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const comment: CommentType = {
      id: `new-${Date.now()}`,
      author: {
        name: user?.name || 'You',
        initials: user?.initials || 'U',
        username: user?.username,
        avatar_url: user?.avatar_url
      },
      content: newComment,
      likes: 0,
      created_at: 'Just now',
    }

    setComments((prev) => [comment, ...prev])
    setNewComment('')
    onAddComment?.(newComment)
  }

  const handleReply = (parentId: string, content: string) => {
    const reply: CommentType = {
      id: `reply-${Date.now()}`,
      author: {
        name: user?.name || 'You',
        initials: user?.initials || 'U',
        username: user?.username,
        avatar_url: user?.avatar_url
      },
      content,
      likes: 0,
      created_at: 'Just now',
      replyTo: parentId,
    }

    setComments((prev) => addReplyToComment(prev, parentId, reply))
    onAddComment?.(content, parentId)
  }

  const handleLike = (commentId: string) => {
    onLikeComment?.(commentId)
  }

  // Helper to recursively remove a comment from the list
  const removeComment = (
    commentList: CommentType[],
    commentId: string
  ): CommentType[] => {
    return commentList
      .filter((comment) => comment.id !== commentId)
      .map((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: removeComment(comment.replies, commentId),
          }
        }
        return comment
      })
  }

  const handleDelete = async (commentId: string) => {
    await onDeleteComment?.(commentId)
    setComments((prev) => removeComment(prev, commentId))
  }

  const handleReport = (commentId: string) => {
    onReportComment?.(commentId)
  }

  // Calculate total comments including replies
  const countAllComments = (commentList: CommentType[]): number => {
    return commentList.reduce((total, comment) => {
      const replyCount = comment.replies
        ? countAllComments(comment.replies)
        : 0
      return total + 1 + replyCount
    }, 0)
  }

  const totalComments = countAllComments(comments)

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'top') {
      return b.likes - a.likes
    }
    // For newest/oldest, we'd need actual timestamps - using array order as fallback
    if (sortBy === 'oldest') {
      return 0 // Keep original order
    }
    return 0 // newest - reverse original order would be applied during display
  })

  const displayComments = sortBy === 'newest' ? [...sortedComments].reverse() : sortedComments

  const charCount = newComment.length
  const isOverLimit = charCount > MAX_CHARS

  return (
    <div className="space-y-4 mb-4">
      {/* Main comment input */}
      <Card ref={containerRef} className={cn(
        "border-border transition-all !py-0 !gap-0",
        isFocused && "ring-2 ring-primary/20 border-primary/50"
      )}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-offset-2 ring-offset-background ring-primary/20">
              <AvatarImage src={user?.avatar_url} alt={user?.name || 'You'} />
              <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium">
                {user?.initials || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <MentionInput
                ref={commentInputRef}
                value={newComment}
                onChange={setNewComment}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Share your thoughts on this project..."
                className={cn(
                  "min-h-[80px]",
                  isOverLimit && "ring-2 ring-red-500"
                )}
                rows={3}
                maxLength={MAX_CHARS + 50}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs",
                    isOverLimit ? "text-red-500 font-medium" : "text-muted-foreground"
                  )}>
                    {charCount}/{MAX_CHARS}
                  </span>
                  {isOverLimit && (
                    <span className="text-xs text-red-500">Character limit exceeded</span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isOverLimit}
                  className="transition-all"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments header with count and sort */}
      {totalComments > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm font-medium">
            {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">Sort by:</span>
            <Button
              variant={sortBy === 'newest' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('newest')}
              className="h-7 px-2 text-xs"
            >
              <Clock className="w-3 h-3 mr-1" />
              Newest
            </Button>
            <Button
              variant={sortBy === 'top' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('top')}
              className="h-7 px-2 text-xs"
            >
              <Flame className="w-3 h-3 mr-1" />
              Top
            </Button>
            <Button
              variant={sortBy === 'oldest' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('oldest')}
              className="h-7 px-2 text-xs"
            >
              <ArrowUpDown className="w-3 h-3 mr-1" />
              Oldest
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {displayComments.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="border-t border-border">
            {displayComments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                layout
                className="py-4 border-b border-border last:border-b-0"
              >
                <Comment
                  comment={comment}
                  onReply={handleReply}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onReport={handleReport}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Empty state */}
      {comments.length === 0 && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">
            No comments yet
          </p>
          <p className="text-sm text-muted-foreground">
            Be the first to share your thoughts!
          </p>
        </div>
      )}
    </div>
  )
}
