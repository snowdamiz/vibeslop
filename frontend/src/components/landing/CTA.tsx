import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionDivider } from '@/components/ui/section-divider'
import { ArrowRight, Sparkles, Code2, Zap, Mail, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export function CTA() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubmitted(true)
      // Reset after showing success
      setTimeout(() => {
        setIsSubmitted(false)
        setEmail('')
      }, 3000)
    }
  }

  return (
    <section className="py-20 sm:py-28 bg-muted/50 relative overflow-hidden">
      <SectionDivider variant="wave" flip fillClassName="fill-background" />
      
      {/* Floating background icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-20 left-[10%] text-primary/10"
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-12 h-12" />
        </motion.div>
        <motion.div 
          className="absolute top-32 right-[15%] text-accent/10"
          animate={{ y: [0, 15, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <Code2 className="w-16 h-16" />
        </motion.div>
        <motion.div 
          className="absolute bottom-24 left-[20%] text-primary/10"
          animate={{ y: [0, -15, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        >
          <Zap className="w-10 h-10" />
        </motion.div>
        <motion.div 
          className="absolute bottom-32 right-[10%] text-accent/10"
          animate={{ y: [0, 20, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <Sparkles className="w-14 h-14" />
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          className="relative mx-auto max-w-3xl text-center bg-card border border-border rounded-2xl p-10 sm:p-14 shadow-xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Joined this week counter */}
          <motion.div 
            className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground/50 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
              </span>
              127 joined this week
            </span>
          </motion.div>

          {/* Content */}
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 mt-4">
            Ready to share your{' '}
            <span className="gradient-text">vibe?</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Join the community of AI-native builders. Create your portfolio, 
            share your process, and connect with fellow vibe coders today.
          </p>

          {/* Email Capture Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="h-12 px-6 glow"
              disabled={isSubmitted}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Subscribed!
                </>
              ) : (
                <>
                  Get Early Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Alternative CTA */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px bg-border flex-1 max-w-[80px]" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="h-px bg-border flex-1 max-w-[80px]" />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="text-base px-8">
              Create Your Portfolio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8">
              Learn More
            </Button>
          </div>

          {/* Trust indicators */}
          <p className="mt-6 text-sm text-muted-foreground">
            Free to start • No credit card required • Set up in 2 minutes
          </p>
        </motion.div>
      </div>
    </section>
  )
}
