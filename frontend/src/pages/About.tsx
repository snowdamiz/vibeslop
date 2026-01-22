import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { SectionDivider } from '@/components/ui/section-divider'
import { motion, useInView } from 'framer-motion'
import {
  Sparkles,
  Heart,
  Users,
  Target,
  Eye,
  Lightbulb,
  Shield,
  MessageCircle,
  Rocket,
  ArrowRight,
  Twitter,
  Github,
  Globe,
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

// Data
const values = [
  {
    icon: Sparkles,
    title: 'AI-Positive',
    description: 'We celebrate AI-augmented creation. No stigma, no judgment—just appreciation for what you\'ve built.',
  },
  {
    icon: Shield,
    title: 'No Gatekeeping',
    description: 'Every skill level is welcome. Whether it\'s your first prompt or your hundredth project, you belong here.',
  },
  {
    icon: Lightbulb,
    title: 'Process Over Perfection',
    description: 'The journey matters as much as the destination. Share your iterations, pivots, and learnings.',
  },
  {
    icon: Users,
    title: 'Community First',
    description: 'Built by builders, for builders. Your feedback shapes hypevibe\'s future.',
  },
  {
    icon: MessageCircle,
    title: 'Open Sharing',
    description: 'Prompts, techniques, and workflows—knowledge grows when shared freely.',
  },
  {
    icon: Rocket,
    title: 'Ship It',
    description: 'Done is better than perfect. We encourage launching, iterating, and improving in public.',
  },
]

const timeline = [
  {
    year: '2024',
    title: 'The Frustration',
    description: 'Vibe coders had no home. Twitter threads disappeared, GitHub felt too "serious," and other platforms judged AI-assisted work.',
  },
  {
    year: '2025',
    title: 'The Idea',
    description: 'What if there was a platform that celebrated the "how" as much as the "what"? A place where showing your AI workflow was a feature, not a flaw.',
  },
  {
    year: '2025',
    title: 'Building in Public',
    description: 'We dogfooded our own philosophy—building hypevibe with AI tools, sharing our process, and gathering feedback from the community.',
  },
  {
    year: '2026',
    title: 'Launch',
    description: 'hypevibe goes live. A new home for AI-native builders to showcase their work, share their process, and connect with each other.',
  },
]

const team = [
  {
    name: 'Alex Rivera',
    role: 'Founder & CEO',
    bio: 'Former indie hacker who built 12 AI-assisted projects before realizing the community needed a home.',
    initials: 'AR',
    color: 'from-blue-500 to-indigo-600',
    twitter: '#',
    github: '#',
  },
  {
    name: 'Jordan Chen',
    role: 'Co-Founder & CTO',
    bio: 'Elixir enthusiast and real-time systems architect. Believes the future of development is AI-augmented.',
    initials: 'JC',
    color: 'from-pink-500 to-rose-600',
    twitter: '#',
    github: '#',
  },
  {
    name: 'Sam Patel',
    role: 'Head of Community',
    bio: 'Career pivoter who learned to code with AI. Passionate about making tech accessible to everyone.',
    initials: 'SP',
    color: 'from-rose-500 to-orange-600',
    twitter: '#',
    github: '#',
  },
]

const stats = [
  { label: 'Creators', value: 2000, suffix: '+' },
  { label: 'Projects', value: 5000, suffix: '+' },
  { label: 'AI Tools', value: 50, suffix: '+' },
  { label: 'Countries', value: 45, suffix: '' },
]

// Animated counter component
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      const duration = 2000
      const steps = 60
      const increment = value / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }
  }, [isInView, value])

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  )
}

export function About() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-bg" />
        <motion.div
          className="absolute top-1/4 -left-32 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
              About hypevibe
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              The home for{' '}
              <span className="gradient-text">AI-native</span> builders
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              We're building the portfolio platform that celebrates how you create, 
              not just what you create. Where showing your AI workflow is a feature, not a flaw.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-20 sm:py-28 bg-muted/30 relative">
        <SectionDivider variant="wave" flip fillClassName="fill-background" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    To create a welcoming space where AI-native builders can showcase their work, 
                    share their process, and connect with like-minded creators—without hiding how they build.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="h-full border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                    <Eye className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    A world where AI-augmented development is celebrated, not stigmatized. 
                    Where the process is as valued as the product, and every builder has a place to grow.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
        <SectionDivider variant="curve" fillClassName="fill-background" />
      </section>

      {/* Our Story Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4">
              Our Journey
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              How hypevibe <span className="gradient-text">came to be</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Born from frustration, built with passion, shaped by community.
            </p>
          </motion.div>

          {/* Timeline */}
          <motion.div
            className="relative max-w-3xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden sm:block" />

            {timeline.map((item, index) => (
              <motion.div
                key={index}
                className="relative pl-0 sm:pl-20 pb-12 last:pb-0"
                variants={itemVariants}
              >
                {/* Timeline dot */}
                <div className="absolute left-6 top-1 w-4 h-4 rounded-full bg-primary border-4 border-background hidden sm:block" />
                
                {/* Year badge */}
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {item.year}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 sm:py-28 bg-muted/30 relative">
        <SectionDivider variant="wave" flip fillClassName="fill-background" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4">
              What We Believe
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Our <span className="gradient-text">Core Values</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we build and every decision we make.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {values.map((value, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full border-border hover:border-primary/30 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                      <value.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <SectionDivider variant="curve" fillClassName="fill-background" />
      </section>

      {/* Stats Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4">
              Our Impact
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Growing <span className="gradient-text">every day</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A thriving community of builders from around the world.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center p-6 rounded-2xl bg-muted/50 border border-border"
                variants={itemVariants}
              >
                <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 sm:py-28 bg-muted/30 relative">
        <SectionDivider variant="wave" flip fillClassName="fill-background" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4">
              The Humans
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Meet the <span className="gradient-text">Team</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're builders too—and we use AI every day to create hypevibe.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {team.map((member, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full border-border hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-offset-4 ring-offset-background ring-primary/20">
                      <AvatarImage src={`https://i.pravatar.cc/150?img=${20 + index}`} alt={member.name} />
                      <AvatarFallback className={`bg-gradient-to-br ${member.color} text-white text-xl font-semibold`}>
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                    <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {member.bio}
                    </p>
                    <div className="flex justify-center gap-2">
                      <a
                        href={member.twitter}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      >
                        <Twitter className="w-4 h-4" />
                      </a>
                      <a
                        href={member.github}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <SectionDivider variant="curve" fillClassName="fill-background" />
      </section>

      {/* Community Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-border p-8 sm:p-12 lg:p-16 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

            <div className="relative text-center max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-6">
                  <Heart className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Community First</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                  Where <span className="gradient-text">vibe coders</span> belong
                </h2>

                <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                  hypevibe explicitly celebrates AI-augmented creation. No stigma around "AI slop." 
                  No judgment about how you built it. Just genuine excitement about what you've created.
                </p>

                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Whether you're a weekend viber experimenting with new tools, a career pivoter building your first portfolio, 
                  or an indie hacker shipping MVPs—there's a place for you here.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="glow">
                    Join the Community
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/">
                      <Globe className="mr-2 h-4 w-4" />
                      View Projects
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
