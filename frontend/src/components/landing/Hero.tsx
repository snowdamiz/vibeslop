import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles } from 'lucide-react'
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
            onvibe is the portfolio platform for creators who build with AI.
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
        </div>

        {/* Project Showcase Grid */}
        <motion.div
          className="mt-16 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Simple 3-card grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Featured - Analytics Dashboard */}
              <div className="md:col-span-2 relative rounded-2xl overflow-hidden bg-card border border-border">
                <div className="aspect-[16/9]">
                  <img
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop"
                    alt="Analytics Dashboard"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium bg-primary/90 text-primary-foreground px-2 py-0.5 rounded-full">Featured</span>
                      <span className="text-[10px] text-white/70">by Sarah Chen</span>
                    </div>
                    <h3 className="text-white font-semibold text-lg">AI Analytics Dashboard</h3>
                    <p className="text-white/70 text-sm mt-1 hidden sm:block">Real-time insights powered by Claude</p>
                    <div className="flex gap-2 mt-3">
                      <span className="text-[10px] bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md text-white/90">Cursor</span>
                      <span className="text-[10px] bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md text-white/90">Claude</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stacked right column */}
              <div className="flex flex-col gap-4">
                {/* Code Review Bot */}
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
                  <div className="aspect-[4/3]">
                    <img
                      src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop"
                      alt="Code Editor"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-medium text-sm">Code Review Bot</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">GPT-4</span>
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">Cursor</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generative Art */}
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
                  <div className="aspect-[4/3]">
                    <img
                      src="https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=300&fit=crop"
                      alt="Generative Art"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-medium text-sm">Art Generator</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">Midjourney</span>
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">Bolt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
