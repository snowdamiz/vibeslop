import { useState, useCallback, useRef, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useAuth } from '@/context/AuthContext'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { marked } from 'marked'
import { 
  Image as ImageIcon, 
  X, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Code2,
  Globe,
  Github,
  Lightbulb,
  Clock,
  Calendar,
  Trash2,
  Check,
  CheckCircle2,
  LayoutTemplate,
  AlignLeft,
  ArrowLeft,
  Bold,
  Italic,
  Heading2,
  Quote,
  Code,
  List,
  Link2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectPost } from './types'
import { AIProjectGenerator, type GeneratedProjectData } from '@/components/ai/AIProjectGenerator'

interface ProjectComposerProps {
  onPost: (project: Omit<ProjectPost, 'id' | 'likes' | 'comments' | 'reposts' | 'created_at' | 'author'>) => void
  onCancel: () => void
}

// Common AI tools and tech stacks for suggestions
const AI_TOOLS = ['Cursor', 'Claude', 'GPT-4', 'v0', 'Bolt', 'Copilot', 'Replit AI', 'GitHub Copilot']
const TECH_STACKS = ['React', 'TypeScript', 'Node.js', 'Python', 'Next.js', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'Express', 'Vue', 'Angular', 'Django', 'FastAPI']

// Step configuration - for manual path only
const MANUAL_STEPS = [
  { id: 'images', label: 'Images', icon: ImageIcon, optional: true },
  { id: 'basics', label: 'Basics', icon: LayoutTemplate, optional: false },
  { id: 'tech', label: 'Tech', icon: Code2, optional: true },
  { id: 'links', label: 'Links', icon: Link2, optional: true },
  { id: 'details', label: 'Details', icon: AlignLeft, optional: true },
]

type FlowPath = 'selection' | 'ai' | 'manual'

