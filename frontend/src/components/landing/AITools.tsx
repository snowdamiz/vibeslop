import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionDivider } from '@/components/ui/section-divider'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const toolsByCategory = {
  'IDE': ['Cursor', 'Copilot', 'Windsurf', 'Replit AI'],
  'LLM': ['Claude', 'ChatGPT', 'GPT-4', 'Gemini'],
  'Full-Stack': ['Bolt', 'Lovable', 'v0'],
  'Image': ['Midjourney', 'DALL-E', 'Stable Diffusion'],
  'Agent': ['Devin'],
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

export function AITools() {
  return (
    <section id="tools" className="py-20 sm:py-28 bg-muted/50 relative">
      <SectionDivider variant="wave" flip fillClassName="fill-background" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4">
              50+ AI Tools
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
              Built with the tools{' '}
              <span className="gradient-text">you love</span>
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Tag your projects with the AI tools you used. Whether it's Cursor, Claude, v0, Bolt,
              or any other AI assistant—we celebrate all workflows.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Discover what others are building with your favorite tools, learn new techniques,
              and find the perfect stack for your next project.
            </p>
            <Button className="glow" asChild>
              <Link to="/signin">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Tools by Category */}
          <motion.div
            className="space-y-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {Object.entries(toolsByCategory).map(([category, tools]) => (
              <motion.div key={category} variants={itemVariants}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  {category}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tools.map((tool) => (
                    <motion.div
                      key={tool}
                      className="px-3.5 py-1.5 rounded-lg bg-background border border-border text-sm font-medium hover:border-primary/50 hover:text-primary transition-all duration-200 cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {tool}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* More tools indicator */}
            <motion.div className="pt-2" variants={itemVariants}>
              <span className="text-sm text-muted-foreground">
                + 35 more tools supported
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
      <SectionDivider variant="curve" fillClassName="fill-background" />
    </section>
  )
}

