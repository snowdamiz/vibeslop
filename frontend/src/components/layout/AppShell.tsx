import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

        {/* Scrollable area - includes right sidebar so scrollbar is on far right */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
              {children}
            </main>

            {/* Right Sidebar - Sticky within scroll container */}
            <AnimatePresence mode="wait">
              {showRightSidebar && (
                <motion.div
                  className="hidden lg:block sticky top-0 h-screen shrink-0"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  <RightSidebar />
                </motion.div>
              )}
            </AnimatePresence>
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

