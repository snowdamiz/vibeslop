import { Badge } from '@/components/ui/badge'
import { Upload, Sparkles, Share2, Users } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
  {
    icon: Upload,
    title: 'Share Your Project',
    description: 'Upload screenshots, add a description, and link to your live demo or repository. It takes less than 2 minutes.',
  },
  {
    icon: Sparkles,
    title: 'Show Your Process',
    description: 'Add the AI tools you used, share effective prompts, and document your journey from idea to deployment.',
  },
  {
    icon: Share2,
    title: 'Get Discovered',
    description: 'Your work appears in the feed. Get likes, comments, and feedback from fellow builders.',
  },
  {
    icon: Users,
    title: 'Build Your Network',
    description: 'Connect with other vibe coders, find collaborators, and grow your professional presence.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
} as const

const stepVariants = {
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

const iconVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 150,
      damping: 20,
    },
  },
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 relative">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-4">
            Simple Process
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            How hypevibe Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your AI-assisted projects in minutes. No gatekeeping, no judgment—just builders helping builders.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, index) => (
            <motion.div key={index} className="relative group" variants={stepVariants}>
              {/* Animated connector line with endpoint dots */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-9 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)]">
                  {/* Start dot */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/40" />
                  {/* Line */}
                  <motion.div
                    className="h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.2 + 0.3, ease: 'easeOut' }}
                    style={{ transformOrigin: 'left' }}
                  />
                  {/* End dot */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/40" />
                </div>
              )}

              {/* Card with hover effect */}
              <div className="text-center p-6 rounded-2xl transition-all duration-300 hover:bg-muted/50">
                {/* Icon with integrated number */}
                <motion.div
                  className="relative inline-flex mb-5"
                  variants={iconVariants}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="w-[72px] h-[72px] rounded-xl bg-muted/70 border border-border shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors duration-300">
                    <step.icon className="w-7 h-7 text-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <motion.div
                    className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shadow-sm"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.1 + 0.2 }}
                  >
                    {index + 1}
                  </motion.div>
                </motion.div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
