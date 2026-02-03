import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Github, Zap, Users, Share2, Sparkles } from 'lucide-react'
import { OnvibeLogo } from '@/components/icons/OnvibeLogo'
import { useAuth } from '@/context/AuthContext'

const features = [
  { icon: Zap, text: 'Showcase AI-built projects' },
  { icon: Share2, text: 'Share prompts & process' },
  { icon: Users, text: 'Connect with builders' },
]

export function SignUp() {
  const { login } = useAuth()

  const handleSignUp = () => {
    // Just call login - it will redirect to GitHub OAuth
    // No need to navigate, the OAuth flow handles the redirect
    login()
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg" />
      <motion.div
        className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]"
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
        className="absolute bottom-1/3 -right-32 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px]"
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <motion.div
            className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <OnvibeLogo className="w-5 h-5 text-primary" />
          </motion.div>
          <span className="text-2xl font-bold tracking-tight">
            on<span className="text-primary">vibe</span>
          </span>
        </Link>

        <Card className="border-border shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="w-3 h-3 mr-1.5 text-primary" />
                Free to join
              </Badge>
              <h1 className="text-2xl font-bold mb-2">Create your account</h1>
              <p className="text-muted-foreground">
                Join the community of AI-native builders
              </p>
            </div>

            {/* Features */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <motion.li
                    key={index}
                    className="flex items-center gap-3 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span>{feature.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* OAuth Button */}
            <Button
              size="lg"
              className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              onClick={handleSignUp}
            >
              <Github className="w-5 h-5 mr-3" />
              Sign up with GitHub
            </Button>

            {/* Info text */}
            <p className="text-sm text-center text-muted-foreground mt-6">
              By signing up, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </CardContent>
        </Card>

        {/* Sign in link */}
        <p className="text-center mt-6 text-muted-foreground">
          Already have an account?{' '}
          <Link to="/signin" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
