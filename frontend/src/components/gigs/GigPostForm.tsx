import { useState, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Check, DollarSign, Calendar, Code2, Sparkles, X, Briefcase, Bold, Italic, Heading2, Quote, Code as CodeIcon, List, Link2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { api } from '@/lib/api'

interface GigPostFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    description: string
    budget_min?: number
    budget_max?: number
    deadline?: string
    tools?: string[]
    stacks?: string[]
  }) => Promise<void>
}


const TECH_STACKS = ['React', 'TypeScript', 'Node.js', 'Python', 'Next.js', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'Express', 'Vue', 'Angular', 'Django', 'FastAPI']

const STEPS = [
  { id: 'basics', label: 'Basics', optional: false },
  { id: 'budget', label: 'Budget', optional: true },
  { id: 'requirements', label: 'Requirements', optional: true },
]

export function GigPostForm({ isOpen, onClose, onSubmit }: GigPostFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Basics
  const [title, setTitle] = useState('')

  // Step 2: Budget & Deadline
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [deadline, setDeadline] = useState('')

  // Step 3: Requirements
  const [selectedStacks, setSelectedStacks] = useState<string[]>([])
  const [customStack, setCustomStack] = useState('')

  // AI improvement state
  const [isImproving, setIsImproving] = useState(false)
  const [ghostWords, setGhostWords] = useState<string[]>([])
  const [improvedText, setImprovedText] = useState('')

  // TipTap editor for description
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        link: {
          openOnClick: false,
        },
      }),
      Placeholder.configure({
        placeholder: 'Describe what you need built, requirements, deliverables, and any specific details...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[180px] text-[15px] px-3 py-2.5',
      },
    },
    onTransaction: () => {
      // Re-render handled by state changes
    },
  })

  // Get markdown content from editor
  const getMarkdownContent = useCallback(() => {
    if (!editor) return ''

    const html = editor.getHTML()
    const markdown = html
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

  // Convert markdown to HTML for TipTap
  const markdownToHtml = useCallback((markdown: string): string => {
    // Split into lines for processing
    const lines = markdown.split('\n')
    const htmlLines: string[] = []
    let inList = false

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine) {
        // Empty line - close list if open
        if (inList) {
          htmlLines.push('</ul>')
          inList = false
        }
        continue
      }

      // Check for headings
      if (trimmedLine.startsWith('## ')) {
        if (inList) {
          htmlLines.push('</ul>')
          inList = false
        }
        const headingText = trimmedLine.slice(3)
        htmlLines.push(`<h2>${headingText}</h2>`)
        continue
      }

      if (trimmedLine.startsWith('### ')) {
        if (inList) {
          htmlLines.push('</ul>')
          inList = false
        }
        const headingText = trimmedLine.slice(4)
        htmlLines.push(`<h3>${headingText}</h3>`)
        continue
      }

      // Check for bullet points
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (!inList) {
          htmlLines.push('<ul>')
          inList = true
        }
        const listItemText = trimmedLine.slice(2)
        // Process inline formatting
        const formattedText = listItemText
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/_(.*?)_/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>')
        htmlLines.push(`<li><p>${formattedText}</p></li>`)
        continue
      }

      // Regular paragraph
      if (inList) {
        htmlLines.push('</ul>')
        inList = false
      }

      // Process inline formatting
      const formattedText = trimmedLine
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
      htmlLines.push(`<p>${formattedText}</p>`)
    }

    // Close any open list
    if (inList) {
      htmlLines.push('</ul>')
    }

    return htmlLines.join('')
  }, [])

  // Add link to editor
  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }

  const resetForm = () => {
    setCurrentStep(0)
    setTitle('')
    editor?.commands.clearContent()
    setBudgetMin('')
    setBudgetMax('')
    setDeadline('')
    setSelectedStacks([])
    setCustomStack('')
    setError('')
    setIsImproving(false)
    setGhostWords([])
    setImprovedText('')
  }

  // AI improvement handler
  const handleAIImprove = useCallback(async () => {
    if (!editor || isImproving) return

    const content = getMarkdownContent()
    const words = content.trim().split(/\s+/).filter(w => w.length > 0)

    if (words.length < 5) return

    // Store original content for error recovery
    const originalContent = content

    // Set up ghost text state
    setGhostWords(words)
    setImprovedText('')
    setIsImproving(true)
    editor.setEditable(false)

    // Accumulate raw text (not split into words to preserve formatting)
    let accumulatedText = ''

    try {
      await api.improveGig(content, (chunk) => {
        // Accumulate raw text chunks directly (preserves formatting)
        accumulatedText += chunk
        setImprovedText(accumulatedText)
      })

      // Convert markdown to HTML and transfer to editor
      const htmlContent = markdownToHtml(accumulatedText.trim())
      editor.commands.setContent(htmlContent)
    } catch (error) {
      console.error('AI improvement failed:', error)
      // Restore original content on error
      editor.commands.setContent(originalContent)
      alert(error instanceof Error ? error.message : 'Failed to improve description')
    } finally {
      // Clean up
      setGhostWords([])
      setImprovedText('')
      setIsImproving(false)
      editor.setEditable(true)
    }
  }, [editor, isImproving, getMarkdownContent, markdownToHtml])

  // Calculate if AI can be used (at least 5 words)
  const descriptionContent = getMarkdownContent()
  const descriptionWordCount = descriptionContent.trim().split(/\s+/).filter(w => w.length > 0).length
  const canUseAI = descriptionWordCount >= 5

  const handleClose = () => {
    resetForm()
    onClose()
  }



  const toggleStack = (tech: string) => {
    setSelectedStacks(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    )
  }

  const addCustomStack = () => {
    if (customStack.trim() && !selectedStacks.includes(customStack.trim())) {
      setSelectedStacks(prev => [...prev, customStack.trim()])
      setCustomStack('')
    }
  }

  const canProceed = () => {
    if (currentStep === 0) {
      return title.trim().length > 0 && editor && !editor.isEmpty
    }
    return true // Other steps are optional
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
    // Allow jumping to completed steps or next step if current is valid
    if (stepIndex < currentStep || (stepIndex === currentStep + 1 && canProceed())) {
      setCurrentStep(stepIndex)
    }
  }

  const handleSubmit = async () => {
    setError('')

    const minBudget = budgetMin ? parseFloat(budgetMin) : undefined
    const maxBudget = budgetMax ? parseFloat(budgetMax) : undefined

    if (minBudget && maxBudget && minBudget > maxBudget) {
      setError('Minimum budget cannot be greater than maximum budget')
      return
    }

    setIsSubmitting(true)
    try {
      const description = getMarkdownContent()

      if (!description.trim()) {
        setError('Description is required')
        setIsSubmitting(false)
        return
      }

      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        budget_min: minBudget ? Math.round(minBudget * 100) : undefined,
        budget_max: maxBudget ? Math.round(maxBudget * 100) : undefined,
        deadline: deadline || undefined,
        stacks: selectedStacks.length > 0 ? selectedStacks : undefined
      })
      handleClose() // This will reset form AND close dialog
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to post gig')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Post a New Gig</h2>
          </div>
        </div>

        {/* Wizard Progress */}
        <div className="px-6 py-4 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center justify-center gap-1">
            {STEPS.map((step, i) => {
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
                  {i < STEPS.length - 1 && (
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

        {/* Step Content */}
        <div className="overflow-y-auto flex-1 bg-background">
          <div className="p-6">
            <div className="w-full max-w-xl mx-auto">
              {/* Step 1: Basics */}
              {currentStep === 0 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Gig Details</h2>
                    <p className="text-sm text-muted-foreground">Describe what you need built</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Gig Title <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="E.g., Build a React Dashboard with AI Features"
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
                        {/* Rich Text Editor or Ghost Text View */}
                        {isImproving ? (
                          <div className="min-h-[180px] text-[15px] prose prose-sm dark:prose-invert max-w-none px-3 py-2.5">
                            {(() => {
                              // Calculate how many words have been streamed in
                              const improvedWordCount = improvedText.trim()
                                ? improvedText.trim().split(/\s+/).filter(w => w).length
                                : 0
                              const remainingGhostWords = ghostWords.slice(improvedWordCount)

                              return (
                                <>
                                  {/* AI-generated text - normal styling */}
                                  <span>{improvedText}</span>
                                  {/* Remaining ghost words - faded */}
                                  {remainingGhostWords.length > 0 && (
                                    <>
                                      {improvedText && !improvedText.endsWith(' ') && ' '}
                                      <span className="text-muted-foreground/30 select-none">
                                        {remainingGhostWords.join(' ')}
                                      </span>
                                    </>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <EditorContent
                            editor={editor}
                            className="[&_.tiptap]:min-h-[180px] [&_.tiptap]:focus:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
                          />
                        )}

                        {/* Formatting Toolbar */}
                        <div className="px-2 py-1.5 border-t border-border bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
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
                                type="button"
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
                                type="button"
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
                                type="button"
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
                                type="button"
                                className={cn(
                                  "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                  editor?.isActive('code') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                                onClick={() => editor?.chain().focus().toggleCode().run()}
                                title="Code"
                              >
                                <CodeIcon className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-4 bg-border mx-1" />
                              <button
                                type="button"
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
                                type="button"
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

                            {/* AI Improve Button */}
                            <button
                              type="button"
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                                isImproving ? "text-primary" : canUseAI ? "text-primary hover:bg-primary/10" : "text-muted-foreground/50 cursor-not-allowed"
                              )}
                              onClick={handleAIImprove}
                              disabled={!canUseAI || isImproving}
                              title={canUseAI ? "Improve with AI" : "Write at least 5 words to use AI"}
                            >
                              {isImproving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
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

              {/* Step 2: Budget & Deadline */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Budget & Timeline</h2>
                    <p className="text-sm text-muted-foreground">Set your budget range and deadline</p>
                  </div>

                  <div className="space-y-6">
                    {/* Budget Range */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Budget Range</label>
                          <p className="text-xs text-muted-foreground">Help freelancers understand your budget</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Minimum
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              $
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="500"
                              value={budgetMin}
                              onChange={(e) => setBudgetMin(e.target.value)}
                              className="h-11 pl-7 text-base"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Maximum
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              $
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="2000"
                              value={budgetMax}
                              onChange={(e) => setBudgetMax(e.target.value)}
                              className="h-11 pl-7 text-base"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Budget Preview */}
                      {(budgetMin || budgetMax) && (
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Budget:{' '}
                            <span className="font-semibold text-foreground">
                              {budgetMin && budgetMax
                                ? `$${parseFloat(budgetMin).toLocaleString()} - $${parseFloat(budgetMax).toLocaleString()}`
                                : budgetMin
                                  ? `From $${parseFloat(budgetMin).toLocaleString()}`
                                  : `Up to $${parseFloat(budgetMax).toLocaleString()}`}
                            </span>
                          </p>
                        </div>
                      )}

                      <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground">
                          💡 <span className="font-medium">Tip:</span> Setting a realistic budget helps attract quality proposals. Leave blank to receive all offers.
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Deadline */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Deadline</label>
                          <p className="text-xs text-muted-foreground">When do you need this completed?</p>
                        </div>
                      </div>

                      <Input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="h-11"
                        min={new Date().toISOString().split('T')[0]}
                      />

                      {deadline && (
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Due:{' '}
                            <span className="font-semibold text-foreground">
                              {new Date(deadline).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                            {' '}({Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days from now)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Requirements */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Requirements</h2>
                    <p className="text-sm text-muted-foreground">Specify the tools and tech stack needed</p>
                  </div>

                  <div className="space-y-6">


                    <div className="space-y-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Tech Stack
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TECH_STACKS.map((tech) => (
                          <button
                            key={tech}
                            onClick={() => toggleStack(tech)}
                            className={cn(
                              'text-sm px-3 py-1.5 rounded-lg transition-colors border',
                              selectedStacks.includes(tech)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            )}
                          >
                            {tech}
                          </button>
                        ))}
                        {selectedStacks.filter(tech => !TECH_STACKS.includes(tech)).map((tech) => (
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
                          placeholder="Add custom tech..."
                          value={customStack}
                          onChange={(e) => setCustomStack(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomStack()}
                          className="h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addCustomStack}
                          disabled={!customStack.trim()}
                          className="h-9 px-3"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive flex-1">{error}</p>
              <button onClick={() => setError('')} className="text-destructive hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-background flex-shrink-0">
          <button
            onClick={currentStep === 0 ? handleClose : handleBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {currentStep === 0 ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                Previous
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {STEPS[currentStep].optional && currentStep < STEPS.length - 1 && (
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3"
              >
                Skip
              </button>
            )}

            <Button
              size="sm"
              onClick={currentStep === STEPS.length - 1 ? handleSubmit : handleNext}
              disabled={!canProceed() || isSubmitting}
              className="h-9 px-5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Posting...
                </>
              ) : currentStep === STEPS.length - 1 ? (
                'Post Gig'
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