export function ProjectComposer({ onPost, onCancel }: ProjectComposerProps) {
  const { user } = useAuth()
  const [flowPath, setFlowPath] = useState<FlowPath>('selection')
  const [currentStep, setCurrentStep] = useState(0)
  const [, setEditorState] = useState(0) // Force re-render on editor changes
  
  // AI Generator state
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [aiGeneratedData, setAiGeneratedData] = useState<GeneratedProjectData | null>(null)
  
  // Core fields
  const [title, setTitle] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  // Essential fields
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedStack, setSelectedStack] = useState<string[]>([])
  const [customTool, setCustomTool] = useState('')
  const [customStack, setCustomStack] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  
  // Advanced fields
  const [highlights, setHighlights] = useState<string[]>([])
  const [newHighlight, setNewHighlight] = useState('')
  const [prompts, setPrompts] = useState<{ title: string; description: string; code: string }[]>([])
  const [timeline, setTimeline] = useState<{ date: string; title: string; description: string }[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // TipTap editor for description
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Describe what you built...',
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[180px] text-[15px] px-3 py-2.5',
      },
    },
    onTransaction: () => {
      // Force re-render to update toolbar button states
      setEditorState(prev => prev + 1)
    },
  })

  // Get markdown content from editor
  const getMarkdownContent = useCallback(() => {
    if (!editor) return ''
    
    const html = editor.getHTML()
    let markdown = html
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '_$1_')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/g, '> $1\n')
      .replace(/<li><p>(.*?)<\/p><\/li>/g, '- $1\n')
      .replace(/<ul>/g, '')
      .replace(/<\/ul>/g, '')
      .replace(/<ol>/g, '')
      .replace(/<\/ol>/g, '')
      .replace(/<p><\/p>/g, '\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/\n+/g, '\n')
      .trim()
    
    return markdown
  }, [editor])

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
      const fileArray = Array.from(files)
      const base64Images = await Promise.all(fileArray.map(fileToBase64))
      setImages(prev => [...prev, ...base64Images])
    } catch (error) {
      console.error('Error uploading images:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload images')
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

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    if (currentImageIndex >= images.length - 1) {
      setCurrentImageIndex(Math.max(0, images.length - 2))
    }
  }

  // Tag management
  const toggleTool = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    )
  }

  const addCustomTool = () => {
    if (customTool.trim() && !selectedTools.includes(customTool.trim())) {
      setSelectedTools(prev => [...prev, customTool.trim()])
      setCustomTool('')
    }
  }

  const toggleStack = (tech: string) => {
    setSelectedStack(prev => 
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    )
  }

  const addCustomStack = () => {
    if (customStack.trim() && !selectedStack.includes(customStack.trim())) {
      setSelectedStack(prev => [...prev, customStack.trim()])
      setCustomStack('')
    }
  }

  // Highlights management
  const addHighlight = () => {
    if (newHighlight.trim()) {
      setHighlights(prev => [...prev, newHighlight.trim()])
      setNewHighlight('')
    }
  }

  const removeHighlight = (index: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== index))
  }

  // Prompts management
  const addPrompt = () => {
    setPrompts(prev => [...prev, { title: '', description: '', code: '' }])
  }

  const updatePrompt = (index: number, field: keyof typeof prompts[0], value: string) => {
    setPrompts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const removePrompt = (index: number) => {
    setPrompts(prev => prev.filter((_, i) => i !== index))
  }

  // Timeline management
  const addTimelineEntry = () => {
    setTimeline(prev => [...prev, { date: '', title: '', description: '' }])
  }

  const updateTimelineEntry = (index: number, field: keyof typeof timeline[0], value: string) => {
    setTimeline(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const removeTimelineEntry = (index: number) => {
    setTimeline(prev => prev.filter((_, i) => i !== index))
  }

  const handlePost = () => {
    const content = getMarkdownContent()
    
    if (!title.trim() || !content.trim()) {
      alert('Please provide a title and description for your project')
      return
    }

    const projectPost: Omit<ProjectPost, 'id' | 'likes' | 'comments' | 'reposts' | 'created_at' | 'author'> = {
      type: 'project',
      title: title.trim(),
      content: content.trim(),
      images: images.length > 0 ? images : undefined,
      image: images.length > 0 ? images[0] : undefined,
      tools: selectedTools.length > 0 ? selectedTools : undefined,
      stack: selectedStack.length > 0 ? selectedStack : undefined,
      links: (liveUrl || githubUrl) ? {
        live: liveUrl || undefined,
        github: githubUrl || undefined,
      } : undefined,
      highlights: highlights.length > 0 ? highlights : undefined,
      prompts: prompts.filter(p => p.title && p.code).length > 0 
        ? prompts.filter(p => p.title && p.code) 
        : undefined,
      timeline: timeline.filter(t => t.date && t.title).length > 0
        ? timeline.filter(t => t.date && t.title)
        : undefined,
    }
    
    onPost(projectPost)
  }

  // Add link to editor
  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }

  // Validation
  const canProceed = () => {
    if (flowPath === 'manual' && currentStep === 1) { // Basics step in manual flow
      return title.trim().length > 0 && editor && !editor.isEmpty
    }
    if (flowPath === 'ai') { // AI preview - always can proceed
      return title.trim().length > 0 && editor && !editor.isEmpty
    }
    return true
  }

  const canPost = title.trim().length > 0 && editor && !editor.isEmpty

  const handleNext = () => {
    if (flowPath === 'manual' && currentStep < MANUAL_STEPS.length - 1 && canProceed()) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (flowPath === 'manual' && currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    } else if (flowPath === 'ai' || flowPath === 'manual') {
      // Go back to selection
      setFlowPath('selection')
      setCurrentStep(0)
    }
  }

  const handleSkip = () => {
    if (flowPath === 'manual' && MANUAL_STEPS[currentStep].optional) {
      handleNext()
    }
  }

  const goToStep = (stepIndex: number) => {
    if (flowPath !== 'manual') return
    // Allow jumping to completed steps or next step if current is valid
    if (stepIndex < currentStep || (stepIndex === currentStep + 1 && canProceed())) {
      setCurrentStep(stepIndex)
    }
  }

  const handleAIGeneratorComplete = async (projectData: GeneratedProjectData) => {
    // Store the AI-generated data
    setAiGeneratedData(projectData)
    
    // Pre-fill all fields from AI-generated content
    setTitle(projectData.title)
    
    // Convert markdown to HTML and set editor content
    if (editor && projectData.description) {
      try {
        // Convert markdown to HTML
        const html = await marked.parse(projectData.description)
        editor.commands.setContent(html)
      } catch (error) {
        console.error('Failed to parse markdown:', error)
        // Fallback: set as plain text
        editor.commands.setContent(projectData.description)
      }
    }
    
    // Set images if provided
    if (projectData.images && projectData.images.length > 0) {
      setImages(projectData.images)
      setCurrentImageIndex(0)
    }
    
    // Set tech stack and tools
    setSelectedStack(projectData.stack || [])
    setSelectedTools(projectData.tools || [])
    
    // Set links
    setLiveUrl(projectData.links?.live || '')
    setGithubUrl(projectData.links?.github || '')
    
    // Set highlights
    setHighlights(projectData.highlights || [])
    
    // Stay in AI flow and show preview
    setFlowPath('ai')
    setCurrentStep(0)
  }

  const handleChooseManual = () => {
    setFlowPath('manual')
    setCurrentStep(0)
  }

  const handleChooseAI = () => {
    setShowAIGenerator(true)
  }

  const handleEditManually = () => {
    // Switch from AI preview to manual editing flow
    setFlowPath('manual')
    setCurrentStep(0) // Start at images step
  }

  if (!user) return null

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Wizard Progress - Only show for manual flow */}
      {flowPath === 'manual' && (
        <div className="px-6 py-4 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center justify-center gap-1">
            {MANUAL_STEPS.map((step, i) => {
              const isCompleted = i < currentStep
              const isCurrent = i === currentStep
              const isUpcoming = i > currentStep
              const isClickable = isCompleted || (i === currentStep + 1 && canProceed())

              return (
                <div key={step.id} className="flex items-center">
                  <button 
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
                      isClickable ? "cursor-pointer" : "cursor-default",
                      isCurrent && "bg-primary/10",
                      isUpcoming && "opacity-40"
                    )}
                    onClick={() => isClickable && goToStep(i)}
                    disabled={!isClickable}
                  >
                    <div 
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                        isCompleted ? "bg-primary text-primary-foreground" : 
                        isCurrent ? "bg-primary text-primary-foreground" : 
                        "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                    </div>
                    <span className={cn(
                      "text-sm font-medium whitespace-nowrap hidden sm:block",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </button>
                  
                  {/* Connector */}
                  {i < MANUAL_STEPS.length - 1 && (
                    <div 
                      className={cn(
                        "w-8 h-px mx-1",
                        i < currentStep ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="overflow-y-auto flex-1 bg-background">
        <div className="p-6">
          <div 
            className="w-full max-w-xl mx-auto"
            key={`${flowPath}-${currentStep}`}
          >
              
              {/* Path Selection Step */}
              {flowPath === 'selection' && (
                <div className="space-y-8 py-4">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">Create a Project Post</h2>
                    <p className="text-muted-foreground text-sm">Choose how you'd like to showcase your work</p>
                  </div>

                  <div className="space-y-3">
                    {/* AI Generation Option */}
                    <button
                      onClick={handleChooseAI}
                      className="group w-full p-5 rounded-xl border border-primary/30 bg-primary/[0.02] hover:bg-primary/[0.05] hover:border-primary/40 transition-colors text-left"
                    >
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-medium text-[15px]">Generate from GitHub</h3>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded uppercase tracking-wider">Recommended</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            AI analyzes your repository and creates a complete post in seconds
                          </p>
                          <div className="flex items-center gap-5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Auto-generates content
                            </span>
                            <span className="flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Creates cover image
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5" />
                              Detects tech stack
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                      </div>
                    </button>

                    {/* Manual Creation Option */}
                    <button
                      onClick={handleChooseManual}
                      className="group w-full p-5 rounded-xl border border-border hover:border-muted-foreground/20 hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className="font-medium text-[15px] mb-1.5">Create Manually</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Build your post step-by-step with full control over every detail
                          </p>
                          <div className="flex items-center gap-5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <AlignLeft className="w-3.5 h-3.5" />
                              Full customization
                            </span>
                            <span className="flex items-center gap-1.5">
                              <LayoutTemplate className="w-3.5 h-3.5" />
                              Step-by-step wizard
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" />
                              Complete control
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* AI Preview/Approval Step */}
              {flowPath === 'ai' && aiGeneratedData && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Your project post is ready</p>
                      <p className="text-xs text-muted-foreground">Review below, then publish or edit manually</p>
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="space-y-5 p-5 border border-border rounded-xl bg-background">
                    {/* Cover Image */}
                    {images.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cover</label>
                        <img 
                          src={images[0]} 
                          alt="Project cover" 
                          className="w-full aspect-video object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
                      <h3 className="text-xl font-semibold">{title}</h3>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        {editor && <EditorContent editor={editor} />}
                      </div>
                    </div>

                    {/* Tech Stack & Tools */}
                    {(selectedStack.length > 0 || selectedTools.length > 0) && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Technologies</label>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedStack.map((tech, index) => (
                            <span key={index} className="px-2.5 py-1 bg-muted text-foreground text-xs rounded-md">
                              {tech}
                            </span>
                          ))}
                          {selectedTools.map((tool, index) => (
                            <span key={index} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-md">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highlights */}
                    {highlights.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Highlights</label>
                        <ul className="space-y-1.5">
                          {highlights.map((highlight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Links */}
                    {(githubUrl || liveUrl) && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Links</label>
                        <div className="flex gap-4">
                          {githubUrl && (
                            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                              <Github className="w-4 h-4" />
                              Repository
                            </a>
                          )}
                          {liveUrl && (
                            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                              <Globe className="w-4 h-4" />
                              Live Demo
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Flow Steps */}
              {flowPath === 'manual' && currentStep === 0 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Add Project Images</h2>
                    <p className="text-sm text-muted-foreground">Upload screenshots or visuals of your project</p>
                  </div>

                  <div 
                    className={cn(
                      "relative group cursor-pointer rounded-xl border border-dashed min-h-[240px] flex flex-col items-center justify-center bg-muted/20 transition-colors",
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
                      images.length > 0 && "border-solid border-border bg-muted/10"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => images.length === 0 && fileInputRef.current?.click()}
                  >
                    {images.length > 0 ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <img
                          src={images[currentImageIndex]}
                          alt={`Project screenshot ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain bg-muted/30"
                        />
                        
                        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm text-foreground text-xs px-2.5 py-1 rounded-full font-medium border border-border/50">
                          {currentImageIndex + 1} / {images.length}
                        </div>

                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm text-foreground flex items-center justify-center hover:bg-background transition-colors border border-border/50"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm text-foreground flex items-center justify-center hover:bg-background transition-colors border border-border/50"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 overflow-x-auto max-w-[90%]">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative flex-shrink-0 group/thumb">
                              <button
                                onClick={() => setCurrentImageIndex(idx)}
                                className={cn(
                                  "w-10 h-7 rounded-md overflow-hidden ring-2 transition-all",
                                  idx === currentImageIndex ? "ring-primary" : "ring-transparent opacity-60 hover:opacity-100"
                                )}
                              >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </button>
                              <button
                                onClick={() => removeImage(idx)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-10 h-7 rounded-md border border-dashed border-border bg-muted/50 flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Drop images here or click to upload</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB each</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                  />
                </div>
              )}

              {/* Step 1: Basics */}
              {flowPath === 'manual' && currentStep === 1 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Project Details</h2>
                    <p className="text-sm text-muted-foreground">Give your project a name and description</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Project Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="e.g., TaskFlow, CodeBuddy..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-10"
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Description <span className="text-destructive">*</span>
                      </label>
                      <div className="rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all bg-background overflow-hidden">
                        <EditorContent 
                          editor={editor}
                          className="[&_.tiptap]:min-h-[160px] [&_.tiptap]:focus:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
                        />
                        
                        {/* Formatting Toolbar */}
                        <div className="px-2 py-1.5 border-t border-border bg-muted/20">
                          <div className="flex items-center gap-0.5">
                            <button 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                editor?.isActive('bold') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                              onClick={() => editor?.chain().focus().toggleBold().run()}
                              title="Bold"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                editor?.isActive('italic') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                              onClick={() => editor?.chain().focus().toggleItalic().run()}
                              title="Italic"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 bg-border mx-1" />
                            <button 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                editor?.isActive('heading') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                              title="Heading"
                            >
                              <Heading2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                editor?.isActive('blockquote') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                              title="Quote"
                            >
                              <Quote className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                editor?.isActive('code') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                              onClick={() => editor?.chain().focus().toggleCode().run()}
                              title="Code"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 bg-border mx-1" />
                            <button 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                editor?.isActive('bulletList') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                              onClick={() => editor?.chain().focus().toggleBulletList().run()}
                              title="List"
                            >
                              <List className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                editor?.isActive('link') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                              onClick={addLink}
                              title="Link"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supports markdown formatting
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Tech */}
              {flowPath === 'manual' && currentStep === 2 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Tech Stack</h2>
                    <p className="text-sm text-muted-foreground">Select the tools and technologies you used</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                        AI Tools
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AI_TOOLS.map((tool) => (
                          <button
                            key={tool}
                            onClick={() => toggleTool(tool)}
                            className={cn(
                              'text-sm px-3 py-1.5 rounded-lg transition-colors border',
                              selectedTools.includes(tool)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            )}
                          >
                            {tool}
                          </button>
                        ))}
                        {selectedTools.filter(tool => !AI_TOOLS.includes(tool)).map((tool) => (
                          <button
                            key={tool}
                            onClick={() => toggleTool(tool)}
                            className="text-sm px-3 py-1.5 rounded-lg transition-colors border bg-primary text-primary-foreground border-primary flex items-center gap-1.5"
                          >
                            {tool}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-xs">
                        <Input
                          placeholder="Add custom..."
                          value={customTool}
                          onChange={(e) => setCustomTool(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomTool()}
                          className="h-9 text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={addCustomTool} disabled={!customTool.trim()} className="h-9 px-3">
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Technologies
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TECH_STACKS.map((tech) => (
                          <button
                            key={tech}
                            onClick={() => toggleStack(tech)}
                            className={cn(
                              'text-sm px-3 py-1.5 rounded-lg transition-colors border',
                              selectedStack.includes(tech)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            )}
                          >
                            {tech}
                          </button>
                        ))}
                        {selectedStack.filter(tech => !TECH_STACKS.includes(tech)).map((tech) => (
                          <button
                            key={tech}
                            onClick={() => toggleStack(tech)}
                            className="text-sm px-3 py-1.5 rounded-lg transition-colors border bg-primary text-primary-foreground border-primary flex items-center gap-1.5"
                          >
                            {tech}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-xs">
                        <Input
                          placeholder="Add custom..."
                          value={customStack}
                          onChange={(e) => setCustomStack(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomStack()}
                          className="h-9 text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={addCustomStack} disabled={!customStack.trim()} className="h-9 px-3">
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Links */}
              {flowPath === 'manual' && currentStep === 3 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Project Links</h2>
                    <p className="text-sm text-muted-foreground">Share where people can find your project</p>
                  </div>

                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        Live Demo
                      </label>
                      <Input
                        placeholder="https://your-project.com"
                        value={liveUrl}
                        onChange={(e) => setLiveUrl(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Github className="w-3.5 h-3.5 text-muted-foreground" />
                        Repository
                      </label>
                      <Input
                        placeholder="https://github.com/username/repo"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Links help others explore and engage with your work
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Details */}
              {flowPath === 'manual' && currentStep === 4 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Additional Details</h2>
                    <p className="text-sm text-muted-foreground">Add highlights, prompts, or timeline (optional)</p>
                  </div>

                  <Accordion type="multiple" className="space-y-2">
                    <AccordionItem value="highlights" className="border border-border rounded-xl bg-background overflow-hidden">
                      <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Lightbulb className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Key Highlights</span>
                          {highlights.length > 0 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {highlights.length}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2 pt-1">
                          {highlights.map((highlight, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg group">
                              <span className="text-sm flex-1">{highlight}</span>
                              <button
                                onClick={() => removeHighlight(idx)}
                                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a key feature or highlight..."
                              value={newHighlight}
                              onChange={(e) => setNewHighlight(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
                              className="h-9 text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={addHighlight} disabled={!newHighlight.trim()} className="h-9 px-3">
                              Add
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="prompts" className="border border-border rounded-xl bg-background overflow-hidden">
                      <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Code2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Prompts Used</span>
                          {prompts.length > 0 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {prompts.length}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 pt-1">
                          {prompts.map((prompt, idx) => (
                            <div key={idx} className="p-3 bg-muted/20 rounded-lg border border-border space-y-2.5">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Prompt title"
                                  value={prompt.title}
                                  onChange={(e) => updatePrompt(idx, 'title', e.target.value)}
                                  className="h-9 text-sm font-medium"
                                />
                                <button
                                  onClick={() => removePrompt(idx)}
                                  className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <Input
                                placeholder="Description (optional)"
                                value={prompt.description}
                                onChange={(e) => updatePrompt(idx, 'description', e.target.value)}
                                className="h-9 text-sm"
                              />
                              <Textarea
                                placeholder="Paste your prompt here..."
                                value={prompt.code}
                                onChange={(e) => updatePrompt(idx, 'code', e.target.value)}
                                className="min-h-[80px] font-mono text-sm resize-none"
                              />
                            </div>
                          ))}
                          <button 
                            onClick={addPrompt} 
                            className="w-full h-9 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Prompt
                          </button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="timeline" className="border border-border rounded-xl bg-background overflow-hidden">
                      <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Build Timeline</span>
                          {timeline.length > 0 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {timeline.length}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 pt-1">
                          {timeline.map((entry, idx) => (
                            <div key={idx} className="p-3 bg-muted/20 rounded-lg border border-border space-y-2.5">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Date"
                                    value={entry.date}
                                    onChange={(e) => updateTimelineEntry(idx, 'date', e.target.value)}
                                    className="h-9 pl-9 text-sm"
                                  />
                                </div>
                                <button
                                  onClick={() => removeTimelineEntry(idx)}
                                  className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <Input
                                placeholder="Milestone title"
                                value={entry.title}
                                onChange={(e) => updateTimelineEntry(idx, 'title', e.target.value)}
                                className="h-9 text-sm font-medium"
                              />
                              <Input
                                placeholder="Description (optional)"
                                value={entry.description}
                                onChange={(e) => updateTimelineEntry(idx, 'description', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                          ))}
                          <button 
                            onClick={addTimelineEntry} 
                            className="w-full h-9 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Timeline Entry
                          </button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-background flex-shrink-0">
        {/* Selection Flow */}
        {flowPath === 'selection' && (
          <>
            <button 
              onClick={onCancel} 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <span className="text-xs text-muted-foreground">
              Select an option to continue
            </span>
          </>
        )}

        {/* AI Preview Flow */}
        {flowPath === 'ai' && (
          <>
            <button 
              onClick={handleBack} 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEditManually}
                className="h-9"
              >
                Edit Manually
              </Button>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={!canPost}
                className="h-9 px-5 bg-primary hover:bg-primary/90"
              >
                Publish
              </Button>
            </div>
          </>
        )}

        {/* Manual Flow */}
        {flowPath === 'manual' && (
          <>
            <button 
              onClick={handleBack} 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 0 ? 'Back' : 'Previous'}
            </button>
            
            <div className="flex items-center gap-2">
              {MANUAL_STEPS[currentStep].optional && (
                <button 
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3"
                >
                  Skip
                </button>
              )}
              
              <Button
                size="sm"
                onClick={currentStep === MANUAL_STEPS.length - 1 ? handlePost : handleNext}
                disabled={!canProceed()}
                className="h-9 px-5"
              >
                {currentStep === MANUAL_STEPS.length - 1 ? 'Publish' : 'Continue'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* AI Project Generator Modal */}
      <AIProjectGenerator
        open={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onComplete={handleAIGeneratorComplete}
      />
    </div>
  )
}
