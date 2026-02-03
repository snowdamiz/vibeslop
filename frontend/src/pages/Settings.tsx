import { useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  Sparkles,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchableTagSelector } from '@/components/ui/SearchableTagSelector'

// Settings tab configuration for extensibility
const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'messages', label: 'Messages' },
] as const

type SettingsTab = typeof SETTINGS_TABS[number]['id']
type MessagePrivacy = 'everyone' | 'followers' | 'following'

// ============================================================================
// PROFILE SETTINGS SECTION
// ============================================================================
interface ProfileSettingsProps {
  displayName: string
  setDisplayName: (value: string) => void
  username: string
  handleUsernameChange: (value: string) => void
  usernameError: string
  isCheckingUsername: boolean
  bio: string
  setBio: (value: string) => void
  setSuccessMessage: (value: string) => void
  onOpenAvatarDialog: () => void
  user: NonNullable<ReturnType<typeof useAuth>['user']>
}

function ProfileSettings({
  displayName,
  setDisplayName,
  username,
  handleUsernameChange,
  usernameError,
  isCheckingUsername,
  bio,
  setBio,
  setSuccessMessage,
  onOpenAvatarDialog,
  user,
}: ProfileSettingsProps) {
  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Profile Picture</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenAvatarDialog}
            className="relative group cursor-pointer flex-shrink-0"
          >
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
              <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl sm:text-2xl font-semibold">
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
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
              <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
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
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
              <AtSign className="w-3 h-3 text-blue-600 dark:text-blue-400" />
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
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
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
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
              <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
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
    </div>
  )
}

// ============================================================================
// PREFERENCES SETTINGS SECTION
// ============================================================================
interface PreferencesSettingsProps {
  aiTools: Array<{ id: string; name: string; slug: string }>
  techStacks: Array<{ id: string; name: string; slug: string; category?: string }>
  selectedTools: string[]
  selectedStacks: string[]
  toggleTool: (id: string) => void
  toggleStack: (id: string) => void
}

function PreferencesSettings({
  aiTools,
  techStacks,
  selectedTools,
  selectedStacks,
  toggleTool,
  toggleStack,
}: PreferencesSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Technology Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select your favorite AI tools and tech stacks to display on your profile
        </p>
      </div>

      {/* AI Tools */}
      <SearchableTagSelector
        label="Favorite AI Tools"
        icon={<Sparkles className="w-3 h-3 text-primary" />}
        items={aiTools}
        selectedIds={selectedTools}
        onToggle={toggleTool}
        placeholder="Search AI tools..."
      />

      {/* Tech Stacks */}
      <SearchableTagSelector
        label="Preferred Tech Stacks"
        icon={<FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
        items={techStacks}
        selectedIds={selectedStacks}
        onToggle={toggleStack}
        placeholder="Search tech stacks..."
        groupByCategory
      />
    </div>
  )
}

// ============================================================================
// MESSAGES SETTINGS SECTION
// ============================================================================
interface MessagesSettingsProps {
  messagePrivacy: MessagePrivacy
  setMessagePrivacy: (value: MessagePrivacy) => void
}

const MESSAGE_PRIVACY_OPTIONS: Array<{
  value: MessagePrivacy
  label: string
  description: string
}> = [
    {
      value: 'everyone',
      label: 'Everyone',
      description: 'Anyone can send you a message',
    },
    {
      value: 'followers',
      label: 'Followers only',
      description: 'Only people who follow you can message you',
    },
    {
      value: 'following',
      label: 'People I follow',
      description: 'Only people you follow can message you',
    },
  ]

