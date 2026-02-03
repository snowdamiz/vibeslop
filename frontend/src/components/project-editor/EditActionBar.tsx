import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, X, Save, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EditActionBarProps {
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  hasChanges: boolean
  error?: string | null
}

export function EditActionBar({
  onSave,
  onCancel,
  isSaving,
  hasChanges,
  error,
}: EditActionBarProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {/* Left side - status */}
              <div className="flex items-center gap-3">
                {error ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                ) : hasChanges ? (
                  <div className="flex items-center gap-2 text-amber-500">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm font-medium">Unsaved changes</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No changes</span>
                )}
              </div>

              {/* Right side - actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={isSaving || !hasChanges}
                  className={cn(
                    "gap-2 min-w-[100px]",
                    hasChanges && "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
