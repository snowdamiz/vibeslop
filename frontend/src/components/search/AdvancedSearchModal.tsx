import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { api } from '@/lib/api'

interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AdvancedSearchModal({ isOpen, onClose }: AdvancedSearchModalProps) {
  const navigate = useNavigate()
  
  // Form state
  const [keywords, setKeywords] = useState('')
  const [fromUser, setFromUser] = useState('')
  const [hasMedia, setHasMedia] = useState(false)
  const [hasProject, setHasProject] = useState(false)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedStacks, setSelectedStacks] = useState<string[]>([])
  const [sinceDate, setSinceDate] = useState('')
  const [untilDate, setUntilDate] = useState('')
  const [excludeWords, setExcludeWords] = useState('')
  
  // Available options
  const [availableTools, setAvailableTools] = useState<Array<{ name: string; slug: string }>>([])
  const [availableStacks, setAvailableStacks] = useState<Array<{ name: string; slug: string }>>([])

  // Fetch tools and stacks on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [toolsRes, stacksRes] = await Promise.all([
          api.getTools(),
          api.getStacks()
        ])
        setAvailableTools(toolsRes.data as Array<{ name: string; slug: string }>)
        setAvailableStacks(stacksRes.data as Array<{ name: string; slug: string }>)
      } catch (error) {
        console.error('Failed to fetch search options:', error)
      }
    }
    
    if (isOpen) {
      fetchOptions()
    }
  }, [isOpen])

  const buildQuery = () => {
    const parts: string[] = []
    
    // Add keywords
    if (keywords.trim()) {
      parts.push(keywords.trim())
    }
    
    // Add from user
    if (fromUser.trim()) {
      parts.push(`from:${fromUser.trim()}`)
    }
    
    // Add has filters
    if (hasMedia) {
      parts.push('has:media')
    }
    if (hasProject) {
      parts.push('has:project')
    }
    
    // Add tools
    selectedTools.forEach(tool => {
      parts.push(`tool:${tool}`)
    })
    
    // Add stacks
    selectedStacks.forEach(stack => {
      parts.push(`stack:${stack}`)
    })
    
    // Add date filters
    if (sinceDate) {
      parts.push(`since:${sinceDate}`)
    }
    if (untilDate) {
      parts.push(`until:${untilDate}`)
    }
    
    // Add excluded words
    if (excludeWords.trim()) {
      const excluded = excludeWords.trim().split(/\s+/)
      excluded.forEach(word => {
        parts.push(`-${word}`)
      })
    }
    
    return parts.join(' ')
  }

  const handleSearch = () => {
    const query = buildQuery()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
      onClose()
      resetForm()
    }
  }

  const resetForm = () => {
    setKeywords('')
    setFromUser('')
    setHasMedia(false)
    setHasProject(false)
    setSelectedTools([])
    setSelectedStacks([])
    setSinceDate('')
    setUntilDate('')
    setExcludeWords('')
  }

  const toggleTool = (slug: string) => {
    setSelectedTools(prev =>
      prev.includes(slug)
        ? prev.filter(t => t !== slug)
        : [...prev, slug]
    )
  }

  const toggleStack = (slug: string) => {
    setSelectedStacks(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
          <DialogDescription>
            Build a detailed search query to find exactly what you're looking for
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              placeholder="Enter keywords or phrases..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use quotes for exact phrases: "machine learning"
            </p>
          </div>

          {/* From User */}
          <div className="space-y-2">
            <Label htmlFor="fromUser">From User</Label>
            <Input
              id="fromUser"
              placeholder="Username (without @)"
              value={fromUser}
              onChange={(e) => setFromUser(e.target.value)}
            />
          </div>

          {/* Content Type Filters */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMedia}
                  onChange={(e) => setHasMedia(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Has media</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasProject}
                  onChange={(e) => setHasProject(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Has project link</span>
              </label>
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <Label>AI Tools (for projects)</Label>
            <div className="flex flex-wrap gap-2">
              {availableTools.slice(0, 12).map((tool) => (
                <Badge
                  key={tool.slug}
                  variant={selectedTools.includes(tool.slug) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTool(tool.slug)}
                >
                  {tool.name}
                  {selectedTools.includes(tool.slug) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stacks */}
          <div className="space-y-2">
            <Label>Tech Stack (for projects)</Label>
            <div className="flex flex-wrap gap-2">
              {availableStacks.slice(0, 12).map((stack) => (
                <Badge
                  key={stack.slug}
                  variant={selectedStacks.includes(stack.slug) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleStack(stack.slug)}
                >
                  {stack.name}
                  {selectedStacks.includes(stack.slug) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sinceDate">Posted After</Label>
              <Input
                id="sinceDate"
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="untilDate">Posted Before</Label>
              <Input
                id="untilDate"
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
              />
            </div>
          </div>

          {/* Exclude Words */}
          <div className="space-y-2">
            <Label htmlFor="excludeWords">Exclude Words</Label>
            <Input
              id="excludeWords"
              placeholder="Words to exclude (space-separated)"
              value={excludeWords}
              onChange={(e) => setExcludeWords(e.target.value)}
            />
          </div>

          {/* Query Preview */}
          {buildQuery() && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Query Preview</Label>
              <div className="p-3 bg-muted rounded-lg text-sm font-mono">
                {buildQuery()}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleSearch} disabled={!buildQuery()}>
            Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
