import { Routes, Route, useLocation } from 'react-router-dom'
import { Header, Footer, AppShell } from '@/components/layout'
import { Landing, Home, About, ProjectDetail, PostDetail, UserProfile, SignIn, SignUp, Notifications, Messages, AuthCallback, Bookmarks, Onboarding, Settings, Search, Gigs, GigDetail } from '@/pages'
import { useAuth } from '@/context/AuthContext'

function App() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  
  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup' || location.pathname === '/auth/callback' || location.pathname === '/onboarding'
  const isLandingPage = location.pathname === '/' && !isAuthenticated

  // Auth pages (sign in/up/callback/onboarding) - centered layout, no chrome
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </div>
    )
  }

  // Landing page for logged-out users - marketing layout with header/footer
  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <Landing />
        </main>
        <Footer />
      </div>
    )
  }

  // App shell layout for authenticated users and app pages
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/search" element={<Search />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/user/:username" element={<UserProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/gigs" element={<Gigs />} />
        <Route path="/gigs/:id" element={<GigDetail />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  )
}

export default App
