import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { handleAuthCallback } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      console.error('No token found in callback URL')
      navigate('/signin')
      return
    }

    handleAuthCallback(token)
      .then(() => {
        // Check if user has completed onboarding
        // The user will be available in context after handleAuthCallback
        // We'll check it in a microtask to ensure state is updated
        setTimeout(() => {
          const userStr = localStorage.getItem('onvibe_token')
          if (userStr) {
            // Fetch the user to check has_onboarded
            import('@/lib/api').then(({ api }) => {
              api.getCurrentUser().then((user) => {
                if (!user.has_onboarded) {
                  navigate('/onboarding')
                } else {
                  navigate('/')
                }
              }).catch(() => {
                navigate('/')
              })
            })
          } else {
            navigate('/')
          }
        }, 100)
      })
      .catch((error) => {
        console.error('Auth callback error:', error)
        navigate('/signin')
      })
  }, [searchParams, navigate, handleAuthCallback])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  )
}
