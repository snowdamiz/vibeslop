import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

const testimonials = [
  {
    quote: "Finally, a place where I can show off my AI-assisted projects without feeling like I need to hide how I built them. The community is incredibly supportive.",
    author: "Casey Martinez",
    role: "Weekend Viber",
    initials: "CM",
    projects: 12,
    color: "from-blue-500 to-indigo-600",
  },
  {
    quote: "I landed my first dev job because a recruiter found my hypevibe portfolio. They loved that I showed my process and the prompts I used.",
    author: "Jordan Kim",
    role: "Career Pivoter",
    initials: "JK",
    projects: 8,
    color: "from-pink-500 to-rose-600",
  },
  {
    quote: "As an indie hacker, I was posting everywhere. Now hypevibe is my home base. My projects get real feedback from people who understand the vibe.",
    author: "Alex Chen",
    role: "Indie Hacker",
    initials: "AC",
    projects: 23,
    color: "from-rose-500 to-pink-600",
  },
  {
    quote: "The community here actually gets it. No judgment about using AI - just genuine excitement about what you've built and how you built it.",
    author: "Priya Sharma",
    role: "Full-Stack Builder",
    initials: "PS",
    projects: 15,
    color: "from-orange-500 to-red-600",
  },
  {
    quote: "hypevibe helped me document my learning journey. Looking back at my first AI projects versus now is incredible motivation.",
    author: "Marcus Johnson",
    role: "AI Enthusiast",
    initials: "MJ",
    projects: 31,
    color: "from-pink-500 to-rose-600",
  },
  {
    quote: "Found two amazing collaborators here for my startup. The quality of builders on this platform is unmatched.",
    author: "Sophie Liu",
    role: "Startup Founder",
    initials: "SL",
    projects: 7,
    color: "from-indigo-500 to-blue-600",
  },
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const itemsPerView = 3

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }, [])

  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isPaused, nextSlide])

  const getVisibleTestimonials = () => {
    const visible = []
    for (let i = 0; i < itemsPerView; i++) {
      visible.push(testimonials[(currentIndex + i) % testimonials.length])
    }
    return visible
  }

  return (
    <section className="py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-4">
            Community
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Loved by Vibe Coders
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of builders who've found their home on hypevibe.
          </p>
        </motion.div>

        {/* Testimonials Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors hidden md:flex"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors hidden md:flex"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Cards Container */}
          <div className="grid md:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {getVisibleTestimonials().map((testimonial, index) => (
                <motion.div
                  key={`${testimonial.author}-${currentIndex}-${index}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.08 }}
                >
                  <Card
                    className={`relative overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-300 h-full ${index === 1 ? 'md:-translate-y-1 ring-1 ring-primary/15' : ''
                      }`}
                  >
                    <CardContent className="p-6">
                      {/* Stars */}
                      <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                        ))}
                      </div>

                      {/* Quote */}
                      <p className="text-foreground mb-6 leading-relaxed tracking-[-0.01em]">
                        "{testimonial.quote}"
                      </p>

                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        <Avatar className="w-10 h-10 ring-2 ring-offset-2 ring-offset-background ring-primary/20">
                          <AvatarImage src={`https://i.pravatar.cc/150?img=${30 + currentIndex}`} alt={testimonial.author} />
                          <AvatarFallback className={`bg-gradient-to-br ${testimonial.color} text-white text-sm font-medium`}>
                            {testimonial.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{testimonial.author}</p>
                          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-primary">{testimonial.projects}</p>
                          <p className="text-[10px] text-muted-foreground">projects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-1.5 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                    ? 'w-6 bg-primary'
                    : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40'
                  }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
