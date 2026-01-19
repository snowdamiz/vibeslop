import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Comment as CommentType } from './types'

interface CommentProps {
  comment: CommentType
  depth?: number
  onReply?: (commentId: string, content: string) => void
  onLike?: (commentId: string) => void
  maxDepth?: number
}

export function Comment({
  comment,
  depth = 0,
  onReply,
  onLike,
  maxDepth = 3,
}: CommentProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isLiked, setIsLiked] = useState(comment.isLiked ?? false)
  const [showReplies, setShowReplies] = useState(depth < 2)
  const [likeCount, setLikeCount] = useState(comment.likes)

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
              <AvatarImage src={`https://i.pravatar.cc/150?img=${(comment.author.username?.charCodeAt(0) ?? comment.author.initials.charCodeAt(0)) % 70}`} alt={comment.author.name} />
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
            <div className="flex items-center gap-2 mb-0.5">
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
                {comment.createdAt}
              </span>
            </div>

            {/* Reply indicator */}
            {comment.replyTo && depth === 0 && (
              <p className="text-xs text-muted-foreground mb-1">
                Replying to a comment
              </p>
            )}

            {/* Comment text */}
            <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">
              {comment.content}
            </p>

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
                      <AvatarImage src="https://i.pravatar.cc/150?img=1" alt="You" />
                      <AvatarFallback className="text-xs bg-muted">U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${comment.author.name}...`}
                        className="w-full bg-muted rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
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
