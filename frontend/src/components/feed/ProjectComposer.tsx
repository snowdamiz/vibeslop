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
  LayoutTemplate,
  Link as LinkIcon,
  AlignLeft,
  ArrowRight,
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

interface ProjectComposerProps {
  onPost: (project: Omit<ProjectPost, 'id' | 'likes' | 'comments' | 'reposts' | 'created_at' | 'author'>) => void
  onCancel: () => void
}

// Common AI tools and tech stacks for suggestions
const AI_TOOLS = ['Cursor', 'Claude', 'GPT-4', 'v0', 'Bolt', 'Copilot', 'Replit AI', 'GitHub Copilot']
const TECH_STACKS = ['React', 'TypeScript', 'Node.js', 'Python', 'Next.js', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'Express', 'Vue', 'Angular', 'Django', 'FastAPI']

// Step configuration
const STEPS = [
  { id: 'images', label: 'Images', icon: ImageIcon, optional: true },
  { id: 'basics', label: 'Basics', icon: LayoutTemplate, optional: false },
  { id: 'tech', label: 'Tech', icon: Code2, optional: true },
  { id: 'links', label: 'Links', icon: LinkIcon, optional: true },
  { id: 'details', label: 'Details', icon: AlignLeft, optional: true },
]

export function ProjectComposer({ onPost, onCancel }: ProjectComposerProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [, setEditorState] = useState(0) // Force re-render on editor changes
  
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
    if (currentStep === 1) { // Basics
      return title.trim().length > 0 && editor && !editor.isEmpty
    }
    return true
  }

  const canPost = title.trim().length > 0 && editor && !editor.isEmpty

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
    // Allow jumping to completed steps or next step if current is valid
    if (stepIndex < currentStep || (stepIndex === currentStep + 1 && canProceed())) {
      setCurrentStep(stepIndex)
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Wizard Progress */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background relative flex-shrink-0">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          const isUpcoming = i > currentStep
          const isClickable = isCompleted || (i === currentStep + 1 && canProceed())

          return (
            <div key={step.id} className="flex-1 flex items-center">
              <div 
                className={cn(
                  "flex flex-col items-center gap-1.5 relative z-10 transition-all duration-200",
                  isClickable ? "cursor-pointer" : "cursor-default",
                  isUpcoming && "opacity-40"
                )}
                onClick={() => isClickable && goToStep(i)}
              >
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted ? "bg-primary text-primary-foreground" : 
                    isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110" : 
                    "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              
              {/* Connector Line */}
              {i < STEPS.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-all duration-500",
                    i < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="overflow-y-auto relative bg-muted/5">
        <div className="p-5">
          <div 
            className="w-full max-w-2xl mx-auto animate-fade-in-up"
            key={currentStep}
          >
              
              {/* Step 0: Images */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1 mb-4">
                    <h2 className="text-xl font-bold">Showcase your project</h2>
                    <p className="text-sm text-muted-foreground">Start by adding some visuals. You can drag and drop images here.</p>
                  </div>

                  <div 
                    className={cn(
                      "relative group cursor-pointer transition-all rounded-lg border-2 border-dashed min-h-[220px] flex flex-col items-center justify-center bg-background",
                      isDragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/30",
                      images.length > 0 && "border-border"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => images.length === 0 && fileInputRef.current?.click()}
                  >
                    {images.length > 0 ? (
                      <div className="relative w-full aspect-video bg-black/5 rounded-lg overflow-hidden group-hover:bg-black/10 transition-colors" onClick={(e) => e.stopPropagation()}>
                        <img
                          src={images[currentImageIndex]}
                          alt={`Project screenshot ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                        
                        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm font-medium">
                          {currentImageIndex + 1} / {images.length}
                        </div>

                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 bg-black/50 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity overflow-x-auto max-w-[90%]">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative flex-shrink-0">
                              <button
                                onClick={() => setCurrentImageIndex(idx)}
                                className={cn(
                                  "w-10 h-7 rounded overflow-hidden ring-2 transition-all",
                                  idx === currentImageIndex ? "ring-white" : "ring-transparent opacity-60 hover:opacity-100"
                                )}
                              >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </button>
                              <button
                                onClick={() => removeImage(idx)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-sm"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-10 h-7 rounded border border-white/20 bg-white/10 flex items-center justify-center hover:bg-white/20 text-white transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="text-base font-medium">Add project images</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Drag and drop or click to upload</p>
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
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1 mb-4">
                    <h2 className="text-xl font-bold">The Basics</h2>
                    <p className="text-sm text-muted-foreground">What did you build and why?</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Project Name <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="e.g., hypevibe, AI Code Assistant..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-base font-medium h-11"
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
                      <div className="rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-background overflow-hidden">
                        <EditorContent 
                          editor={editor}
                          className="[&_.tiptap]:min-h-[180px] [&_.tiptap]:focus:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
                        />
                        
                        {/* Formatting Toolbar */}
                        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
                          <div className="flex items-center gap-0.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "w-7 h-7 rounded hover:bg-muted",
                                editor?.isActive('bold') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => editor?.chain().focus().toggleBold().run()}
                              title="Bold (Ctrl+B)"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "w-7 h-7 rounded hover:bg-muted",
                                editor?.isActive('italic') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => editor?.chain().focus().toggleItalic().run()}
                              title="Italic (Ctrl+I)"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </Button>
                            <div className="w-px h-3.5 bg-border mx-0.5" />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "w-7 h-7 rounded hover:bg-muted",
                                editor?.isActive('heading') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                              title="Heading"
                            >
                              <Heading2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "w-7 h-7 rounded hover:bg-muted",
                                editor?.isActive('blockquote') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                              title="Quote"
                            >
                              <Quote className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "w-7 h-7 rounded hover:bg-muted",
                                editor?.isActive('code') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => editor?.chain().focus().toggleCode().run()}
                              title="Inline Code"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </Button>
                            <div className="w-px h-3.5 bg-border mx-0.5" />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "w-7 h-7 rounded hover:bg-muted",
                                editor?.isActive('bulletList') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => editor?.chain().focus().toggleBulletList().run()}
                              title="List"
                            >
                              <List className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "w-7 h-7 rounded hover:bg-muted",
                                editor?.isActive('link') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={addLink}
                              title="Link"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supports markdown formatting. Be descriptive!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Tech */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1 mb-4">
                    <h2 className="text-xl font-bold">Tech Stack</h2>
                    <p className="text-sm text-muted-foreground">What tools and technologies did you use?</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-base">AI Tools</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {AI_TOOLS.map((tool) => (
                          <button
                            key={tool}
                            onClick={() => toggleTool(tool)}
                            className={cn(
                              'text-sm px-2.5 py-1 rounded-full transition-all border',
                              selectedTools.includes(tool)
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            )}
                          >
                            {tool}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <Input
                          placeholder="Other AI tool..."
                          value={customTool}
                          onChange={(e) => setCustomTool(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomTool()}
                          className="h-8 text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={addCustomTool} disabled={!customTool.trim()} className="h-8">
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="h-px bg-border/50" />

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-base">Technologies</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TECH_STACKS.map((tech) => (
                          <button
                            key={tech}
                            onClick={() => toggleStack(tech)}
                            className={cn(
                              'text-sm px-2.5 py-1 rounded-full transition-all border',
                              selectedStack.includes(tech)
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            )}
                          >
                            {tech}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <Input
                          placeholder="Other technology..."
                          value={customStack}
                          onChange={(e) => setCustomStack(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomStack()}
                          className="h-8 text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={addCustomStack} disabled={!customStack.trim()} className="h-8">
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Links */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1 mb-4">
                    <h2 className="text-xl font-bold">Project Links</h2>
                    <p className="text-sm text-muted-foreground">Where can people see your project?</p>
                  </div>

                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-primary" /> Live Demo URL
                      </label>
                      <Input
                        placeholder="https://..."
                        value={liveUrl}
                        onChange={(e) => setLiveUrl(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <Github className="w-4 h-4 text-primary" /> Repository URL
                      </label>
                      <Input
                        placeholder="https://github.com/..."
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center">
                      <p>💡 Links are optional, but help others engage with your work.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Details */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1 mb-4">
                    <h2 className="text-xl font-bold">Details (Optional)</h2>
                    <p className="text-sm text-muted-foreground">Add highlights, prompts, or a timeline.</p>
                  </div>

                  <Accordion type="multiple" className="space-y-3">
                    <AccordionItem value="highlights" className="border rounded-lg bg-background px-3">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-full bg-yellow-500/10 text-yellow-500">
                            <Lightbulb className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium text-base">Key Highlights</span>
                          {highlights.length > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {highlights.length}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-2 pl-2">
                          {highlights.map((highlight, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <span className="text-sm flex-1">{highlight}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeHighlight(idx)}
                                className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a highlight feature..."
                              value={newHighlight}
                              onChange={(e) => setNewHighlight(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
                              className="h-9"
                            />
                            <Button size="sm" onClick={addHighlight} disabled={!newHighlight.trim()}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="prompts" className="border rounded-lg bg-background px-3">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500">
                            <Code2 className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium text-base">Prompts Used</span>
                          {prompts.length > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {prompts.length}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-3">
                          {prompts.map((prompt, idx) => (
                            <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <Input
                                  placeholder="Prompt title"
                                  value={prompt.title}
                                  onChange={(e) => updatePrompt(idx, 'title', e.target.value)}
                                  className="h-9 font-medium"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removePrompt(idx)}
                                  className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
                                className="min-h-[100px] font-mono text-sm"
                              />
                            </div>
                          ))}
                          <Button size="sm" variant="outline" onClick={addPrompt} className="w-full h-10 border-dashed">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Prompt
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="timeline" className="border rounded-lg bg-background px-3">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-full bg-green-500/10 text-green-500">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium text-base">Build Timeline</span>
                          {timeline.length > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {timeline.length}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-3">
                          {timeline.map((entry, idx) => (
                            <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Date (e.g., Jan 5, 2026)"
                                    value={entry.date}
                                    onChange={(e) => updateTimelineEntry(idx, 'date', e.target.value)}
                                    className="h-9 pl-9"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeTimelineEntry(idx)}
                                  className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Milestone title"
                                value={entry.title}
                                onChange={(e) => updateTimelineEntry(idx, 'title', e.target.value)}
                                className="h-9 font-medium"
                              />
                              <Input
                                placeholder="Description (optional)"
                                value={entry.description}
                                onChange={(e) => updateTimelineEntry(idx, 'description', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                          ))}
                          <Button size="sm" variant="outline" onClick={addTimelineEntry} className="w-full h-10 border-dashed">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Timeline Entry
                          </Button>
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
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background flex-shrink-0">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <div className="flex gap-3">
          {STEPS[currentStep].optional && (
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip
            </Button>
          )}
          
          <Button
            onClick={currentStep === STEPS.length - 1 ? handlePost : handleNext}
            disabled={!canProceed()}
            className={cn(
              "gap-2 px-6",
              currentStep === STEPS.length - 1 && "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
            )}
          >
            {currentStep === STEPS.length - 1 ? (
              <>
                Post Project
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
  )
}
