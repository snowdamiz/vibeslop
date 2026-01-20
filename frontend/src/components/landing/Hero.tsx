import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles, Zap, Users, Heart, MessageCircle, BarChart3, MessageSquare, Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const rotatingWords = ['AI-native', 'vibe coding', 'prompt-driven', 'AI-powered']

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated background with gradient orbs */}
      <div className="absolute inset-0 gradient-bg" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.4, 0.3],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
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
        
        {/* Floating decorative elements */}
        <motion.div 
          className="absolute top-1/3 right-[12%] hidden lg:block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: [0, -12, 0],
            rotate: [0, 3, 0]
          }}
          transition={{ 
            opacity: { duration: 0.6, delay: 0.8 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Built with Cursor</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute top-1/2 left-[8%] hidden lg:block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: [0, -10, 0],
            rotate: [0, -2, 0]
          }}
          transition={{ 
            opacity: { duration: 0.6, delay: 1 },
            y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI-powered</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute bottom-1/3 right-[8%] hidden xl:block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: [0, -8, 0],
            rotate: [0, 2, 0]
          }}
          transition={{ 
            opacity: { duration: 0.6, delay: 1.2 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 },
            rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Ship faster</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
            The home for vibe coders
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Where{' '}
            <span className="relative inline-block min-w-[280px] sm:min-w-[340px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  className="gradient-text inline-block"
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
            Vibeslop is the portfolio platform for creators who build with AI. 
            Showcase your projects, share your process, and connect with fellow vibe coders.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Button size="lg" className="text-base px-8 glow">
              Start Building Your Portfolio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <Link to="/signin">
                View Projects
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground border-t border-border/50 pt-8">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span>
                <strong className="text-foreground">2,000+</strong> creators
              </span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>
                <strong className="text-foreground">5,000+</strong> projects
              </span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>
                <strong className="text-foreground">50+</strong> AI tools
              </span>
            </div>
          </div>
        </div>

        {/* Hero Image/Preview */}
        <motion.div 
          className="mt-16 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        >
          {/* Gradient fade removed - uncomment to restore: */}
          {/* <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" /> */}
          <div className="relative mx-auto max-w-5xl">
            {/* Animated gradient border */}
            <motion.div 
              className="absolute -inset-[1px] bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 rounded-2xl blur-sm"
              animate={{
                opacity: [0.4, 0.6, 0.4],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Main preview card */}
            <div className="relative bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              {/* Feed header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Live indicator */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium">Trending</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Following</span>
                </div>
                <div className="text-xs text-muted-foreground">vibeslop.com/feed</div>
              </div>
              
              {/* Feed content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/50">
                {[
                  { 
                    title: 'AI-Powered Analytics Dashboard', 
                    author: 'Sarah C.',
                    tools: ['Cursor', 'Claude'], 
                    likes: 234,
                    comments: 45,
                    Icon: BarChart3
                  },
                  { 
                    title: 'Conversational Data Explorer', 
                    author: 'Marcus J.',
                    tools: ['v0', 'GPT-4'], 
                    likes: 189,
                    comments: 32,
                    Icon: MessageSquare
                  },
                  { 
                    title: 'Generative Art Studio', 
                    author: 'Luna P.',
                    tools: ['Bolt', 'Claude'], 
                    likes: 312,
                    comments: 67,
                    Icon: Palette
                  },
                ].map((project, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    whileHover={{ 
                      y: -4, 
                      boxShadow: "0 12px 40px -12px oklch(0.55 0.25 285 / 0.15)",
                      transition: { duration: 0.2 }
                    }}
                    className="rounded-xl bg-card border border-border p-4 overflow-hidden cursor-pointer transition-colors hover:border-primary/30"
                  >
                    <div className="aspect-[16/10] rounded-lg mb-3 flex items-center justify-center bg-muted">
                      <project.Icon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                        {project.author.charAt(0)}
                      </div>
                      <span className="text-xs text-muted-foreground">{project.author}</span>
                    </div>
                    <h3 className="font-medium text-sm mb-2 line-clamp-1">{project.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {project.tools.map((tool) => (
                          <span key={tool} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {tool}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {project.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {project.comments}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
