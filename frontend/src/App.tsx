import { Header, Footer } from '@/components/layout'
import {
  Hero,
  FeaturedProjects,
  HowItWorks,
  AITools,
  Testimonials,
  CTA,
} from '@/components/landing'

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
