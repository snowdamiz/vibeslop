import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  AtSign,
  Bell,
  MoreHorizontal,
  Settings,
  CheckCheck,
  DollarSign,
  CheckCircle,
  XCircle,
  Trophy,
  Star,
  Quote,
  Bookmark,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, type GroupedNotification } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'

type NotificationTab = 'all' | 'mentions'

const getNotificationIcon = (type: GroupedNotification['type']) => {
  switch (type) {
    case 'like':
      return { icon: Heart, color: 'text-rose-500' }
    case 'comment':
      return { icon: MessageCircle, color: 'text-primary' }
    case 'follow':
      return { icon: UserPlus, color: 'text-primary' }
    case 'repost':
      return { icon: Repeat2, color: 'text-green-500' }
    case 'mention':
      return { icon: AtSign, color: 'text-primary' }
    case 'quote':
      return { icon: Quote, color: 'text-violet-500' }
    case 'bookmark':
      return { icon: Bookmark, color: 'text-yellow-500' }
    case 'bid_received':
      return { icon: DollarSign, color: 'text-emerald-500' }
    case 'bid_accepted':
      return { icon: CheckCircle, color: 'text-green-500' }
    case 'bid_rejected':
      return { icon: XCircle, color: 'text-gray-500' }
    case 'gig_completed':
      return { icon: Trophy, color: 'text-yellow-500' }
    case 'review_received':
      return { icon: Star, color: 'text-amber-500' }
  }
}

const getNotificationText = (notification: GroupedNotification) => {
  switch (notification.type) {
    case 'like':
      return notification.target?.title
        ? `liked your project "${notification.target.title}"`
        : 'liked your post'
    case 'comment':
      return notification.target?.title
        ? `commented on your project "${notification.target.title}"`
        : 'commented on your post'
    case 'follow':
      return 'followed you'
    case 'repost':
      return notification.target?.title
        ? `reposted your project "${notification.target.title}"`
        : 'reposted your post'
    case 'mention':
      return notification.target?.title
        ? `mentioned you on "${notification.target.title}"`
        : 'mentioned you'
    case 'quote':
      return notification.target?.title
        ? `quoted your project "${notification.target.title}"`
        : 'quoted your post'
    case 'bookmark':
      return notification.target?.title
        ? `bookmarked your project "${notification.target.title}"`
        : 'bookmarked your post'
    case 'bid_received':
      return 'placed a bid on your gig'
    case 'bid_accepted':
      return 'hired you for a gig'
    case 'bid_rejected':
      return 'The gig you bid on was filled'
    case 'gig_completed':
      return 'marked your gig as complete'
    case 'review_received':
      return 'left you a review'
  }
}

