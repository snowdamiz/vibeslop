import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommentsSection } from '@/components/comments'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { useSEO } from '@/hooks/useSEO'
import {
  DescriptionEditor,
  TagSelector,
  HighlightsEditor,
  TimelineEditor,
  EditActionBar,
  AI_TOOLS_SUGGESTIONS,
  TECH_STACK_SUGGESTIONS,
  type TimelineEntry,
} from '@/components/project-editor'
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Github,
  Globe,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ArrowLeft,
  Clock,
  Eye,
  X,
  Maximize2,
  Lightbulb,
  Code2,
  Users,
  Rocket,
  Linkedin,
  BadgeCheck,
  Loader2,
  Pencil,
  Image as ImageIcon,
  Plus,
} from 'lucide-react'

// Animation variants
// Animation variants - unused, could be removed in cleanup
// const containerVariants = ...
// const itemVariants = ...

// API project types
interface ApiProject {
  id: string
  title: string
  description: string
  long_description?: string
  status?: string
  live_url?: string
  github_url?: string
  view_count?: number
  likes: number
  comments: number
  liked?: boolean
  bookmarked?: boolean
  created_at: string
  images: Array<{ id: string; url: string; alt_text?: string }>
  highlights: Array<{ id: string; content: string }>
  timeline: Array<{ id: string; date: string; title: string; description: string }>
  ai_tools: Array<{ id: string; name: string; slug: string }>
  tech_stack: Array<{ id: string; name: string; slug: string; category?: string }>
  author: {
    id: string
    name: string
    username: string
    initials: string
    avatar_url?: string
    bio?: string
    is_verified?: boolean
  }
  recent_likers?: Array<{
    id: string
    username: string
    display_name: string
    avatar_url?: string
    initials: string
  }>
}

// Edit state interface
interface ProjectEditState {
  title: string
  description: string
  images: string[]
  tools: string[]
  stack: string[]
  liveUrl: string
  githubUrl: string
  highlights: string[]
  timeline: TimelineEntry[]
}

// Normalized project type for component use
interface NormalizedProject {
  id: string
  title: string
  description: string
  longDescription: string
  highlights: string[]
  images: string[]
  author: {
    name: string
    username: string
    initials: string
    avatar_url?: string
    bio: string
    color: string
    verified: boolean
    followers?: number
    following?: number
    projects?: number
  }
  aiTools: string[]
  techStack: string[]
  links: {
    live?: string
    github?: string
  }
  stats: {
    likes: number
    comments: number
    views: number
  }
  created_at: string
  timeline: Array<{ date: string; title: string; description: string }>
  comments: Array<{
    id: string
    author: { name: string; initials: string; username: string }
    content: string
    likes: number
    created_at: string
    replyCount?: number
    replies?: Array<{
      id: string
      author: { name: string; initials: string; username: string }
      content: string
      likes: number
      created_at: string
      replyTo?: string
      replies?: Array<{
        id: string
        author: { name: string; initials: string; username: string }
        content: string
        likes: number
        created_at: string
        replyTo?: string
      }>
    }>
  }>
  moreFromAuthor: Array<{ id: string; title: string; image: string; likes: number; views: number }>
  relatedProjects: Array<{ id: string; title: string; image: string; author: string; likes?: number }>
  recentLikers: Array<{
    id: string
    username: string
    display_name: string
    avatar_url?: string
    initials: string
  }>
}

