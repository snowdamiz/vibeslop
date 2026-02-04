import { Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/layout'
import { useAuth } from '@/context/AuthContext'

// Critical pages - loaded immediately
import { Home } from '@/pages/Home'
import { SignIn } from '@/pages/SignIn'
import { SignUp } from '@/pages/SignUp'
import { AuthCallback } from '@/pages/AuthCallback'
import { Onboarding } from '@/pages/Onboarding'

// Lazy loaded pages - code split for better initial load
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })))
const PostDetail = lazy(() => import('@/pages/PostDetail').then(m => ({ default: m.PostDetail })))
const BotPostDetail = lazy(() => import('@/pages/BotPostDetail').then(m => ({ default: m.BotPostDetail })))
const UserProfile = lazy(() => import('@/pages/UserProfile').then(m => ({ default: m.UserProfile })))
const Notifications = lazy(() => import('@/pages/Notifications').then(m => ({ default: m.Notifications })))
const Messages = lazy(() => import('@/pages/Messages').then(m => ({ default: m.Messages })))
const Bookmarks = lazy(() => import('@/pages/Bookmarks').then(m => ({ default: m.Bookmarks })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const Search = lazy(() => import('@/pages/Search').then(m => ({ default: m.Search })))
const Gigs = lazy(() => import('@/pages/Gigs').then(m => ({ default: m.Gigs })))
const GigDetail = lazy(() => import('@/pages/GigDetail').then(m => ({ default: m.GigDetail })))

// Admin pages - definitely should be lazy loaded
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })))
const AdminUsers = lazy(() => import('@/pages/AdminUsers').then(m => ({ default: m.AdminUsers })))
const AdminCatalog = lazy(() => import('@/pages/AdminCatalog').then(m => ({ default: m.AdminCatalog })))
const AdminReports = lazy(() => import('@/pages/AdminReports').then(m => ({ default: m.AdminReports })))
const AdminBots = lazy(() => import('@/pages/AdminBots').then(m => ({ default: m.AdminBots })))
const AdminEngagement = lazy(() => import('@/pages/AdminEngagement').then(m => ({ default: m.AdminEngagement })))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  )
}

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
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </AppShell>
  )
}

export default App
