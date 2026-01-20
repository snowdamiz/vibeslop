import { useState, useEffect } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, ChevronDown, ChevronUp, MoreHorizontal, Trash2, Flag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Comment as CommentType } from './types'
import { MentionInput } from '@/components/ui/mention-input'

interface CommentProps {
  comment: CommentType
  depth?: number
  onReply?: (commentId: string, content: string) => void
  onLike?: (commentId: string) => void
  onDelete?: (commentId: string) => void
  onReport?: (commentId: string) => void
  maxDepth?: number
}

export function Comment({
  comment,
  depth = 0,
  onReply,
  onLike,
  onDelete,
  onReport,
  maxDepth = 3,
}: CommentProps) {
  const { user } = useAuth()
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isLiked, setIsLiked] = useState(comment.isLiked ?? false)
  const [showReplies, setShowReplies] = useState(depth < 2)
  const [likeCount, setLikeCount] = useState(comment.likes)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync local state with props when comment data changes (e.g., after page refresh)
  useEffect(() => {
    setIsLiked(comment.isLiked ?? false)
    setLikeCount(comment.likes)
  }, [comment.isLiked, comment.likes])

  // Check if current user owns this comment
  const isOwner = user?.username && comment.author.username === user.username

  const hasReplies = comment.replies && comment.replies.length > 0
  const replyCount = comment.replyCount ?? comment.replies?.length ?? 0

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))
    onLike?.(comment.id)
  }

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply?.(comment.id, replyContent)
      setReplyContent('')
      setIsReplying(false)
    }
  }

  const handleCancelReply = () => {
    setReplyContent('')
    setIsReplying(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete?.(comment.id)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Flatten deeply nested replies
  const shouldFlatten = depth >= maxDepth

  return (
    <div className="relative">
      {/* Thread line for nested comments */}
      {depth > 0 && (
        <div
          className="absolute left-4 top-0 bottom-0 w-px bg-border"
          style={{ left: '-12px' }}
        />
      )}

      <div className={`relative ${depth > 0 ? 'pl-0' : ''}`}>
        {/* Comment content */}
        <div className="flex gap-3">
          {/* Avatar with thread connector */}
          <div className="relative flex-shrink-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={comment.author.avatar_url} alt={comment.author.name} />
              <AvatarFallback className="text-xs bg-muted">
                {comment.author.initials}
              </AvatarFallback>
            </Avatar>
            {/* Vertical line connecting to replies */}
            {hasReplies && showReplies && (
              <div className="absolute left-1/2 top-8 bottom-0 w-px bg-border -translate-x-1/2 h-[calc(100%+8px)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Author and timestamp */}
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm hover:underline cursor-pointer">
                  {comment.author.name}
                </span>
                {comment.author.username && (
                  <span className="text-xs text-muted-foreground">
                    @{comment.author.username}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {comment.created_at}
                </span>
              </div>

              {/* More menu */}
              {((isOwner && onDelete) || (!isOwner && onReport)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && onDelete && (
                      <DropdownMenuItem
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete comment
                      </DropdownMenuItem>
                    )}
                    {!isOwner && onReport && (
                      <DropdownMenuItem
                        onClick={() => onReport(comment.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Reply indicator */}
            {comment.replyTo && depth === 0 && (
              <p className="text-xs text-muted-foreground mb-1">
                Replying to a comment
              </p>
            )}

            {/* Comment text */}
            <div className="text-sm text-foreground mb-2">
              <MarkdownContent content={comment.content} />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  isLiked
                    ? 'text-red-500'
                    : 'text-muted-foreground hover:text-red-500'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`}
                />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>

              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {replyCount > 0 && <span>{replyCount}</span>}
              </button>
            </div>

            {/* Delete confirmation dialog */}
            <ConfirmDialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
              title="Delete comment"
              description="Are you sure you want to delete this comment? This action cannot be undone."
              confirmText={isDeleting ? "Deleting..." : "Delete"}
              onConfirm={handleDelete}
              variant="destructive"
            />

            {/* Inline reply composer */}
            <AnimatePresence>
              {isReplying && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="flex gap-2">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={user?.avatar_url} alt={user?.name || 'You'} />
                      <AvatarFallback className="text-xs bg-muted">{user?.initials || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <MentionInput
                        value={replyContent}
                        onChange={setReplyContent}
                        placeholder={`Reply to ${comment.author.name}...`}
                        className="min-h-[60px]"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelReply}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleReply}
                          disabled={!replyContent.trim()}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nested replies */}
        {hasReplies && (
          <div className="mt-3">
            {/* Show/hide replies toggle */}
            {!showReplies && (
              <button
                onClick={() => setShowReplies(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors ml-11"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}

            <AnimatePresence>
              {showReplies && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Collapse button */}
                  {depth < 1 && replyCount > 0 && (
                    <button
                      onClick={() => setShowReplies(false)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-11 mb-2"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      Hide replies
                    </button>
                  )}

                  {/* Replies list */}
                  <div className={`space-y-3 ${shouldFlatten ? 'ml-0' : 'ml-11'}`}>
                    {comment.replies?.map((reply) => (
                      <Comment
                        key={reply.id}
                        comment={reply}
                        depth={shouldFlatten ? depth : depth + 1}
                        onReply={onReply}
                        onLike={onLike}
                        onDelete={onDelete}
                        onReport={onReport}
                        maxDepth={maxDepth}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
