import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { AvatarEditDialog } from '@/components/AvatarEditDialog'
import {
  ArrowLeft,
  User,
  AtSign,
  FileText,
  Loader2,
  Camera,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Settings() {
  const { user, updateUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [usernameError, setUsernameError] = useState('')
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Username validation
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck === user?.username) {
      setUsernameError('')
      return
    }

    // Validate format
    if (usernameToCheck.length < 2) {
      setUsernameError('Username must be at least 2 characters')
      return
    }

    if (usernameToCheck.length > 30) {
      setUsernameError('Username must be at most 30 characters')
      return
    }

    if (!/^[a-z0-9_]+$/.test(usernameToCheck)) {
      setUsernameError('Username can only contain lowercase letters, numbers, and underscores')
      return
    }

    setIsCheckingUsername(true)
    try {
      const result = await api.checkUsername(usernameToCheck)
      if (!result.available) {
        setUsernameError('This username is already taken')
      } else {
        setUsernameError('')
      }
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameError('Error checking username availability')
    } finally {
      setIsCheckingUsername(false)
    }
  }, [user?.username])

  const handleUsernameChange = (value: string) => {
    const lowercase = value.toLowerCase()
    setUsername(lowercase)
    setSuccessMessage('')

    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(lowercase)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleSave = async () => {
    if (!displayName.trim() || !username.trim() || usernameError || isCheckingUsername) {
      return
    }

    setIsSubmitting(true)
    setSuccessMessage('')
    try {
      const updatedUser = await api.updateProfile({
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || undefined,
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
      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanges =
    displayName !== user?.name ||
    username !== user?.username ||
    bio !== (user?.bio || '')

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto flex items-center gap-4 px-4 h-14">
          <Link to={`/user/${user.username}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your profile</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[600px] mx-auto px-4 py-6">
        <div className="space-y-8">
          {/* Avatar Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Profile Picture</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAvatarDialog(true)}
                className="relative group cursor-pointer flex-shrink-0"
              >
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xl sm:text-2xl font-semibold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Click on your avatar to upload a new profile picture
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Profile Details</h2>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                </div>
                Display Name <span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                placeholder="Your full name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  setSuccessMessage('')
                }}
                className="h-11 bg-muted/50 border-border/50 focus-visible:bg-background"
              />
              <p className="text-xs text-muted-foreground pl-1">This is how your name will appear across the platform</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                  <AtSign className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                </div>
                Username <span className="text-destructive ml-0.5">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">@</span>
                <Input
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={cn(
                    "h-11 pl-7 bg-muted/50 border-border/50 focus-visible:bg-background",
                    usernameError && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {isCheckingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-violet-500" />
                )}
              </div>
              {usernameError ? (
                <p className="text-xs text-destructive pl-1 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-destructive"></span>
                  {usernameError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground pl-1">
                  Lowercase letters, numbers, and underscores only. This is your unique identifier.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                  <FileText className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                </div>
                Bio
              </label>
              <Textarea
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value)
                  setSuccessMessage('')
                }}
                className="min-h-[100px] resize-none bg-muted/50 border-border/50 focus-visible:bg-background"
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground pl-1">
                {bio.length}/160 characters
              </p>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                {successMessage}
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSubmitting || !!usernameError || isCheckingUsername || !displayName.trim() || !username.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-8"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Avatar Edit Dialog */}
      <AvatarEditDialog
        open={showAvatarDialog}
        onOpenChange={setShowAvatarDialog}
      />
    </div>
  )
}
