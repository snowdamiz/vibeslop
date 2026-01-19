import type { ReactNode } from 'react'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { MobileNav } from './MobileNav'

interface AppShellProps {
  children: ReactNode
  showRightSidebar?: boolean
}

export function AppShell({ children, showRightSidebar = true }: AppShellProps) {
  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Desktop/Tablet Layout - Full width with sidebars at edges */}
      <div className="flex h-screen">
        {/* Left Sidebar - Fixed to left edge */}
        <LeftSidebar />

        {/* Main Content Area - Scrollable content between sidebars */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Right Sidebar - Fixed to right edge */}
        {showRightSidebar && <RightSidebar />}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
