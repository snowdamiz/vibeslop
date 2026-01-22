import { useState, useCallback, useRef, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import {
  Image as ImageIcon,
  X,
  Check,
  User,
  AtSign,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Step configuration
const STEPS = [
  { id: 'avatar', label: 'Avatar', icon: ImageIcon, optional: true },
  { id: 'details', label: 'Details', icon: User, optional: false },
  { id: 'review', label: 'Review', icon: Check, optional: false },
]

export function Onboarding() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [usernameError, setUsernameError] = useState('')
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

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

    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(lowercase)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  // Form submission
  const handleComplete = async () => {
    if (!displayName.trim() || !username.trim() || usernameError) {
      return
    }

    setIsSubmitting(true)
    try {
      const updatedUser = await api.completeOnboarding({
        display_name: displayName.trim(),
        username: username.trim(),
        avatar_url: avatarUrl || undefined,
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
        is_admin: updatedUser.is_admin,
        has_onboarded: updatedUser.has_onboarded,
      }

      updateUser(transformedUser)
      navigate('/')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('Failed to complete onboarding. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Validation
  const canProceed = () => {
    if (currentStep === 1) { // Details
      return displayName.trim().length > 0 && username.trim().length > 0 && !usernameError && !isCheckingUsername
    }
    return true
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    if (STEPS[currentStep].optional) {
      handleNext()
    }
  }

  const goToStep = (stepIndex: number) => {
    if (stepIndex < currentStep || (stepIndex === currentStep + 1 && canProceed())) {
      setCurrentStep(stepIndex)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border/50 backdrop-blur-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50">
            <h1 className="text-lg font-semibold text-center">Account setup</h1>
          </div>

          {/* Wizard Progress */}
          <div className="px-6 py-5 border-b border-border/50">
            <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
              {STEPS.map((step, i) => {
                const StepIcon = step.icon
                const isCompleted = i < currentStep
                const isCurrent = i === currentStep
                const isUpcoming = i > currentStep
                const isClickable = isCompleted || (i === currentStep + 1 && canProceed())

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={cn(
                        "flex flex-col items-center gap-1.5 relative z-10 transition-all duration-200 min-w-[70px]",
                        isClickable ? "cursor-pointer" : "cursor-default",
                        isUpcoming && "opacity-40"
                      )}
                      onClick={() => isClickable && goToStep(i)}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md",
                          isCompleted ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20" :
                            isCurrent ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-4 ring-blue-500/20 scale-110 shadow-blue-500/30" :
                              "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                      </div>
                      <span className={cn(
                        "text-xs font-semibold whitespace-nowrap",
                        isCurrent ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                    </div>

                    {i < STEPS.length - 1 && (
                      <div className="relative flex items-center mx-2" style={{ width: '50px' }}>
                        <div
                          className={cn(
                            "h-0.5 rounded-full w-full transition-all duration-500",
                            i < currentStep ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-muted"
                          )}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6 min-h-[380px]">
            <div
              className="w-full max-w-md mx-auto animate-fade-in-up"
              key={currentStep}
            >
              {/* Step 0: Avatar */}
              {currentStep === 0 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1 mb-6">
                    <h2 className="text-xl font-bold">Choose Your Avatar</h2>
                    <p className="text-sm text-muted-foreground">Your profile picture helps others recognize you</p>
                  </div>

                  <div className="flex flex-col items-center gap-6">
                    <div className="relative group">
                      <Avatar className="w-28 h-28 border-4 border-border shadow-xl ring-4 ring-border/50">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                            {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        )}
                      </Avatar>
                      <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg ring-4 ring-background">
                        <ImageIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div
                      className={cn(
                        "w-full relative group cursor-pointer transition-all rounded-xl border-2 border-dashed min-h-[140px] flex flex-col items-center justify-center",
                        isDragging ? "border-blue-500 bg-blue-500/5 scale-105" : "border-border hover:border-blue-500/50 hover:bg-muted/50"
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center justify-center gap-2.5 text-center p-5">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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

                    {avatarUrl && avatarUrl !== user.avatar_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAvatarUrl(user.avatar_url || '')}
                        className="text-muted-foreground hover:text-foreground -mt-2"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Reset to GitHub avatar
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Details */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1 mb-6">
                    <h2 className="text-xl font-bold">Your Profile Details</h2>
                    <p className="text-sm text-muted-foreground">How should others see you?</p>
                  </div>

                  <div className="space-y-5">
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
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-11 bg-muted/50 border-border/50 focus-visible:bg-background"
                        autoFocus
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
                        onChange={(e) => setBio(e.target.value)}
                        className="min-h-[80px] resize-none bg-muted/50 border-border/50 focus-visible:bg-background"
                        maxLength={160}
                      />
                      <p className="text-xs text-muted-foreground pl-1">
                        {bio.length}/160 characters
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Review */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center space-y-1 mb-6">
                    <h2 className="text-xl font-bold">Ready to Go!</h2>
                    <p className="text-sm text-muted-foreground">Here's how your profile will look</p>
                  </div>

                  <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-xl" />
                    <div className="relative bg-card/50 backdrop-blur-sm rounded-xl p-6 border-2 border-border/50 shadow-lg">
                      <div className="flex flex-col items-center gap-4">
                        <Avatar className="w-20 h-20 border-4 border-background shadow-xl ring-4 ring-blue-500/10">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                              {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          )}
                        </Avatar>
                        <div className="text-center space-y-1.5">
                          <h3 className="text-xl font-bold">{displayName}</h3>
                          <p className="text-sm text-muted-foreground font-medium">@{username}</p>
                          {bio && (
                            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{bio}</p>
                          )}
                          {user.github_username && (
                            <div className="flex items-center justify-center gap-2 mt-2.5 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              <p className="text-xs text-muted-foreground">
                                Connected to <span className="font-semibold text-foreground">{user.github_username}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10" />
                    <div className="relative px-4 py-3 text-center border-2 border-blue-500/20">
                      <p className="text-xs font-medium">
                        <span className="text-blue-600 dark:text-blue-400">💡</span> You can always update your profile later in settings
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="relative px-6 py-4 border-t border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
                className="gap-2 hover:bg-muted h-10"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              <div className="flex gap-2.5">
                {STEPS[currentStep].optional && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted h-10"
                    size="sm"
                  >
                    Skip
                  </Button>
                )}

                <Button
                  onClick={currentStep === STEPS.length - 1 ? handleComplete : handleNext}
                  disabled={!canProceed() || isSubmitting}
                  className={cn(
                    "gap-2 px-6 h-10 font-semibold shadow-lg transition-all",
                    currentStep === STEPS.length - 1
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105"
                      : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-blue-500/20"
                  )}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Completing...
                    </>
                  ) : currentStep === STEPS.length - 1 ? (
                    <>
                      Complete Setup
                      <Sparkles className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
