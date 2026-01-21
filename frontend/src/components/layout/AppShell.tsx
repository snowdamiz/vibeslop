import type { ReactNode } from 'react'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { MobileNav } from './MobileNav'
import { ComposeProvider } from '@/context/ComposeContext'
import { GlobalComposeDialog } from '@/components/feed/GlobalComposeDialog'

interface AppShellProps {
  children: ReactNode
  showRightSidebar?: boolean
}

export function AppShell({ children, showRightSidebar = true }: AppShellProps) {
  return (
    <ComposeProvider>
      <div className="h-screen bg-background overflow-hidden flex">
        {/* Left Sidebar - Fixed to left edge */}
        <LeftSidebar />

        {/* Single scroll container for main + right sidebar */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex min-h-full">
            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
              {children}
            </main>

            {/* Right Sidebar - Sticky at top */}
            {showRightSidebar && <RightSidebar />}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>

      {/* Global Compose Dialog - Available on all pages */}
      <GlobalComposeDialog />
    </ComposeProvider>
  )
}

