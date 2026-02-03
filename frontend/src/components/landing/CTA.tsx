import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SectionDivider } from '@/components/ui/section-divider'
import { ArrowRight, Sparkles, Code2, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export function CTA() {
  return (
    <section className="py-20 sm:py-28 bg-muted/50 relative overflow-hidden">
      <SectionDivider variant="wave" flip fillClassName="fill-background" />

      {/* Floating background icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-20 left-[10%] text-primary/[0.06]"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-12 h-12" />
        </motion.div>
        <motion.div
          className="absolute top-32 right-[15%] text-accent/[0.06]"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        >
          <Code2 className="w-16 h-16" />
        </motion.div>
        <motion.div
          className="absolute bottom-24 left-[20%] text-primary/[0.06]"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <Zap className="w-10 h-10" />
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-[10%] text-accent/[0.06]"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        >
          <Sparkles className="w-14 h-14" />
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="relative mx-auto max-w-3xl text-center bg-card border border-border rounded-2xl p-10 sm:p-14 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Content */}
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to share your{' '}
            <span className="gradient-text">vibe?</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Join the community of AI-native builders. Create your portfolio,
            share your process, and connect with fellow vibe coders today.
          </p>

          {/* CTA Button */}
          <Button size="lg" className="text-base px-8 glow" asChild>
            <Link to="/signin">
              Create Your Portfolio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {/* Trust indicators */}
          <p className="mt-6 text-sm text-muted-foreground">
            Free to start • No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  )
}
