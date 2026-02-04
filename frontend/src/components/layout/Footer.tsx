import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Zap, CheckCircle2 } from 'lucide-react'
import { OnvibeLogo } from '@/components/icons/OnvibeLogo'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const footerLinks = {
  product: [
    { name: 'Home', href: '/', isInternal: true },
    { name: 'Explore', href: '/explore', isInternal: true },
    { name: 'Gigs', href: '/gigs', isInternal: true },
  ],
  resources: [
    { name: 'Sign In', href: '/signin', isInternal: true },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy', isInternal: true },
    { name: 'Terms', href: '/terms', isInternal: true },
  ],
}

export function Footer() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubscribed(true)
      setTimeout(() => {
        setIsSubscribed(false)
        setEmail('')
      }, 3000)
    }
  }

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 w-fit">
              <OnvibeLogo className="w-8 h-8" />
              <span className="text-lg font-bold tracking-tight">
                on<span className="text-primary">vibe</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              The portfolio platform for AI-native builders. Show your work, share your process.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Account</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Onvibe. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs font-normal">
              <Zap className="w-3 h-3 mr-1 text-primary" />
              This site was vibe coded
            </Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">•</span>
            <p className="text-sm text-muted-foreground hidden sm:inline">
              Built with AI by AI-native developers
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
