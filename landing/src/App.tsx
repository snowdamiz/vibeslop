import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/landing/Hero'
import { FeaturedProjects } from '@/components/landing/FeaturedProjects'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { AITools } from '@/components/landing/AITools'
import { Testimonials } from '@/components/landing/Testimonials'
import { CTA } from '@/components/landing/CTA'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <FeaturedProjects />
        <HowItWorks />
        <AITools />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}

export default App