// Helper function to normalize API response to component format
function normalizeProject(apiProject: ApiProject): NormalizedProject {
  return {
    id: apiProject.id,
    title: apiProject.title,
    description: apiProject.description,
    longDescription: apiProject.long_description || apiProject.description,
    highlights: apiProject.highlights?.map(h => h.content) || [],
    images: apiProject.images?.map(img => img.url) || [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=800&fit=crop'
    ],
    author: {
      name: apiProject.author.name,
      username: apiProject.author.username,
      initials: apiProject.author.initials,
      avatar_url: apiProject.author.avatar_url,
      bio: apiProject.author.bio || '',
      color: 'from-blue-500 to-indigo-600',
      verified: apiProject.author.is_verified || false,
    },
    aiTools: apiProject.ai_tools?.map(t => t.name) || [],
    techStack: apiProject.tech_stack?.map(t => t.name) || [],
    links: {
      live: apiProject.live_url,
      github: apiProject.github_url,
    },
    stats: {
      likes: apiProject.likes || 0,
      comments: apiProject.comments || 0,
      views: apiProject.view_count || 0,
    },
    created_at: apiProject.created_at,
    timeline: apiProject.timeline?.map(t => ({
      date: t.date,
      title: t.title,
      description: t.description,
    })) || [],
    comments: [], // Comments would need to be fetched separately
    moreFromAuthor: [],
    relatedProjects: [],
    recentLikers: apiProject.recent_likers || [],
  }
}

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    const startValue = 0

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * (value - startValue) + startValue))
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{count.toLocaleString()}</span>
}

// Stat item component
function StatItem({
  icon: Icon,
  value,
  label,
  animated = false,
  onClick
}: {
  icon: React.ElementType
  value: number
  label: string
  animated?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors",
        onClick && "cursor-pointer"
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="font-semibold text-foreground">
        {animated ? <AnimatedCounter value={value} /> : value.toLocaleString()}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  )
}

