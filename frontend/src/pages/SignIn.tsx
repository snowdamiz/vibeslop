import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Sparkles, Github } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export function SignIn() {
  const { login } = useAuth()

  const handleLogin = () => {
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
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.div>
          <span className="text-2xl font-bold tracking-tight">
            hype<span className="text-primary">vibe</span>
          </span>
        </Link>

        <Card className="border-border shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
              <p className="text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            {/* OAuth Button */}
            <Button
              size="lg"
              className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              onClick={handleLogin}
            >
              <Github className="w-5 h-5 mr-3" />
              Continue with GitHub
            </Button>

            {/* Info text */}
            <p className="text-sm text-center text-muted-foreground mt-6">
              By signing in, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </CardContent>
        </Card>

        {/* Sign up link */}
        <p className="text-center mt-6 text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
