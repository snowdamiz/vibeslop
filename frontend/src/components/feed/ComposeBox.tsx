import { useState, useRef } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { 
  Image, 
  Code2, 
  Sparkles, 
  Layers, 
  MessageSquare, 
  X, 
  ChevronDown,
  Bold,
  Italic,
  Heading2,
  Quote,
  Code,
  List,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedItem, ProjectPost, StatusUpdate } from './types'

type ComposeMode = 'update' | 'project'

interface ComposeBoxProps {
  placeholder?: string
  onPost?: (item: Omit<FeedItem, 'id' | 'likes' | 'comments' | 'reposts' | 'createdAt' | 'author'>) => void
}

// Common AI tools for quick selection
const AI_TOOLS = ['Cursor', 'Claude', 'GPT-4', 'v0', 'Bolt', 'Copilot', 'Replit AI']

// Formatting actions for markdown
type FormatAction = 'bold' | 'italic' | 'heading' | 'quote' | 'code' | 'list' | 'link'

const FORMAT_CONFIGS: Record<FormatAction, { prefix: string; suffix: string; placeholder: string }> = {
  bold: { prefix: '**', suffix: '**', placeholder: 'bold text' },
  italic: { prefix: '_', suffix: '_', placeholder: 'italic text' },
  heading: { prefix: '## ', suffix: '', placeholder: 'Heading' },
  quote: { prefix: '> ', suffix: '', placeholder: 'quote' },
  code: { prefix: '`', suffix: '`', placeholder: 'code' },
  list: { prefix: '- ', suffix: '', placeholder: 'list item' },
  link: { prefix: '[', suffix: '](url)', placeholder: 'link text' },
}

