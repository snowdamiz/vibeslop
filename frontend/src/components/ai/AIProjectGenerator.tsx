import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { RepoSelector, type GitHubRepo } from './RepoSelector'
import { api } from '@/lib/api'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  FileText,
  Image as ImageIcon,
  Wand2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIProjectGeneratorProps {
  open: boolean
  onClose: () => void
  onComplete: (projectData: GeneratedProjectData) => void
}

export interface GeneratedProjectData {
  title: string
  description: string
  images?: string[]
  stack: string[]
  links?: {
    live?: string
    github?: string
  }
  highlights?: string[]
  repo?: {
    owner: string
    name: string
  }
}

type Step = 'select-repo' | 'generating'

const GENERATION_STEPS = [
  { id: 'analyze', label: 'Analyzing repository', icon: FileCode, duration: 2500 },
  { id: 'readme', label: 'Reading documentation', icon: FileText, duration: 4000 },
  { id: 'content', label: 'Generating content', icon: Wand2, duration: 6000 },
  { id: 'image', label: 'Creating cover image', icon: ImageIcon, duration: 0 }, // Last step - never auto-completes
]

function GeneratingState({ repoName }: { repoName?: string }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    let totalDelay = 0

    // Schedule transitions for all steps except the last one
    // The last step stays "in progress" until the API returns
    for (let i = 0; i < GENERATION_STEPS.length - 1; i++) {
      totalDelay += GENERATION_STEPS[i].duration
      const nextIndex = i + 1
      const timer = setTimeout(() => {
        setCurrentStepIndex(nextIndex)
      }, totalDelay)
      timers.push(timer)
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Generating your project</h3>
          {repoName && (
            <p className="text-sm text-muted-foreground">
              from <span className="font-medium text-foreground">{repoName}</span>
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-2">
          {GENERATION_STEPS.map((step, index) => {
            const Icon = step.icon
            const isCompleted = index < currentStepIndex
            const isActive = index === currentStepIndex
            const isPending = index > currentStepIndex

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300",
                  isActive && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0",
                  isCompleted && "bg-primary/10 text-primary",
                  isActive && "bg-primary text-primary-foreground",
                  isPending && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className={cn(
                  "text-sm flex-1 transition-colors duration-300",
                  isActive && "text-foreground font-medium",
                  isCompleted && "text-muted-foreground",
                  isPending && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {isActive && (
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Time estimate */}
        <p className="text-xs text-muted-foreground text-center">
          Usually takes 1-2 minutes
        </p>
      </div>
    </div>
  )
}

export function AIProjectGenerator({ open, onClose, onComplete }: AIProjectGeneratorProps) {
  const [step, setStep] = useState<Step>('select-repo')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | undefined>()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reposWithProjects, setReposWithProjects] = useState<Set<string>>(new Set())
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Handle close with confirmation if generating
  const handleClose = () => {
    if (generating) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = () => {
    setShowCloseConfirm(false)
    onClose()
  }

  // Load repositories when modal opens
  useEffect(() => {
    if (open && repos.length === 0) {
      loadRepos()
    }
  }, [open, repos.length])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('select-repo')
        setSelectedRepo(undefined)
        setError(null)
        setShowCloseConfirm(false)
      }, 300)
    }
  }, [open])

  const loadRepos = async () => {
    setLoadingRepos(true)
    setError(null)

    try {
      const [reposResponse, urlsResponse] = await Promise.all([
        api.getGitHubRepos({ per_page: 100, sort: 'pushed' }),
        api.getProjectGithubUrls()
      ])
      setRepos(reposResponse.data)
      setReposWithProjects(new Set(urlsResponse.github_urls))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoadingRepos(false)
    }
  }

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo)
  }

  const handleGenerate = async () => {
    if (!selectedRepo) return

    setGenerating(true)
    setError(null)
    setStep('generating')

    try {
      const [owner, repoName] = selectedRepo.full_name.split('/')
      const response = await api.generateProjectFromRepo(owner, repoName)
      const content = response.data

      // Build the project data and immediately pass to onComplete
      const projectData: GeneratedProjectData = {
        title: content.title,
        description: content.long_description,
        stack: content.stack || [],
        highlights: content.highlights || [],
        links: {
          live: content.links?.live || undefined,
          github: content.links?.github || undefined
        },
        repo: {
          owner,
          name: repoName
        }
      }

      // Use cover image if it was generated
      if (content.cover_image) {
        projectData.images = [content.cover_image]
      }

      onComplete(projectData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate project content')
      setStep('select-repo')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            Generate Project from GitHub
          </DialogTitle>
          <VisuallyHidden.Root>
            <DialogDescription>
              Select a repository from your GitHub account to generate a detailed project post using AI.
            </DialogDescription>
          </VisuallyHidden.Root>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-1 -mx-1">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-sm flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-destructive hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Select Repository */}
          {step === 'select-repo' && (
            <div className="flex flex-col h-full">
              <p className="text-sm text-muted-foreground mb-4">
                Select a repository from your GitHub account to generate a project post.
              </p>
              <div className="flex-1 min-h-0">
                <RepoSelector
                  repos={repos}
                  loading={loadingRepos}
                  onSelect={handleRepoSelect}
                  selectedRepo={selectedRepo}
                  reposWithProjects={reposWithProjects}
                />
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <GeneratingState repoName={selectedRepo?.name} />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 -mb-2 -mx-6 px-4 border-t border-border">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>

          <div className="flex gap-2">
            {step === 'select-repo' && (
              <Button
                onClick={handleGenerate}
                disabled={!selectedRepo || generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Project
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Cancel generation?"
        description="Your project is still being generated. Are you sure you want to cancel?"
        confirmLabel="Yes, cancel"
        cancelLabel="Keep generating"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  )
}
