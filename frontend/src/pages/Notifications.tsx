import { useState, useEffect } from 'react'
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
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, type Notification } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

type NotificationTab = 'all' | 'mentions'

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'like':
      return { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' }
    case 'comment':
      return { icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10' }
    case 'follow':
      return { icon: UserPlus, color: 'text-primary', bg: 'bg-primary/10' }
    case 'repost':
      return { icon: Repeat2, color: 'text-green-500', bg: 'bg-green-500/10' }
    case 'mention':
      return { icon: AtSign, color: 'text-primary', bg: 'bg-primary/10' }
  }
}

const getNotificationText = (notification: Notification) => {
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
      return 'mentioned you in a post'
  }
}

const getNotificationLink = (notification: Notification) => {
  if (notification.type === 'follow') {
    return `/user/${notification.actor.username}`
  }
  if (notification.target) {
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
  notification: Notification
}

function NotificationItem({ notification }: NotificationItemProps) {
  const { icon: Icon, color, bg } = getNotificationIcon(notification.type)
  const link = getNotificationLink(notification)

  return (
    <Link
      to={link}
      className={cn(
        'flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border',
        !notification.read && 'bg-primary/5'
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          {/* Actor Avatar */}
          <Avatar className="w-10 h-10 flex-shrink-0">
            {notification.actor.avatar_url && (
              <AvatarImage
                src={notification.actor.avatar_url}
                alt={notification.actor.display_name}
              />
            )}
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-medium">
              {notification.actor.initials}
            </AvatarFallback>
          </Avatar>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] leading-snug">
              <span className="font-semibold">{notification.actor.display_name}</span>{' '}
              <span className="text-muted-foreground">{getNotificationText(notification)}</span>
            </p>

            {/* Preview content for comments and mentions */}
            {notification.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {notification.content}
              </p>
            )}

            {/* Post preview for likes without content */}
            {!notification.content && notification.target?.preview && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {notification.target.preview}
              </p>
            )}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimeAgo(notification.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
      )}
    </Link>
  )
}

export function Notifications() {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<NotificationTab>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch notifications on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const fetchNotifications = async () => {
      try {
        setIsLoading(true)
        const response = await api.getNotifications({ limit: 50 })
        setNotifications(response.data)
        setUnreadCount(response.unread_count)
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
        setError('Failed to load notifications')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [isAuthenticated])

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
          <div>
            <h1 className="font-bold text-lg leading-tight">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            )}
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
          filteredNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
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
