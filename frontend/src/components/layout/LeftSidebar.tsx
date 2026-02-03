import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  Bell,
  Mail,
  Bookmark,
  User,
  Settings,
  LogOut,
  PenSquare,
  MoreHorizontal,
  Moon,
  Sun,
  Briefcase,
  Shield,
} from 'lucide-react'
import { HypeVibeLogo } from '@/components/icons/HypeVibeLogo'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useCompose } from '@/context/ComposeContext'
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
  { icon: Mail, label: 'Messages', path: '/messages', badgeKey: 'messages' },
  { icon: Briefcase, label: 'Gigs', path: '/gigs' },
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
]

export function LeftSidebar() {
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const { openCompose } = useCompose()
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
    // Wrap in a microtask or timeout to avoid synchronous setState warning
    const timer = setTimeout(() => {
      fetchUnreadCounts()
    }, 0)

    // Refresh counts every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [fetchUnreadCounts])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const getBadgeCount = (badgeKey?: 'notifications' | 'messages') => {
    if (!badgeKey) return undefined
    const count = unreadCounts[badgeKey]
    return count > 0 ? count : undefined
  }

  return (
    <aside className="hidden sm:flex flex-col h-full w-[72px] xl:w-[260px] px-2 xl:px-3 py-3 border-r border-border/80 flex-shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-1 pb-1 justify-center xl:justify-start xl:px-1">
        <div className="flex items-center justify-center w-10 h-10">
          <HypeVibeLogo className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xl font-bold tracking-tight hidden xl:block">
          hype<span className="text-primary">vibe</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 mt-2 space-y-1 overflow-y-auto min-h-0 flex flex-col items-center xl:items-stretch">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const badge = getBadgeCount(item.badgeKey)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group flex items-center justify-center xl:justify-start gap-4',
                'w-11 h-11 xl:w-full xl:h-auto xl:px-3 xl:py-3',
                'rounded-full xl:rounded-xl flex-shrink-0',
                isActive
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <div className="relative flex items-center justify-center w-6 h-6">
                <item.icon
                  className={cn(
                    'w-[22px] h-[22px]',
                    isActive && 'text-primary'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badge && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-semibold">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[15px] hidden xl:block',
                isActive ? 'font-semibold' : 'font-medium'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Admin Link */}
        {user?.is_admin && (
          <Link
            to="/admin"
            className={cn(
              'group flex items-center justify-center xl:justify-start gap-4',
              'w-11 h-11 xl:w-full xl:h-auto xl:px-3 xl:py-3',
              'rounded-full xl:rounded-xl flex-shrink-0',
              location.pathname === '/admin'
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <div className="flex items-center justify-center w-6 h-6">
              <Shield
                className={cn(
                  'w-[22px] h-[22px]',
                  location.pathname === '/admin' && 'text-primary'
                )}
                strokeWidth={location.pathname === '/admin' ? 2.5 : 2}
              />
            </div>
            <span className={cn(
              'text-[15px] hidden xl:block',
              location.pathname === '/admin' ? 'font-semibold' : 'font-medium'
            )}>
              Admin
            </span>
          </Link>
        )}

        {/* Profile Link */}
        {user && (
          <Link
            to={`/user/${user.username}`}
            className={cn(
              'group flex items-center justify-center xl:justify-start gap-4',
              'w-11 h-11 xl:w-full xl:h-auto xl:px-3 xl:py-3',
              'rounded-full xl:rounded-xl flex-shrink-0',
              location.pathname.startsWith('/user/')
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <div className="flex items-center justify-center w-6 h-6">
              <User
                className={cn(
                  'w-[22px] h-[22px]',
                  location.pathname.startsWith('/user/') && 'text-primary'
                )}
                strokeWidth={location.pathname.startsWith('/user/') ? 2.5 : 2}
              />
            </div>
            <span className={cn(
              'text-[15px] hidden xl:block',
              location.pathname.startsWith('/user/') ? 'font-semibold' : 'font-medium'
            )}>
              Profile
            </span>
          </Link>
        )}

        {/* Post Button */}
        <div className="pt-4 flex justify-center xl:justify-start">
          <Button
            className="w-11 h-11 xl:w-full xl:h-auto xl:py-3 rounded-full xl:rounded-lg font-semibold text-[15px] shadow-sm flex-shrink-0"
            size="lg"
            onClick={openCompose}
          >
            <PenSquare className="w-5 h-5 xl:mr-2" />
            <span className="hidden xl:inline">Post</span>
          </Button>
        </div>
      </nav>

      {/* User Menu */}
      {user && (
        <div className="mt-auto pt-4 flex justify-center xl:justify-start">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-0 xl:p-2.5 rounded-full xl:rounded-xl hover:bg-muted/60 xl:w-full text-left flex-shrink-0">
                <Avatar className="w-10 h-10 ring-2 ring-border/50 flex-shrink-0">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 hidden xl:block min-w-0">
                  <p className="font-semibold text-sm truncate leading-tight">{user.name}</p>
                  <p className="text-muted-foreground text-xs truncate mt-0.5">@{user.username}</p>
                </div>
                <MoreHorizontal className="w-5 h-5 text-muted-foreground hidden xl:block flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-64 mb-2">
              <div className="px-3 py-2.5">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/user/${user.username}`}>
                  <User className="h-4 w-4 mr-2" />
                  View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Light mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  )
}
