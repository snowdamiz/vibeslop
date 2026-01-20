import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { RepoSelector, type GitHubRepo } from './RepoSelector'
import { api, type GeneratedProject } from '@/lib/api'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Plus,
  Trash2,
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
  tools: string[]
  stack: string[]
  links?: {
    live?: string
    github?: string
  }
  highlights?: string[]
}

type Step = 'select-repo' | 'generating' | 'preview' | 'image-generation'

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
          Usually takes 20-30 seconds
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
  const [generatingImage, setGeneratingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<GeneratedProject | null>(null)
  
  // Editable fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [highlights, setHighlights] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [stack, setStack] = useState<string[]>([])
  const [liveUrl, setLiveUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [coverImage, setCoverImage] = useState<string | null>(null)

  // Load repositories when modal opens
  useEffect(() => {
    if (open && repos.length === 0) {
      loadRepos()
    }
  }, [open])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('select-repo')
        setSelectedRepo(undefined)
        setError(null)
        setGeneratedContent(null)
        setCoverImage(null)
      }, 300)
    }
  }, [open])

  const loadRepos = async () => {
    setLoadingRepos(true)
    setError(null)
    
    try {
      const response = await api.getGitHubRepos({ per_page: 100, sort: 'pushed' })
      setRepos(response.data)
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
      
      setGeneratedContent(content)
      setTitle(content.title)
      setDescription(content.long_description)
      setHighlights(content.highlights || [])
      setTools(content.tools || [])
      setStack(content.stack || [])
      setLiveUrl(content.links?.live || '')
      setGithubUrl(content.links?.github || '')
      
      // Use cover image if it was generated
      if (content.cover_image) {
        setCoverImage(content.cover_image)
      }
      
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate project content')
      setStep('select-repo')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!generatedContent) return

    setGeneratingImage(true)
    setError(null)

    try {
      const response = await api.generateProjectImage({
        title: title,
        description: description,
        stack: stack,
        repo: selectedRepo ? {
          owner: selectedRepo.owner.login,
          name: selectedRepo.name
        } : undefined
      })
      
      setCoverImage(response.data.image)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleComplete = () => {
    const projectData: GeneratedProjectData = {
      title,
      description,
      tools,
      stack,
      highlights,
      links: {
        live: liveUrl || undefined,
        github: githubUrl || undefined
      }
    }

    if (coverImage) {
      projectData.images = [coverImage]
    }

    onComplete(projectData)
    onClose()
  }

  const addHighlight = () => {
    setHighlights([...highlights, ''])
  }

  const updateHighlight = (index: number, value: string) => {
    const updated = [...highlights]
    updated[index] = value
    setHighlights(updated)
  }

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Project from GitHub
          </DialogTitle>
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
                />
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <GeneratingState repoName={selectedRepo?.name} />
          )}

          {/* Step 3: Preview & Edit */}
          {step === 'preview' && generatedContent && (
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="flex-1 text-sm">
                  Content generated! Review and edit as needed before continuing.
                </p>
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cover Image</label>
                {coverImage ? (
                  <div className="space-y-2">
                    <div className="relative group">
                      <img 
                        src={coverImage} 
                        alt="Generated cover" 
                        className="w-full aspect-video object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => setCoverImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="w-full"
                    >
                      {generatingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {generatingImage ? 'Regenerating...' : 'Regenerate Image'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    className="w-full h-32 border-dashed"
                  >
                    {generatingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <span>Generate AI Cover Image</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project name"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <div className="border border-border rounded-lg p-4 bg-background max-h-[200px] overflow-y-auto">
                  <MarkdownContent content={description} />
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Highlights</label>
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                      placeholder="Key feature or achievement"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHighlight(index)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addHighlight} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Highlight
                </Button>
              </div>

              {/* Tech Stack - Read Only Chips */}
              {stack.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tech Stack</label>
                  <div className="flex flex-wrap gap-2">
                    {stack.map((tech, index) => (
                      <span key={index} className="px-2.5 py-1 bg-primary/10 text-primary text-sm rounded-full border border-primary/20">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Tools - Read Only Chips */}
              {tools.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Tools</label>
                  <div className="flex flex-wrap gap-2">
                    {tools.map((tool, index) => (
                      <span key={index} className="px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm rounded-full border border-purple-500/20">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Live URL</label>
                  <Input
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">GitHub URL</label>
                  <Input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
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
            
            {step === 'preview' && (
              <Button onClick={handleComplete}>
                Continue to Composer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
