import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SectionDivider } from '@/components/ui/section-divider'
import { Heart, MessageCircle, ExternalLink, ArrowRight, Bookmark, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { PremiumBadge } from '@/components/PremiumBadge'

interface Project {
  id: string
  title: string
  content: string
  image?: string
  author: {
    username: string
    name: string
    avatar_url?: string
    is_verified?: boolean
    is_premium?: boolean
  }
  tools?: string[]
  stack?: string[]
  likes: number
  comments: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function FeaturedProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await api.getProjects({ limit: 6, sort_by: 'popular' })
        setProjects(response.data as Project[])
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // Don't render section if no projects
  if (!loading && projects.length === 0) {
    return null
  }

  return (
    <section id="projects" className="py-20 sm:py-28 relative bg-muted/50">
      <SectionDivider variant="wave" flip fillClassName="fill-background" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Trending Now
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Featured Projects
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover what the community is building. From weekend experiments to production-ready apps,
            all created with AI assistance.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-border bg-card h-full py-0 shadow-none">
                <CardContent className="p-0">
                  <div className="aspect-[16/10] bg-muted animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                    <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-full" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded animate-pulse w-16" />
                      <div className="h-6 bg-muted rounded animate-pulse w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Projects Grid */
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {projects.map((project, index) => (
              <motion.div key={project.id} variants={cardVariants}>
                <a href={`https://onvibe.dev/project/${project.id}`}>
                  <Card
                    className={`group border-border bg-card hover:border-primary/40 transition-all duration-300 h-full py-0 shadow-none hover:shadow-md hover:scale-[1.01] ${index === 0 ? 'ring-1 ring-primary/20' : ''}`}
                  >
                    <CardContent className="p-0">
                      {/* Project Image Area */}
                      <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                        {project.image ? (
                          <img
                            src={project.image}
                            alt={project.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <span className="text-4xl font-bold text-primary/30">{project.title[0]}</span>
                          </div>
                        )}
                        {/* Subtle bottom gradient for depth */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

                        {index === 0 && (
                          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs z-10">
                            Featured
                          </Badge>
                        )}

                        {/* Bookmark button */}
                        <button
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background hover:scale-105 z-10"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Bookmark className="w-4 h-4 text-foreground" />
                        </button>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs z-10 shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3 mr-1.5" />
                          View
                        </Button>
                      </div>

                      {/* Project Info */}
                      <div className="p-5 bg-card">
                        {/* Author */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={project.author?.avatar_url} alt={project.author?.name ?? 'Anonymous'} />
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                              {getInitials(project.author?.name ?? 'Anonymous')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{project.author?.name ?? 'Anonymous'}</span>
                          {project.author?.is_verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/20 flex-shrink-0" />
                          )}
                          {project.author?.is_premium && <PremiumBadge />}
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-semibold mb-2">
                          {project.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {project.content}
                        </p>

                        {/* Tools */}
                        {(project.tools && project.tools.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {project.tools.slice(0, 3).map((tool) => (
                              <span key={tool} className="text-xs bg-muted/80 px-2.5 py-1 rounded-md text-muted-foreground font-medium border border-border/50">
                                {tool}
                              </span>
                            ))}
                            {project.tools.length > 3 && (
                              <span className="text-xs bg-muted/80 px-2.5 py-1 rounded-md text-muted-foreground font-medium border border-border/50">
                                +{project.tools.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border">
                          <span className="flex items-center gap-1.5">
                            <Heart className="w-4 h-4" />
                            {project.likes}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4" />
                            {project.comments}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All Button */}
        <div className="text-center mt-10">
          <Button variant="outline" size="lg" asChild>
            <a href="https://onvibe.dev">
              View All Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
      <SectionDivider variant="curve" fillClassName="fill-background" />
    </section>
  )
}
