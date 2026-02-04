import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { PremiumBadge } from '@/components/PremiumBadge'

const rotatingWords = ['AI-native', 'vibe coding', 'prompt-driven', 'AI-powered']

interface HeroProject {
  id: string
  title: string
  image?: string
  author: {
    name: string
    is_verified?: boolean
    is_premium?: boolean
  }
  tools?: string[]
}

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0)
  const [projects, setProjects] = useState<HeroProject[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await api.getProjects({ limit: 3, sort_by: 'recent' })
        setProjects(response.data as HeroProject[])
      } catch (error) {
        console.error('Failed to fetch hero projects:', error)
      }
    }
    fetchProjects()
  }, [])
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated background with gradient orbs */}
      <div className="absolute inset-0 gradient-bg" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.25, 0.2],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[140px]"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.15, 0.2, 0.15],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-26 sm:py-28">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
            The home for vibe coders
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Where{' '}
            <span className="relative inline-block min-w-[9ch] sm:min-w-[11ch]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  className="gradient-text inline-block whitespace-nowrap"
                  initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {rotatingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>{' '}
            <br className="hidden sm:block" />
            builders show their work
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            onvibe is the portfolio platform for creators who build with AI.
            Showcase your projects, share your process, and connect with fellow vibe coders.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Button size="lg" className="text-base px-8 glow" asChild>
              <a href="https://onvibe.dev/signup">
                Start Building Your Portfolio
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <a href="https://onvibe.dev">
                View Projects
              </a>
            </Button>
          </div>
        </div>

        {/* Project Showcase Grid */}
        {projects.length > 0 && (
          <motion.div
            className="mt-16 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Simple 3-card grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Featured - First Project */}
                {projects[0] && (
                  <a href={`https://onvibe.dev/project/${projects[0].id}`} className="md:col-span-2 relative rounded-2xl overflow-hidden bg-card border border-border group">
                    <div className="aspect-[16/9]">
                      {projects[0].image ? (
                        <img
                          src={projects[0].image}
                          alt={projects[0].title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-medium bg-primary/90 text-primary-foreground px-2 py-0.5 rounded-full">Featured</span>
                          <span className="flex items-center gap-1 text-[10px] text-white/70">
                            by {projects[0].author?.name ?? 'Anonymous'}
                            {projects[0].author?.is_verified && (
                              <CheckCircle2 className="w-3 h-3 text-primary fill-primary/20" />
                            )}
                            {projects[0].author?.is_premium && <PremiumBadge />}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-lg">{projects[0].title}</h3>
                        {projects[0].tools && projects[0].tools.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {projects[0].tools.slice(0, 2).map((tool) => (
                              <span key={tool} className="text-[10px] bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md text-white/90">{tool}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                )}

                {/* Stacked right column */}
                <div className="flex flex-col gap-4">
                  {/* Second Project */}
                  {projects[1] && (
                    <a href={`https://onvibe.dev/project/${projects[1].id}`} className="relative rounded-2xl overflow-hidden bg-card border border-border group">
                      <div className="aspect-[4/3]">
                        {projects[1].image ? (
                          <img
                            src={projects[1].image}
                            alt={projects[1].title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent/30 to-primary/30" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white font-medium text-sm">{projects[1].title}</p>
                          {projects[1].tools && projects[1].tools.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5">
                              {projects[1].tools.slice(0, 2).map((tool) => (
                                <span key={tool} className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">{tool}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Third Project */}
                  {projects[2] && (
                    <a href={`https://onvibe.dev/project/${projects[2].id}`} className="relative rounded-2xl overflow-hidden bg-card border border-border group">
                      <div className="aspect-[4/3]">
                        {projects[2].image ? (
                          <img
                            src={projects[2].image}
                            alt={projects[2].title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/40" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white font-medium text-sm">{projects[2].title}</p>
                          {projects[2].tools && projects[2].tools.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5">
                              {projects[2].tools.slice(0, 2).map((tool) => (
                                <span key={tool} className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">{tool}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