const getNotificationLink = (notification: GroupedNotification) => {
  if (notification.type === 'follow') {
    return `/user/${notification.actors[0]?.username}`
  }
  // For quote notifications, navigate to the quote post (action_target) instead of the original post
  if (notification.type === 'quote' && notification.action_target) {
    return `/post/${notification.action_target.id}`
  }
  if (notification.target) {
    if (notification.target.type === 'Gig') {
      return `/gigs/${notification.target.id}`
    }
    return notification.target.type === 'Project'
      ? `/project/${notification.target.id}`
      : `/post/${notification.target.id}`
  }
  return '#'
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'now'
  if (diffInMinutes < 60) return `${diffInMinutes}m`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface NotificationItemProps {
  notification: GroupedNotification
}

function NotificationItem({ notification }: NotificationItemProps) {
  const iconData = getNotificationIcon(notification.type)
  const Icon = iconData?.icon || Bell
  const color = iconData?.color || 'text-muted-foreground'
  const link = getNotificationLink(notification)
  const hasMultipleActors = notification.actor_count > 1
  const displayedActors = notification.actors.slice(0, 8)
  const remainingCount = notification.actor_count - displayedActors.length

  return (
    <Link
      to={link}
      className={cn(
        'flex gap-4 px-4 py-4 hover:bg-muted/30 transition-colors border-b border-border',
        !notification.read && 'bg-primary/5'
      )}
    >
      {/* Icon column */}
      <div className="flex-shrink-0 w-10 flex justify-end pt-0.5">
        <Icon className={cn('w-6 h-6', color)} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Actor Avatars row */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex -space-x-1.5">
            {displayedActors.map((actor, index) => (
              <Avatar
                key={actor.id}
                className="w-8 h-8 border-2 border-background"
                style={{ zIndex: displayedActors.length - index }}
              >
                {actor.avatar_url && (
                  <AvatarImage
                    src={actor.avatar_url}
                    alt={actor.display_name}
                  />
                )}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-medium">
                  {actor.initials}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {remainingCount > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              +{remainingCount}
            </span>
          )}
        </div>

        {/* Text content */}
        <p className="text-[15px] leading-snug">
          <span className="font-bold">{notification.actors[0]?.display_name}</span>
          {hasMultipleActors && notification.actor_count === 2 && (
            <span className="font-bold"> and {notification.actors[1]?.display_name}</span>
          )}
          {hasMultipleActors && notification.actor_count > 2 && (
            <span> and {notification.actor_count - 1} others</span>
          )}
          {' '}
          <span className="text-muted-foreground">{getNotificationText(notification)}</span>
        </p>

        {/* Preview content */}
        {notification.content && (
          <p className="text-[15px] text-muted-foreground mt-1 line-clamp-2">
            {notification.content}
          </p>
        )}

        {/* Post preview for likes/reposts without content */}
        {!notification.content && notification.target?.preview && (
          <p className="text-[15px] text-muted-foreground mt-1 line-clamp-1">
            {notification.target.preview}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-sm text-muted-foreground mt-2">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary self-start mt-2" />
      )}
    </Link>
  )
}

const NOTIFICATIONS_LIMIT = 10

export function Notifications() {
  const { isAuthenticated } = useAuth()
  const { clearNotificationCount } = useNotifications()
  const [activeTab, setActiveTab] = useState<NotificationTab>('all')
  const [notifications, setNotifications] = useState<GroupedNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref for the sentinel element at the bottom
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch notifications on mount and mark as read
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const fetchNotifications = async () => {
      try {
        setIsLoading(true)
        const response = await api.getNotifications({ limit: NOTIFICATIONS_LIMIT })
        setNotifications(response.data)
        setUnreadCount(response.unread_count)
        setHasMore(response.data.length >= NOTIFICATIONS_LIMIT)

        // Mark all as read after viewing the page (clears badge counter immediately)
        if (response.unread_count > 0) {
          clearNotificationCount() // Clear badge immediately
          api.markAllNotificationsRead() // Fire and forget to backend
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
        setError('Failed to load notifications')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [isAuthenticated, clearNotificationCount])

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    try {
      setIsLoadingMore(true)
      const response = await api.getNotifications({
        limit: NOTIFICATIONS_LIMIT,
        offset: notifications.length
      })

      if (response.data.length > 0) {
        setNotifications(prev => [...prev, ...response.data])
        setHasMore(response.data.length >= NOTIFICATIONS_LIMIT)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more notifications:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, notifications.length])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [loadMore, hasMore, isLoadingMore, isLoading])

  const filteredNotifications = activeTab === 'mentions'
    ? notifications.filter(n => n.type === 'mention')
    : notifications

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }

  // Show login message if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sign in to see notifications</h3>
          <p className="text-muted-foreground">
            You need to be signed in to view your notifications.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-bold text-lg leading-tight">Notifications</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount} {unreadCount === 1 ? 'unread' : 'unread'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {unreadCount > 0 && (
                <>
                  <DropdownMenuItem onClick={handleMarkAllRead}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Notification settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="border-b border-border" />

        {/* Tabs */}
        <div className="flex max-w-[600px] mx-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
              activeTab === 'all' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            All
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('mentions')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50 flex items-center justify-center gap-1.5',
              activeTab === 'mentions' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <AtSign className="w-4 h-4" />
            Mentions
            {activeTab === 'mentions' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-w-[600px] mx-auto">
        {isLoading ? (
          <div className="divide-y divide-border">
            {/* Skeleton notification items - show 6 for good coverage */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                {/* Icon skeleton */}
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />

                {/* Content skeleton */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    {/* Avatar skeleton */}
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />

                    {/* Text content skeleton */}
                    <div className="flex-1 min-w-0">
                      {/* Name and action text */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      </div>

                      {/* Preview content (show on some items) */}
                      {i % 2 === 0 && (
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse mt-1" />
                      )}

                      {/* Timestamp */}
                      <div className="h-3 w-8 bg-muted rounded animate-pulse mt-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load notifications</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <>
            {filteredNotifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
            {/* Sentinel element for infinite scroll */}
            <div ref={loadMoreRef} className="h-1" />
            {/* Loading indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {/* End of list indicator */}
            {!hasMore && notifications.length > 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                You've reached the end
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'mentions' ? 'No mentions yet' : 'No notifications yet'}
            </h3>
            <p className="text-muted-foreground">
              {activeTab === 'mentions'
                ? 'When someone mentions you, it will show up here.'
                : 'When you get notifications, they will show up here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
