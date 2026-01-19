import { Link, useLocation } from 'react-router-dom'
import { Home, Compass, Bell, Mail, User, PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Home', path: '/', badge: undefined },
  { icon: Compass, label: 'Explore', path: '/explore', badge: undefined },
  { icon: Bell, label: 'Notifications', path: '/notifications', badge: 3 },
  { icon: Mail, label: 'Messages', path: '/messages', badge: 2 },
]

export function MobileNav() {
  const location = useLocation()
  const { user } = useAuth()

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
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                      {item.badge}
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
