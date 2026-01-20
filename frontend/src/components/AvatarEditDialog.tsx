import { useState, useCallback, useRef, DragEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface AvatarEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AvatarEditDialog({ open, onOpenChange }: AvatarEditDialogProps) {
  const { user, updateUser } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image handling
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image'))
        return
      }
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        reject(new Error('Image must be less than 5MB'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    try {
      const file = files[0]
      const base64Image = await fileToBase64(file)
      setAvatarUrl(base64Image)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    }
  }, [fileToBase64])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleImageUpload(e.dataTransfer?.files)
  }, [handleImageUpload])

  const handleSave = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const updatedUser = await api.updateProfile({
        avatar_url: avatarUrl || undefined,
      })

      // Transform API user to Auth context user format
      const transformedUser = {
        id: updatedUser.id,
        name: updatedUser.display_name,
        username: updatedUser.username,
        email: updatedUser.email,
        initials: updatedUser.display_name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        avatar_url: updatedUser.avatar_url,
        bio: updatedUser.bio,
        location: updatedUser.location,
        website_url: updatedUser.website_url,
        github_username: updatedUser.github_username,
        is_verified: updatedUser.is_verified,
        has_onboarded: updatedUser.has_onboarded,
      }

      updateUser(transformedUser)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating avatar:', error)
      alert('Failed to update avatar. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setAvatarUrl(user?.avatar_url || '')
  }

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Upload a new profile picture or drag and drop
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative group">
            <Avatar className="w-28 h-28 border-4 border-border shadow-xl ring-4 ring-border/50">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Avatar preview" className="object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-3xl font-bold">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-background">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
          </div>

          <div 
            className={cn(
              "w-full relative group cursor-pointer transition-all rounded-xl border-2 border-dashed min-h-[140px] flex flex-col items-center justify-center",
              isDragging ? "border-violet-500 bg-violet-500/5 scale-105" : "border-border hover:border-violet-500/50 hover:bg-muted/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center gap-2.5 text-center p-5">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Upload a custom avatar</p>
                <p className="text-xs text-muted-foreground mt-1">Drag and drop or click to upload • Max 5MB</p>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e.target.files)}
            className="hidden"
          />

          {avatarUrl && avatarUrl !== user?.avatar_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground -mt-2"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Reset to current avatar
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || avatarUrl === user?.avatar_url}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
