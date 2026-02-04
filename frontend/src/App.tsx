import { Routes, Route, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout'
import { Home, ProjectDetail, PostDetail, BotPostDetail, UserProfile, SignIn, SignUp, Notifications, Messages, AuthCallback, Bookmarks, Onboarding, Settings, Search, Gigs, GigDetail, Admin, AdminUsers, AdminCatalog, AdminReports, AdminBots, AdminEngagement } from '@/pages'
import { useAuth } from '@/context/AuthContext'

function App() {
  const location = useLocation()
  const { isLoading } = useAuth()

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

  // App shell layout for authenticated users and app pages
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/bot-post/:id" element={<BotPostDetail />} />
        <Route path="/user/:username" element={<UserProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/gigs" element={<Gigs />} />
        <Route path="/gigs/:id" element={<GigDetail />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/catalog/:type" element={<AdminCatalog />} />
        <Route path="/admin/bots" element={<AdminBots />} />
        <Route path="/admin/engagement" element={<AdminEngagement />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  )
}

export default App