export function ComposeBox({ placeholder, onPost }: ComposeBoxProps) {
  const { user } = useAuth()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<ComposeMode>('update')
  const [content, setContent] = useState('')
  
  // Project-specific fields
  const [projectTitle, setProjectTitle] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [customTool, setCustomTool] = useState('')
  const [showToolPicker, setShowToolPicker] = useState(false)

  const defaultPlaceholder = mode === 'update' 
    ? "What's on your mind?" 
    : "Describe your project..."

  const resetForm = () => {
    setContent('')
    setProjectTitle('')
    setSelectedTools([])
    setCustomTool('')
    setShowToolPicker(false)
    setMode('update')
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const handlePost = () => {
    if (!content.trim()) return
    
    if (mode === 'project') {
      if (!projectTitle.trim()) return
      
      const projectPost: Omit<ProjectPost, 'id' | 'likes' | 'comments' | 'reposts' | 'createdAt' | 'author'> = {
        type: 'project',
        title: projectTitle.trim(),
        content: content.trim(),
        tools: selectedTools.length > 0 ? selectedTools : undefined,
      }
      onPost?.(projectPost)
    } else {
      const statusUpdate: Omit<StatusUpdate, 'id' | 'likes' | 'comments' | 'reposts' | 'createdAt' | 'author'> = {
        type: 'update',
        content: content.trim(),
      }
      onPost?.(statusUpdate)
    }
    
    resetForm()
    setIsOpen(false)
  }

  const applyFormat = (action: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, selectionEnd } = textarea
    const selectedText = content.substring(selectionStart, selectionEnd)
    const config = FORMAT_CONFIGS[action]
    
    const textToWrap = selectedText || config.placeholder
    const newText = `${config.prefix}${textToWrap}${config.suffix}`
    
    const before = content.substring(0, selectionStart)
    const after = content.substring(selectionEnd)
    
    setContent(before + newText + after)
    
    // Focus and set cursor position after React re-renders
    setTimeout(() => {
      textarea.focus()
      if (selectedText) {
        // If text was selected, place cursor after the formatted text
        const newPosition = selectionStart + newText.length
        textarea.setSelectionRange(newPosition, newPosition)
      } else {
        // If no text was selected, select the placeholder
        const placeholderStart = selectionStart + config.prefix.length
        const placeholderEnd = placeholderStart + config.placeholder.length
        textarea.setSelectionRange(placeholderStart, placeholderEnd)
      }
    }, 0)
  }

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) 
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    )
  }

  const addCustomTool = () => {
    if (customTool.trim() && !selectedTools.includes(customTool.trim())) {
      setSelectedTools(prev => [...prev, customTool.trim()])
      setCustomTool('')
    }
  }

  const removeTool = (tool: string) => {
    setSelectedTools(prev => prev.filter(t => t !== tool))
  }

  const canPost = mode === 'update' 
    ? content.trim().length > 0
    : content.trim().length > 0 && projectTitle.trim().length > 0

  if (!user) return null

  const modeConfig = {
    update: { icon: MessageSquare, label: 'Update', description: 'Share a quick thought or update' },
    project: { icon: Layers, label: 'Project', description: 'Showcase something you built' },
  }

  const CurrentModeIcon = modeConfig[mode].icon

  return (
    <>
      {/* Compact Trigger */}
      <div 
        className="border-b border-border cursor-pointer transition-colors hover:bg-muted/20"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-3 max-w-[600px] mx-auto px-4 py-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="https://i.pravatar.cc/150?img=1" alt={user.name} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-medium">
              {user.initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-muted-foreground text-[15px]">
            {placeholder || "What's on your mind?"}
          </div>

          <Button
            className="rounded-full px-5"
            disabled
          >
            Post
          </Button>
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[580px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Create a post</DialogTitle>
          </DialogHeader>
          
          {/* Header with post type selector */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src="https://i.pravatar.cc/150?img=1" alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-medium">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <CurrentModeIcon className="w-3 h-3" />
                      {modeConfig[mode].label}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem 
                      onClick={() => setMode('update')}
                      className="flex items-start gap-3 p-3"
                    >
                      <MessageSquare className="w-4 h-4 mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium">Update</p>
                        <p className="text-xs text-muted-foreground">Share a quick thought or update</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setMode('project')}
                      className="flex items-start gap-3 p-3"
                    >
                      <Layers className="w-4 h-4 mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium">Project</p>
                        <p className="text-xs text-muted-foreground">Showcase something you built</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-4 pt-3 pb-2">
            {/* Project Title (only in project mode) */}
            {mode === 'project' && (
              <Input
                placeholder="Project title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="mb-3 bg-transparent border-0 border-b border-border rounded-none px-0 text-lg font-semibold placeholder:font-normal focus-visible:ring-0 focus-visible:border-primary"
              />
            )}

            {/* Main Content */}
            <textarea
              ref={textareaRef}
              placeholder={placeholder || defaultPlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent text-[15px] placeholder:text-muted-foreground resize-none focus:outline-none min-h-[140px]"
              rows={5}
              autoFocus
            />

            {/* Selected Tools (project mode) */}
            {mode === 'project' && selectedTools.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap py-2">
                <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                {selectedTools.map((tool) => (
                  <span
                    key={tool}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                  >
                    {tool}
                    <button
                      onClick={() => removeTool(tool)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tool Picker (project mode) */}
            {mode === 'project' && showToolPicker && (
              <div className="my-2 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Built with</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {AI_TOOLS.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => toggleTool(tool)}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full transition-colors',
                        selectedTools.includes(tool)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border hover:border-primary'
                      )}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tool..."
                    value={customTool}
                    onChange={(e) => setCustomTool(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTool()}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomTool}
                    disabled={!customTool.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Formatting Toolbar */}
          <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
            <div className="flex items-center gap-0.5">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => applyFormat('bold')}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => applyFormat('italic')}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => applyFormat('heading')}
                title="Heading"
              >
                <Heading2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => applyFormat('quote')}
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => applyFormat('code')}
                title="Inline Code"
              >
                <Code className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => applyFormat('list')}
                title="List"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => applyFormat('link')}
                title="Link"
              >
                <Link2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-primary hover:bg-primary/10">
                <Image className="w-5 h-5" />
              </Button>
              {mode === 'project' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-primary/10",
                    showToolPicker ? "text-primary bg-primary/10" : "text-primary"
                  )}
                  onClick={() => setShowToolPicker(!showToolPicker)}
                >
                  <Code2 className="w-5 h-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-primary hover:bg-primary/10">
                <Sparkles className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span className={cn(
                  "text-xs",
                  content.length > 500 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {content.length}
                </span>
              )}
              <Button
                onClick={handlePost}
                disabled={!canPost}
                className="rounded-full px-5"
              >
                Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
