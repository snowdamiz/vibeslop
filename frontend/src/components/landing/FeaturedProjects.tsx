import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SectionDivider } from '@/components/ui/section-divider'
import { Heart, MessageCircle, ExternalLink, ArrowRight, Bookmark } from 'lucide-react'
import { motion } from 'framer-motion'

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

const projects = [
  {
    id: 1,
    title: 'AI-Powered Code Review Dashboard',
    description: 'A real-time dashboard that uses Claude to analyze pull requests and provide actionable feedback.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
    author: { name: 'Sarah Chen', initials: 'SC' },
    tools: ['Cursor', 'Claude', 'React'],
    likes: 234,
    comments: 45,
    featured: true,
  },
  {
    id: 2,
    title: 'Conversational Data Explorer',
    description: 'Chat with your data using natural language. Built in a weekend with v0 and GPT-4.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    author: { name: 'Marcus Johnson', initials: 'MJ' },
    tools: ['v0', 'GPT-4', 'Next.js'],
    likes: 189,
    comments: 32,
    featured: false,
  },
  {
    id: 3,
    title: 'Generative Art Studio',
    description: 'Create stunning visuals with AI. A creative playground combining multiple AI tools.',
    image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=400&fit=crop',
    author: { name: 'Luna Park', initials: 'LP' },
    tools: ['Midjourney', 'Claude', 'Svelte'],
    likes: 312,
    comments: 67,
    featured: true,
  },
  {
    id: 4,
    title: 'Smart Budget Tracker',
    description: 'Personal finance app that categorizes expenses using AI and provides spending insights.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
    author: { name: 'Alex Rivera', initials: 'AR' },
    tools: ['Bolt', 'GPT-4', 'Vue'],
    likes: 156,
    comments: 28,
    featured: false,
  },
  {
    id: 5,
    title: 'Documentation Generator',
    description: 'Automatically generate beautiful docs from your codebase. Just point and click.',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=600&h=400&fit=crop',
    author: { name: 'Jordan Lee', initials: 'JL' },
    tools: ['Cursor', 'Claude', 'Astro'],
    likes: 278,
    comments: 51,
    featured: true,
  },
  {
    id: 6,
    title: 'Recipe Remix App',
    description: 'Upload any recipe and get variations based on dietary preferences, ingredients on hand, or cuisine style.',
    image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&h=400&fit=crop',
    author: { name: 'Mia Thompson', initials: 'MT' },
    tools: ['Replit AI', 'Claude', 'React'],
    likes: 145,
    comments: 23,
    featured: false,
  },
]

export function FeaturedProjects() {
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

        {/* Projects Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {projects.map((project, index) => (
            <motion.div key={project.id} variants={cardVariants}>
              <Card
                className={`group border-border bg-card hover:border-primary/40 transition-all duration-300 h-full py-0 shadow-none hover:shadow-md hover:scale-[1.01] ${project.featured ? 'ring-1 ring-primary/20' : ''}`}
              >
                <CardContent className="p-0">
                  {/* Project Image Area */}
                  <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    {/* Subtle bottom gradient for depth */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

                    {project.featured && (
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs z-10">
                        Featured
                      </Badge>
                    )}

                    {/* Bookmark button */}
                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background hover:scale-105 z-10">
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
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={`https://i.pravatar.cc/150?img=${40 + index}`} alt={project.author.name} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {project.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{project.author.name}</span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-semibold mb-2">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {project.description}
                    </p>

                    {/* Tools */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.tools.map((tool) => (
                        <span key={tool} className="text-xs bg-muted/80 px-2.5 py-1 rounded-md text-muted-foreground font-medium border border-border/50">
                          {tool}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border">
                      <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Heart className="w-4 h-4" />
                        {project.likes}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        {project.comments}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <Button variant="outline" size="lg">
            View All Projects
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      <SectionDivider variant="curve" fillClassName="fill-background" />
    </section>
  )
}
