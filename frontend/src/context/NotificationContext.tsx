import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useAuth } from './AuthContext'

interface NotificationContextType {
  unreadCounts: { notifications: number; messages: number }
  refreshCounts: () => Promise<void>
  clearNotificationCount: () => void
  clearMessageCount: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [unreadCounts, setUnreadCounts] = useState<{ notifications: number; messages: number }>({
    notifications: 0,
    messages: 0,
  })

  const refreshCounts = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const counts = await api.getUnreadCounts()
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Failed to fetch unread counts:', error)
    }
  }, [isAuthenticated])

  const clearNotificationCount = useCallback(() => {
    setUnreadCounts(prev => ({ ...prev, notifications: 0 }))
  }, [])

  const clearMessageCount = useCallback(() => {
    setUnreadCounts(prev => ({ ...prev, messages: 0 }))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCounts({ notifications: 0, messages: 0 })
      return
    }

    // Initial fetch
    const timer = setTimeout(() => {
      refreshCounts()
    }, 0)

    // Refresh counts every 30 seconds
    const interval = setInterval(refreshCounts, 30000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [isAuthenticated, refreshCounts])

  return (
    <NotificationContext.Provider value={{ unreadCounts, refreshCounts, clearNotificationCount, clearMessageCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