function MessagesSettings({
  messagePrivacy,
  setMessagePrivacy,
}: MessagesSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Message Privacy
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control who can start a conversation with you
        </p>
      </div>

      <div className="space-y-3">
        {MESSAGE_PRIVACY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
              messagePrivacy === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <input
              type="radio"
              name="messagePrivacy"
              value={option.value}
              checked={messagePrivacy === option.value}
              onChange={(e) => setMessagePrivacy(e.target.value as MessagePrivacy)}
              className="mt-1 accent-primary"
            />
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-muted-foreground">
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN SETTINGS PAGE
// ============================================================================
export function Settings() {
  const { user, updateUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get active tab from URL or default to 'profile'
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile'
  const setActiveTab = (tab: SettingsTab) => {
    setSearchParams({ tab })
  }

  // Profile state
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [usernameError, setUsernameError] = useState('')
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Technology preferences state
  const [aiTools, setAiTools] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [techStacks, setTechStacks] = useState<Array<{ id: string; name: string; slug: string; category?: string }>>([])
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedStacks, setSelectedStacks] = useState<string[]>([])
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  // Message privacy state
  const [messagePrivacy, setMessagePrivacy] = useState<MessagePrivacy>(user?.message_privacy || 'everyone')

  // Load catalog data on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [toolsRes, stacksRes] = await Promise.all([
          api.getTools(),
          api.getStacks(),
        ])
        setAiTools(toolsRes.data as Array<{ id: string; name: string; slug: string }>)
        setTechStacks(stacksRes.data as Array<{ id: string; name: string; slug: string; category?: string }>)
      } catch (error) {
        console.error('Failed to load catalog:', error)
      }
    }
    loadCatalog()
  }, [])

  // Load current user preferences
  useEffect(() => {
    async function loadPreferences() {
      if (!user || prefsLoaded) return
      try {
        const response = await api.getUser(user.username) as {
          data: {
            favorite_ai_tools?: Array<{ id: string }>
            preferred_tech_stacks?: Array<{ id: string }>
          }
        }
        setSelectedTools(response.data.favorite_ai_tools?.map(t => t.id) || [])
        setSelectedStacks(response.data.preferred_tech_stacks?.map(t => t.id) || [])
        setPrefsLoaded(true)
      } catch (error) {
        console.error('Failed to load preferences:', error)
      }
    }
    loadPreferences()
  }, [user, prefsLoaded])

  const toggleTool = (id: string) => {
    setSelectedTools(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const toggleStack = (id: string) => {
    setSelectedStacks(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  // Username validation
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck === user?.username) {
      setUsernameError('')
      return
    }

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
      const [updatedUser] = await Promise.all([
        api.updateProfile({
          display_name: displayName.trim(),
          username: username.trim(),
          bio: bio.trim() || undefined,
          message_privacy: messagePrivacy,
        }),
        api.updatePreferences({
          ai_tool_ids: selectedTools,
          tech_stack_ids: selectedStacks,
        }),
      ])

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
        is_admin: updatedUser.is_admin,
        has_onboarded: updatedUser.has_onboarded,
      }

      updateUser(transformedUser)
      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanges =
    displayName !== user?.name ||
    username !== user?.username ||
    bio !== (user?.bio || '') ||
    messagePrivacy !== (user?.message_privacy || 'everyone')

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto px-4">
          {/* Title Row */}
          <div className="flex items-center gap-4 h-14">
            <Link to={`/user/${user.username}`}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg leading-tight">Settings</h1>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - full width border with centered tabs */}
        <div className="border-t border-border">
          <div className="flex max-w-[600px] mx-auto">
            {SETTINGS_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 py-4 text-sm font-medium transition-colors relative hover:bg-muted/50',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[600px] mx-auto px-4 py-6">
        <div className="space-y-8">
          {/* Render active section */}
          {activeTab === 'profile' && (
            <ProfileSettings
              displayName={displayName}
              setDisplayName={setDisplayName}
              username={username}
              handleUsernameChange={handleUsernameChange}
              usernameError={usernameError}
              isCheckingUsername={isCheckingUsername}
              bio={bio}
              setBio={setBio}
              setSuccessMessage={setSuccessMessage}
              onOpenAvatarDialog={() => setShowAvatarDialog(true)}
              user={user}
            />
          )}

          {activeTab === 'preferences' && (
            <PreferencesSettings
              aiTools={aiTools}
              techStacks={techStacks}
              selectedTools={selectedTools}
              selectedStacks={selectedStacks}
              toggleTool={toggleTool}
              toggleStack={toggleStack}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesSettings
              messagePrivacy={messagePrivacy}
              setMessagePrivacy={setMessagePrivacy}
            />
          )}

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
              className="px-8"
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
