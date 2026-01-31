import {
  Hero,
  FeaturedProjects,
  HowItWorks,
  AITools,
  Testimonials,
  CTA,
} from '@/components/landing'
import { useSEO } from '@/hooks/useSEO'
import { StructuredData, schemas } from '@/components/seo'

export function Landing() {
  useSEO({
    // Use defaults for homepage - title and description from index.html
  })

  return (
    <>
      <StructuredData schema={[schemas.organization(), schemas.website()]} />
      <Hero />
      <FeaturedProjects />
      <HowItWorks />
      <AITools />
      <Testimonials />
      <CTA />
    </>
  )
}