// Format ISO date string to readable format
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState<NormalizedProject | null>(null)
  const [authorId, setAuthorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isImageHovered, setIsImageHovered] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [comments, setComments] = useState<NormalizedProject['comments']>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editState, setEditState] = useState<ProjectEditState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editImageIndex, setEditImageIndex] = useState(0)

  // Dynamic SEO for this project
  useSEO(project ? {
    title: project.title,
    description: project.description.slice(0, 160),
    image: project.images[0] || undefined,
    url: `https://onvibe.dev/project/${id}`,
    type: 'article',
  } : {})

  // Fetch project data
  useEffect(() => {
    if (!id) return

    const fetchProject = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await api.getProject(id)
        const apiData = response.data as ApiProject
        const normalized = normalizeProject(apiData)
        setProject(normalized)
        // Save author ID for edit button check
        setAuthorId(apiData.author.id)
        // Initialize engagement state from API response
        setIsLiked(apiData.liked ?? false)
        setIsBookmarked(apiData.bookmarked ?? false)
        setLikeCount(apiData.likes ?? 0)
      } catch (err) {
        console.error('Failed to fetch project:', err)
        setError('Failed to load project')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id])

  // Fetch comments after project loads
  useEffect(() => {
    if (!id || !project) return

    const fetchComments = async () => {
      setIsLoadingComments(true)
      try {
        const response = await api.getComments('project', id)
        setComments(response.data as NormalizedProject['comments'])
      } catch (err) {
        console.error('Failed to fetch comments:', err)
      } finally {
        setIsLoadingComments(false)
      }
    }

    fetchComments()
  }, [id, project])

  // Keyboard navigation for gallery
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFullscreen && project?.images) {
      if (e.key === 'Escape') setIsFullscreen(false)
      if (e.key === 'ArrowRight') setCurrentImageIndex((prev) => (prev + 1) % project.images.length)
      if (e.key === 'ArrowLeft') setCurrentImageIndex((prev) => (prev - 1 + project.images.length) % project.images.length)
    }
  }, [isFullscreen, project])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Check for unsaved changes (defined first so it can be used by handlers)
  const hasUnsavedChanges = useMemo(() => {
    if (!project || !editState) return false
    return (
      editState.title !== project.title ||
      editState.description !== project.longDescription ||
      JSON.stringify(editState.images) !== JSON.stringify(project.images) ||
      JSON.stringify(editState.tools) !== JSON.stringify(project.aiTools) ||
      JSON.stringify(editState.stack) !== JSON.stringify(project.techStack) ||
      editState.liveUrl !== (project.links.live || '') ||
      editState.githubUrl !== (project.links.github || '') ||
      JSON.stringify(editState.highlights) !== JSON.stringify(project.highlights) ||
      JSON.stringify(editState.timeline) !== JSON.stringify(project.timeline)
    )
  }, [project, editState])

  // Edit mode handlers
  const handleEnterEditMode = useCallback(() => {
    if (!project) return
    setEditState({
      title: project.title,
      description: project.longDescription,
      images: [...project.images],
      tools: [...project.aiTools],
      stack: [...project.techStack],
      liveUrl: project.links.live || '',
      githubUrl: project.links.github || '',
      highlights: [...project.highlights],
      timeline: project.timeline.map(t => ({ ...t })),
    })
    setEditImageIndex(0)
    setSaveError(null)
    setIsEditMode(true)
  }, [project])

  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) {
      return
    }
    setIsEditMode(false)
    setEditState(null)
    setSaveError(null)
  }, [hasUnsavedChanges])

  const handleSave = useCallback(async () => {
    if (!id || !editState) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await api.updateProject(id, {
        title: editState.title,
        description: editState.description,
        images: editState.images,
        tools: editState.tools,
        stack: editState.stack,
        live_url: editState.liveUrl || undefined,
        github_url: editState.githubUrl || undefined,
        highlights: editState.highlights,
        timeline: editState.timeline.filter(t => t.date && t.title),
      })

      // Refetch and update view
      const response = await api.getProject(id)
      const apiData = response.data as ApiProject
      const normalized = normalizeProject(apiData)
      setProject(normalized)
      setIsEditMode(false)
      setEditState(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }, [id, editState])

  // Image handling for edit mode
  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !editState) return

    const fileToBase64 = (file: File): Promise<string> => {
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
    }

    try {
      const fileArray = Array.from(files)
      const base64Images = await Promise.all(fileArray.map(fileToBase64))
      setEditState(prev => prev ? {
        ...prev,
        images: [...prev.images, ...base64Images]
      } : null)
    } catch (error) {
      console.error('Error uploading images:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload images')
    }
  }, [editState])

  const removeEditImage = useCallback((index: number) => {
    setEditState(prev => {
      if (!prev) return null
      const newImages = prev.images.filter((_, i) => i !== index)
      return { ...prev, images: newImages }
    })
    setEditImageIndex(prev => Math.max(0, Math.min(prev, (editState?.images.length || 1) - 2)))
  }, [editState?.images.length])

  if (isLoading) {
    return (
      <div className="relative min-h-screen pb-20">
        <div className="absolute inset-0 gradient-bg" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-6">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2">
              {/* Image Gallery Skeleton */}
              <div className="rounded-2xl overflow-hidden bg-muted mb-8">
                <div className="aspect-[16/9] animate-pulse" />
              </div>

              {/* Title & Actions Skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="h-8 w-3/4 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-9 w-9 bg-muted rounded animate-pulse" />
                  <div className="h-9 w-9 bg-muted rounded animate-pulse" />
                </div>
              </div>

              {/* Stats Bar Skeleton */}
              <div className="flex flex-wrap items-center gap-6 py-4 mb-4 border-y border-border">
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              </div>

              {/* Description Skeleton */}
              <div className="space-y-3 mb-6">
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              </div>

              {/* Links Skeleton */}
              <div className="flex flex-wrap gap-3 mb-8">
                <div className="h-10 w-28 bg-muted rounded animate-pulse" />
                <div className="h-10 w-28 bg-muted rounded animate-pulse" />
              </div>

              {/* Tabs Skeleton */}
              <div className="mt-8">
                <div className="h-10 w-64 bg-muted rounded-lg animate-pulse mb-6" />
                <div className="h-48 bg-muted rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              {/* Author Card Skeleton */}
              <div className="rounded-xl border border-border bg-card/50 p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-full bg-muted rounded animate-pulse mb-4" />
                <div className="h-9 w-full bg-muted rounded animate-pulse" />
              </div>

              {/* Tech Stack Skeleton */}
              <div className="rounded-xl border border-border bg-card/50 p-5">
                <div className="h-5 w-24 bg-muted rounded animate-pulse mb-4" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                  <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                  <div className="h-6 w-14 bg-muted rounded-full animate-pulse" />
                  <div className="h-6 w-18 bg-muted rounded-full animate-pulse" />
                </div>
              </div>

              {/* Share Card Skeleton */}
              <div className="rounded-xl border border-border bg-card/50 p-5">
                <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-16 bg-muted rounded animate-pulse" />
                  <div className="h-16 bg-muted rounded animate-pulse" />
                  <div className="h-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Project not found</p>
          <Link to="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % project.images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + project.images.length) % project.images.length)
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  // Handle adding a comment
  const handleAddComment = async (content: string, parentId?: string) => {
    if (!id) return

    try {
      const response = await api.createComment({
        commentable_type: 'Project',
        commentable_id: id,
        content,
        parent_id: parentId,
      })

      const newComment = response.data as NormalizedProject['comments'][0]

      if (parentId) {
        // If it's a reply, we need to update the nested structure
        // For now, just refetch all comments to keep it simple
        const commentsResponse = await api.getComments('project', id)
        setComments(commentsResponse.data as NormalizedProject['comments'])
      } else {
        // Add new top-level comment to the beginning
        setComments(prev => [newComment, ...prev])
      }

      // Update comment count in project stats
      if (project) {
        setProject({
          ...project,
          stats: {
            ...project.stats,
            comments: project.stats.comments + 1,
          },
        })
      }
    } catch (err) {
      console.error('Failed to create comment:', err)
    }
  }

  // Handle liking a comment
  const handleLikeComment = async (commentId: string) => {
    try {
      await api.toggleLike('comment', commentId)
      // Optionally update local state to reflect the like
      // For now, the Comment component handles this optimistically
    } catch (err) {
      console.error('Failed to like comment:', err)
    }
  }

  // Handle deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId)
      // Update comment count in project stats
      if (project) {
        setProject({
          ...project,
          stats: {
            ...project.stats,
            comments: Math.max(0, project.stats.comments - 1),
          },
        })
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
      throw err // Re-throw so the UI can handle it
    }
  }

  // Handle reporting a comment
  const handleReportComment = async (commentId: string) => {
    try {
      await api.reportComment(commentId)
      // Show success feedback (could add a toast notification here)
      console.log('Comment reported successfully')
    } catch (err) {
      console.error('Failed to report comment:', err)
    }
  }

  return (
    <div className="relative min-h-screen pb-20">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-6">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-6 group hover:bg-muted">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              {isEditMode && editState ? (
                /* Edit Mode Image Gallery */
                <div className="relative rounded-2xl overflow-hidden bg-muted">
                  {editState.images.length > 0 ? (
                    <div className="relative">
                      <div className="aspect-[16/9] relative overflow-hidden">
                        <img
                          src={editState.images[editImageIndex]}
                          alt={`Project screenshot ${editImageIndex + 1}`}
                          className="w-full h-full object-contain bg-muted/30"
                        />

                        {/* Delete button */}
                        <button
                          onClick={() => removeEditImage(editImageIndex)}
                          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Image counter badge */}
                        <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium">
                          {editImageIndex + 1} / {editState.images.length}
                        </div>

                        {/* Navigation Arrows */}
                        {editState.images.length > 1 && (
                          <>
                            <button
                              onClick={() => setEditImageIndex(prev => (prev - 1 + editState.images.length) % editState.images.length)}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background hover:scale-110 transition-all shadow-lg"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditImageIndex(prev => (prev + 1) % editState.images.length)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background hover:scale-110 transition-all shadow-lg"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Thumbnail strip */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 overflow-x-auto max-w-[90%]">
                        {editState.images.map((img, idx) => (
                          <div key={idx} className="relative flex-shrink-0 group/thumb">
                            <button
                              onClick={() => setEditImageIndex(idx)}
                              className={cn(
                                "w-10 h-7 rounded-md overflow-hidden ring-2 transition-all",
                                idx === editImageIndex ? "ring-primary" : "ring-transparent opacity-60 hover:opacity-100"
                              )}
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                            <button
                              onClick={() => removeEditImage(idx)}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <label className="w-10 h-7 rounded-md border border-dashed border-border bg-muted/50 flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
                          <Plus className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="aspect-[16/9] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Click to upload images</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB each</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                /* View Mode Image Gallery */
                <div
                  className="relative rounded-2xl overflow-hidden bg-muted group cursor-pointer"
                  onMouseEnter={() => setIsImageHovered(true)}
                  onMouseLeave={() => setIsImageHovered(false)}
                  onClick={() => setIsFullscreen(true)}
                >
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <motion.img
                      key={currentImageIndex}
                      src={project.images[currentImageIndex]}
                      alt={`${project.title} screenshot ${currentImageIndex + 1}`}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-500",
                        isImageHovered && "scale-105"
                      )}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />

                    {/* Overlay on hover */}
                    <div className={cn(
                      "absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300",
                      isImageHovered ? "opacity-100" : "opacity-0"
                    )}>
                      <div className="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                        <Maximize2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Click to expand</span>
                      </div>
                    </div>

                    {/* Image counter badge */}
                    <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium">
                      {currentImageIndex + 1} / {project.images.length}
                    </div>

                    {/* Navigation Arrows */}
                    {project.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); prevImage() }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background hover:scale-110 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextImage() }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background hover:scale-110 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* Image Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {project.images.map((_: string, index: number) => (
                        <button
                          key={index}
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index) }}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full transition-all",
                            index === currentImageIndex
                              ? 'bg-white scale-110 shadow-lg'
                              : 'bg-white/50 hover:bg-white/75'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Fullscreen Lightbox */}
            <AnimatePresence>
              {isFullscreen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                  onClick={() => setIsFullscreen(false)}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Image counter */}
                  <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
                    {currentImageIndex + 1} / {project.images.length}
                  </div>

                  {/* Keyboard hint */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
                    Use arrow keys to navigate • Press ESC to close
                  </div>

                  {/* Main image */}
                  <motion.img
                    key={currentImageIndex}
                    src={project.images[currentImageIndex]}
                    alt={`${project.title} screenshot ${currentImageIndex + 1}`}
                    className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Navigation */}
                  {project.images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImage() }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors text-white"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImage() }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors text-white"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Thumbnail strip in fullscreen */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
                    {project.images.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i) }}
                        className={cn(
                          "w-16 h-12 rounded-md overflow-hidden ring-2 transition-all",
                          i === currentImageIndex
                            ? "ring-white"
                            : "ring-transparent opacity-50 hover:opacity-100"
                        )}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Title & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  {isEditMode && editState ? (
                    <Input
                      value={editState.title}
                      onChange={(e) => setEditState(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="text-2xl sm:text-3xl font-bold h-auto py-1 px-2 mb-2"
                      placeholder="Project title"
                    />
                  ) : (
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">{project.title}</h1>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit button - only show for project owner */}
                  {user && authorId === user.id && !isEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnterEditMode}
                      className="gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant={isLiked ? 'default' : 'outline'}
                    size="sm"
                    onClick={async () => {
                      // Optimistic update
                      const newIsLiked = !isLiked
                      setIsLiked(newIsLiked)
                      setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1)
                      try {
                        await api.toggleLike('project', id!)
                      } catch (error) {
                        // Revert on error
                        setIsLiked(!newIsLiked)
                        setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1)
                        console.error('Failed to toggle like:', error)
                      }
                    }}
                    className={cn(
                      "transition-all",
                      isLiked && "bg-red-500 hover:bg-red-600 border-red-500 text-white"
                    )}
                  >
                    <Heart className={cn(
                      "w-4 h-4 mr-2 transition-transform",
                      isLiked && "fill-current scale-110"
                    )} />
                    {likeCount}
                  </Button>
                  <Button
                    variant={isBookmarked ? 'default' : 'outline'}
                    size="icon"
                    onClick={async () => {
                      // Optimistic update
                      const newIsBookmarked = !isBookmarked
                      setIsBookmarked(newIsBookmarked)
                      try {
                        await api.toggleBookmark('project', id!)
                      } catch (error) {
                        // Revert on error
                        setIsBookmarked(!newIsBookmarked)
                        console.error('Failed to toggle bookmark:', error)
                      }
                    }}
                    className={cn(
                      "transition-all",
                      isBookmarked && "bg-yellow-500 hover:bg-yellow-600 border-yellow-500"
                    )}
                  >
                    <Bookmark className={cn(
                      "w-4 h-4 transition-transform",
                      isBookmarked && "fill-current scale-110"
                    )} />
                  </Button>
                  <Button variant="outline" size="icon" onClick={copyShareLink}>
                    {copiedShare ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-6 py-4 mb-4 border-y border-border">
                <StatItem icon={Eye} value={project.stats.views} label="views" animated />
                <StatItem icon={Heart} value={likeCount} label="likes" animated />
                <StatItem icon={MessageCircle} value={project.stats.comments} label="comments" />
              </div>

              {/* Social Proof - only show if there are likes */}
              {likeCount > 0 && project.recentLikers.length > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex -space-x-2">
                    {project.recentLikers.slice(0, 4).map((liker, i) => (
                      <Avatar key={liker.id} className="w-7 h-7 ring-2 ring-background">
                        <AvatarImage src={liker.avatar_url} alt={liker.display_name} />
                        <AvatarFallback className={cn(
                          "text-[10px] font-medium text-white",
                          i === 0 && "bg-gradient-to-br from-blue-500 to-cyan-500",
                          i === 1 && "bg-gradient-to-br from-green-500 to-emerald-500",
                          i === 2 && "bg-gradient-to-br from-orange-500 to-amber-500",
                          i === 3 && "bg-gradient-to-br from-indigo-500 to-pink-500"
                        )}>
                          {liker.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {likeCount === 1 ? (
                      <span className="font-medium text-foreground">1 person liked this</span>
                    ) : (
                      <span className="font-medium text-foreground">{likeCount.toLocaleString()} people liked this</span>
                    )}
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                {isEditMode && editState ? (
                  <DescriptionEditor
                    content={editState.description}
                    onChange={(content) => setEditState(prev => prev ? { ...prev, description: content } : null)}
                    placeholder="Describe your project..."
                  />
                ) : (
                  <div className="text-muted-foreground leading-relaxed text-base">
                    <MarkdownContent content={project.description} />
                  </div>
                )}
              </div>

              {/* Key Highlights */}
              {isEditMode && editState ? (
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                  <HighlightsEditor
                    highlights={editState.highlights}
                    onChange={(highlights) => setEditState(prev => prev ? { ...prev, highlights } : null)}
                  />
                </div>
              ) : project.highlights.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Key Highlights
                  </h4>
                  <ul className="grid gap-2">
                    {project.highlights.map((highlight: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Links */}
              {isEditMode && editState ? (
                <div className="flex flex-wrap gap-3 mb-8">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      Live Demo URL
                    </label>
                    <Input
                      placeholder="https://your-project.com"
                      value={editState.liveUrl}
                      onChange={(e) => setEditState(prev => prev ? { ...prev, liveUrl: e.target.value } : null)}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Github className="w-3.5 h-3.5 text-muted-foreground" />
                      GitHub URL
                    </label>
                    <Input
                      placeholder="https://github.com/username/repo"
                      value={editState.githubUrl}
                      onChange={(e) => setEditState(prev => prev ? { ...prev, githubUrl: e.target.value } : null)}
                    />
                  </div>
                </div>
              ) : (project.links.live || project.links.github) && (
                <div className="flex flex-wrap gap-3 mb-8">
                  {project.links.live && (
                    <a href={project.links.live} target="_blank" rel="noopener noreferrer">
                      <Button className="group shadow-md hover:shadow-lg transition-all">
                        <Globe className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        Live Demo
                      </Button>
                    </a>
                  )}
                  {project.links.github && (
                    <a href={project.links.github} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="group hover:bg-muted transition-all">
                        <Github className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        View Source
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {/* Tabs */}
              <Tabs defaultValue="timeline" className="mt-8">
                <TabsList className="mb-6 p-1 bg-muted/50 border border-border">
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Clock className="w-4 h-4 mr-1.5" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Comments ({project.stats.comments})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="timeline">
                  {isEditMode && editState ? (
                    <Card className="border-border !py-0 !gap-0">
                      <CardContent className="p-5">
                        <TimelineEditor
                          timeline={editState.timeline}
                          onChange={(timeline) => setEditState(prev => prev ? { ...prev, timeline } : null)}
                        />
                      </CardContent>
                    </Card>
                  ) : project.timeline.length === 0 ? (
                    <Card className="border-border !py-0 !gap-0">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No build timeline shared for this project yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-border !py-0 !gap-0">
                      <CardContent className="p-5">
                        <h3 className="font-semibold mb-6 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          Build Journey
                        </h3>
                        <div className="relative">
                          {/* Timeline line */}
                          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-primary/20" />

                          <div className="space-y-6">
                            {project.timeline.map((item: { date: string; title: string; description: string }, index: number) => {
                              const icons = [Lightbulb, Code2, Users, Rocket]
                              const Icon = icons[index % icons.length]

                              return (
                                <motion.div
                                  key={index}
                                  className="relative pl-10"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  {/* Timeline dot */}
                                  <div className="absolute left-0 top-1 w-[31px] h-[31px] rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                                    <Icon className="w-3.5 h-3.5 text-primary" />
                                  </div>

                                  <div className="pt-0.5">
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                      <Calendar className="w-3 h-3" />
                                      {item.date}
                                    </div>
                                    <h4 className="font-medium text-sm">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="comments">
                  {isLoadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <CommentsSection
                      comments={comments}
                      onAddComment={handleAddComment}
                      onLikeComment={handleLikeComment}
                      onDeleteComment={handleDeleteComment}
                      onReportComment={handleReportComment}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Author Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-border !py-0 !gap-0">
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <Link to={`/user/${project.author.username}`} className="inline-block">
                      <Avatar className="w-16 h-16 mx-auto mb-3">
                        <AvatarImage src={project.author.avatar_url} alt={project.author.name} />
                        <AvatarFallback className={`bg-gradient-to-br ${project.author.color} text-white text-lg font-semibold`}>
                          {project.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center justify-center gap-1.5">
                        <h3 className="font-semibold hover:text-primary transition-colors">
                          {project.author.name}
                        </h3>
                        {project.author.verified && (
                          <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
                        )}
                      </div>
                    </Link>
                    <p className="text-sm text-muted-foreground">@{project.author.username}</p>
                  </div>

                  {project.author.bio && (
                    <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-3">
                      {project.author.bio}
                    </p>
                  )}

                  {/* Stats row - only show if stats are available */}
                  {(project.author.followers !== undefined || project.author.following !== undefined || project.author.projects !== undefined) && (
                    <div className="flex justify-center gap-5 py-3 mb-3 border-y border-border">
                      {project.author.followers !== undefined && (
                        <div className="text-center">
                          <p className="font-semibold text-sm">{project.author.followers.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Followers</p>
                        </div>
                      )}
                      {project.author.following !== undefined && (
                        <div className="text-center">
                          <p className="font-semibold text-sm">{project.author.following}</p>
                          <p className="text-[10px] text-muted-foreground">Following</p>
                        </div>
                      )}
                      {project.author.projects !== undefined && (
                        <div className="text-center">
                          <p className="font-semibold text-sm">{project.author.projects}</p>
                          <p className="text-[10px] text-muted-foreground">Projects</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button className="w-full group" size="sm">
                    <span className="group-hover:hidden">Follow</span>
                    <span className="hidden group-hover:inline">Follow @{project.author.username}</span>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Built With - Tech Stack and AI Tools */}
            {isEditMode && editState ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="border-border !py-0 !gap-0">
                  <CardContent className="p-4 space-y-6">
                    <TagSelector
                      selected={editState.tools}
                      onChange={(tools) => setEditState(prev => prev ? { ...prev, tools } : null)}
                      suggestions={AI_TOOLS_SUGGESTIONS}
                      label="AI Tools"
                      icon={<Sparkles className="w-3.5 h-3.5 text-muted-foreground" />}
                    />
                    <TagSelector
                      selected={editState.stack}
                      onChange={(stack) => setEditState(prev => prev ? { ...prev, stack } : null)}
                      suggestions={TECH_STACK_SUGGESTIONS}
                      label="Technologies"
                      icon={<Code2 className="w-3.5 h-3.5 text-muted-foreground" />}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ) : (project.techStack.length > 0 || project.aiTools.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="border-border !py-0 !gap-0">
                  <CardContent className="p-4 space-y-4">
                    {project.aiTools.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          AI Tools
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {project.aiTools.map((tool: string) => (
                            <Badge
                              key={tool}
                              variant="outline"
                              className="text-xs bg-primary/5"
                            >
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {project.techStack.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-primary" />
                          Technologies
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {project.techStack.map((tech: string) => (
                            <Badge
                              key={tech}
                              variant="outline"
                              className="text-xs"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Share */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border-border !py-0 !gap-0">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Share this project</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <a
                      href={`https://twitter.com/intent/tweet?text=Check out this amazing project: ${project.title}&url=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="w-full h-auto py-3 flex flex-col gap-1.5 hover:bg-foreground/5 hover:border-foreground/20 transition-all">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span className="text-[10px]">X</span>
                      </Button>
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="w-full h-auto py-3 flex flex-col gap-1.5 hover:bg-[#0A66C2]/10 hover:border-[#0A66C2]/30 hover:text-[#0A66C2] transition-all">
                        <Linkedin className="w-4 h-4" />
                        <span className="text-[10px]">LinkedIn</span>
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full h-auto py-3 flex flex-col gap-1.5 transition-all",
                        copiedShare ? "bg-green-500/10 border-green-500/30 text-green-600" : "hover:bg-muted"
                      )}
                      onClick={copyShareLink}
                    >
                      {copiedShare ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span className="text-[10px]">{copiedShare ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* More from Author - only show if there are more projects */}
            {project.moreFromAuthor.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="border-border !py-0 !gap-0">
                  <CardContent className="p-4">
                    <div className="flex items-baseline justify-between gap-2 mb-4">
                      <h3 className="font-semibold text-sm">More from {project.author.name}</h3>
                      <Link
                        to={`/user/${project.author.username}`}
                        className="text-xs text-primary hover:underline shrink-0"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {project.moreFromAuthor.map((item: { id: string; image: string; title: string; likes: number; views: number }) => (
                        <Link key={item.id} to={`/project/${item.id}`} className="block">
                          <div className="group">
                            <div className="aspect-video rounded-lg bg-muted overflow-hidden mb-2">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                              <span className="flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5" />
                                {item.likes}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                {item.views}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Related Projects - only show if there are related projects */}
            {project.relatedProjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Card className="border-border !py-0 !gap-0">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-4">Similar Projects</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {project.relatedProjects.map((item: { id: string; image: string; title: string; author: string }) => (
                        <Link key={item.id} to={`/project/${item.id}`} className="block">
                          <div className="group">
                            <div className="aspect-video rounded-lg bg-muted overflow-hidden mb-2">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <h4 className="text-xs font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {item.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              by {item.author}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Action Bar */}
      {isEditMode && editState && (
        <EditActionBar
          onSave={handleSave}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
          hasChanges={hasUnsavedChanges}
          error={saveError}
        />
      )}
    </div>
  )
}
