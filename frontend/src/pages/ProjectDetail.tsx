import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommentsSection } from '@/components/comments'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/ui/markdown-content'
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
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

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
  prompts: Array<{ id: string; title: string; description: string; code: string }>
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
  prompts: Array<{ title: string; description: string; code: string }>
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
      color: 'from-violet-500 to-purple-600',
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
    prompts: apiProject.prompts?.map(p => ({
      title: p.title,
      description: p.description,
      code: p.code,
    })) || [],
    timeline: apiProject.timeline?.map(t => ({
      date: t.date,
      title: t.title,
      description: t.description,
    })) || [],
    comments: [], // Comments would need to be fetched separately
    moreFromAuthor: [],
    relatedProjects: [],
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

export function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<NormalizedProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isImageHovered, setIsImageHovered] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [expandedPrompts, setExpandedPrompts] = useState<number[]>([])
  const [comments, setComments] = useState<NormalizedProject['comments']>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

  const copyPrompt = (index: number, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  const togglePromptExpanded = (index: number) => {
    setExpandedPrompts(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
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
    <div className="relative min-h-screen">
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
              {/* Main Image */}
              <div 
                className="relative rounded-2xl overflow-hidden bg-muted group cursor-pointer"
                onMouseEnter={() => setIsImageHovered(true)}
                onMouseLeave={() => setIsImageHovered(false)}
                onClick={() => setIsFullscreen(true)}
              >
                <div className="aspect-[16/10] relative overflow-hidden">
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
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">{project.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {project.created_at}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                <StatItem icon={Bookmark} value={42} label="saves" />
              </div>

              {/* Social Proof - only show if there are likes */}
              {likeCount > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex -space-x-2">
                    {['AR', 'JL', 'MT', 'DK'].slice(0, Math.min(4, likeCount)).map((initials, i) => (
                      <Avatar key={i} className="w-7 h-7 ring-2 ring-background">
                        <AvatarImage src={`https://i.pravatar.cc/150?img=${10 + i}`} alt={initials} />
                        <AvatarFallback className={cn(
                          "text-[10px] font-medium text-white",
                          i === 0 && "bg-gradient-to-br from-blue-500 to-cyan-500",
                          i === 1 && "bg-gradient-to-br from-green-500 to-emerald-500",
                          i === 2 && "bg-gradient-to-br from-orange-500 to-amber-500",
                          i === 3 && "bg-gradient-to-br from-purple-500 to-pink-500"
                        )}>
                          {initials}
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
              <div className="text-muted-foreground mb-6 leading-relaxed text-lg">
                <MarkdownContent content={project.description} />
              </div>

              {/* Links - only show if there are links */}
              {(project.links.live || project.links.github) && (
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
              <Tabs defaultValue="about" className="mt-8">
                <TabsList className="mb-6 p-1 bg-muted/50 border border-border">
                  <TabsTrigger value="about" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    About
                  </TabsTrigger>
                  <TabsTrigger value="prompts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Code2 className="w-4 h-4 mr-1.5" />
                    Prompts
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Clock className="w-4 h-4 mr-1.5" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Comments ({project.stats.comments})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="about">
                  <Card className="border-border !py-0 !gap-0">
                    <CardContent className="p-4">
                      {/* Key Highlights - only show if there are highlights */}
                      {project.highlights.length > 0 && (
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

                      <h3 className="font-semibold mb-4">About this project</h3>
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        {project.longDescription.split('\n\n').map((paragraph: string, index: number) => (
                          <p key={index} className="mb-4 last:mb-0 leading-relaxed text-[15px]">
                            {index === 0 && (
                              <span className="text-3xl font-semibold text-foreground float-left mr-2 leading-none">
                                {paragraph.charAt(0)}
                              </span>
                            )}
                            {index === 0 ? paragraph.slice(1) : paragraph}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="prompts">
                  {project.prompts.length === 0 ? (
                    <Card className="border-border !py-0 !gap-0">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No prompts shared for this project yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                  <motion.div
                    className="space-y-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {project.prompts.map((prompt: { title: string; description: string; code: string }, index: number) => {
                      const isExpanded = expandedPrompts.includes(index)
                      const isLongPrompt = prompt.code.split('\n').length > 10
                      
                      return (
                        <motion.div key={index} variants={itemVariants}>
                          <Card className="border-border overflow-hidden !py-0 !gap-0">
                            <CardContent className="p-0">
                              {/* Header */}
                              <div className="flex items-start justify-between p-4 border-b border-border">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Code2 className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold">{prompt.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">{prompt.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs font-medium">
                                    {prompt.code.split('\n').length} lines
                                  </Badge>
                                  <Button
                                    variant={copiedIndex === index ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => copyPrompt(index, prompt.code)}
                                    className={cn(
                                      "transition-all gap-2",
                                      copiedIndex === index && "bg-green-500 hover:bg-green-600"
                                    )}
                                  >
                                    {copiedIndex === index ? (
                                      <>
                                        <Check className="w-4 h-4" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4" />
                                        Copy
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {/* Prompt content */}
                              <div className="relative">
                                <div 
                                  className={cn(
                                    "overflow-hidden transition-all duration-300",
                                    isLongPrompt && !isExpanded && "max-h-[240px]"
                                  )}
                                >
                                  <div className="p-4 bg-muted/30">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                      {prompt.code}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Gradient fade for collapsed long prompts */}
                                {isLongPrompt && !isExpanded && (
                                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/80 to-transparent pointer-events-none" />
                                )}

                                {/* Expand/Collapse button */}
                                {isLongPrompt && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => togglePromptExpanded(index)}
                                    className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-4 h-4 mr-1.5" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4 mr-1.5" />
                                        Show more
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="timeline">
                  {project.timeline.length === 0 ? (
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

            {/* Built With - only show if there are tools or stack */}
            {(project.aiTools.length > 0 || project.techStack.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="border-border !py-0 !gap-0">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Built With
                    </h3>
                    
                    {/* AI Tools */}
                    {project.aiTools.length > 0 && (
                      <div className="mb-4 p-2.5 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">AI Tools</p>
                        <div className="flex flex-wrap gap-1.5">
                          {project.aiTools.map((tool: string) => (
                            <Badge 
                              key={tool}
                              variant="default" 
                              className="bg-primary/15 text-primary font-medium text-xs"
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tech Stack */}
                    {project.techStack.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">Tech Stack</p>
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
    </div>
  )
}
