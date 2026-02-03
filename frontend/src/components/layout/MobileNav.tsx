import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Home, Bell, Mail, User, PenSquare, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface NavItem {
  icon: typeof Home
  label: string
  path: string
  badgeKey?: 'notifications' | 'messages'
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Bell, label: 'Notifications', path: '/notifications', badgeKey: 'notifications' },
  { icon: Briefcase, label: 'Gigs', path: '/gigs' },
  { icon: Mail, label: 'Messages', path: '/messages', badgeKey: 'messages' },
]

export function MobileNav() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const [unreadCounts, setUnreadCounts] = useState<{ notifications: number; messages: number }>({
    notifications: 0,
    messages: 0,
  })

  const fetchUnreadCounts = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const counts = await api.getUnreadCounts()
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Failed to fetch unread counts:', error)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUnreadCounts()
    }, 0)

    const interval = setInterval(fetchUnreadCounts, 30000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [fetchUnreadCounts])

  const getBadgeCount = (badgeKey?: 'notifications' | 'messages') => {
    if (!badgeKey) return undefined
    const count = unreadCounts[badgeKey]
    return count > 0 ? count : undefined
  }

  return (
    <>
      {/* Floating Compose Button */}
      <Button
        size="icon"
        className="sm:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-md hover:shadow-lg transition-shadow z-50 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <PenSquare className="w-6 h-6" />
      </Button>

      {/* Bottom Tab Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-40">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const badge = getBadgeCount(item.badgeKey)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors relative',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('w-5 h-5', isActive && 'fill-primary/20')} />
                  {badge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
          {user && (
            <Link
              to={`/user/${user.username}`}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                location.pathname.startsWith('/user/')
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <User className={cn('w-5 h-5', location.pathname.startsWith('/user/') && 'fill-primary/20')} />
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
