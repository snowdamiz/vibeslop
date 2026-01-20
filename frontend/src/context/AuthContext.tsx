/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api'
import type { User as ApiUser } from '@/lib/api'

interface User {
  name: string
  username: string
  initials: string
  email: string
  id: string
  avatar_url?: string
  bio?: string
  location?: string
  website_url?: string
  github_username?: string
  is_verified: boolean
  has_onboarded: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
  handleAuthCallback: (token: string) => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function transformApiUser(apiUser: ApiUser): User {
  const initials = apiUser.display_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return {
    id: apiUser.id,
    name: apiUser.display_name,
    username: apiUser.username,
    email: apiUser.email,
    initials,
    avatar_url: apiUser.avatar_url,
    bio: apiUser.bio,
    location: apiUser.location,
    website_url: apiUser.website_url,
    github_username: apiUser.github_username,
    is_verified: apiUser.is_verified,
    has_onboarded: apiUser.has_onboarded,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing token and fetch user on mount
  useEffect(() => {
    // Clean up any old mock user data
    localStorage.removeItem('vibeslop_user')
    
    const token = api.getToken()
    
    if (token) {
      api.getCurrentUser()
        .then((apiUser) => {
          setUser(transformApiUser(apiUser))
        })
        .catch((error) => {
          console.error('Failed to fetch user:', error)
          api.clearToken()
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      Promise.resolve().then(() => setIsLoading(false))
    }
  }, [])

  const login = () => {
    // Redirect to GitHub OAuth
    api.loginWithGithub()
  }

  const handleAuthCallback = useCallback(async (token: string) => {
    // Store the token
    api.setToken(token)
    
    // Fetch the user data
    try {
      const apiUser = await api.getCurrentUser()
      setUser(transformApiUser(apiUser))
    } catch (error) {
      console.error('Failed to fetch user after auth:', error)
      api.clearToken()
      throw error
    }
  }, [])

  const logout = () => {
    api.logout().finally(() => {
      setUser(null)
      // Redirect to landing page after logout
      window.location.href = '/'
    })
  }

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
  }, [])

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading,
      login, 
      logout,
      handleAuthCallback,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
