import { Link, useLocation } from 'react-router-dom'
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
  Compass,
  Bell,
  Mail,
  Bookmark,
  User,
  Settings,
  LogOut,
  Sparkles,
  PenSquare,
  MoreHorizontal,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Home', path: '/', badge: undefined },
  { icon: Compass, label: 'Explore', path: '/explore', badge: undefined },
  { icon: Bell, label: 'Notifications', path: '/notifications', badge: 3 },
  { icon: Mail, label: 'Messages', path: '/messages', badge: 2 },
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks', badge: undefined },
]

export function LeftSidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <aside className="hidden sm:flex flex-col h-full w-[72px] xl:w-[260px] px-4 py-4 border-r border-border/80 flex-shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-1 px-1 pb-1">
        <div className="flex items-center justify-center w-10 h-10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xl font-bold tracking-tight hidden xl:block">
          hype<span className="text-primary">vibe</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 mt-2 space-y-1 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group flex items-center gap-4 px-3 py-3 rounded-xl w-full',
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
                {item.badge && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-semibold">
                    {item.badge}
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

        {/* Profile Link */}
        {user && (
          <Link
            to={`/user/${user.username}`}
            className={cn(
              'group flex items-center gap-4 px-3 py-3 rounded-xl w-full',
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
        <div className="pt-4">
          <Button
            className="w-12 h-12 xl:w-full xl:h-auto xl:py-3 rounded-xl font-semibold text-[15px] shadow-sm"
            size="lg"
          >
            <PenSquare className="w-5 h-5 xl:mr-2" />
            <span className="hidden xl:inline">Post</span>
          </Button>
        </div>
      </nav>

      {/* User Menu */}
      {user && (
        <div className="mt-auto -mx-2 -my-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 w-full text-left">
                <Avatar className="w-10 h-10 ring-2 ring-border/50">
                  <AvatarImage src="https://i.pravatar.cc/150?img=1" alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
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
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
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
