'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Github, Mail, Google } from 'lucide-react'
import Link from 'next/link'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(true)

  const handleGoogleLogin = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/auth/login/google`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
      },
      mode: 'cors',
      })

      if (!response.ok) {
        alert('Failed to initiate Google login')
        return
      }

      const { url } = await response.json()
      window.location.href = url // Redirect to Google OAuth
    } catch (error) {
      console.error('Error during Google login:', error)
      alert('Something went wrong during login.')
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-900 to-blue-900 p-4 relative overflow-hidden">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="rounded-lg bg-white/10 shadow-xl backdrop-blur-md text-white">
          <div className="p-8">
            <div className="mb-4 text-center">
              <h1 className="text-2xl font-bold text-teal-300">Welcome to OtterFlow</h1>
              <p className="text-teal-200">Routing Smarter, Saving Faster, Delivering Better</p>
            </div>
            <Tabs defaultValue={isSignUp ? "signup" : "login"} className="w-full" onValueChange={(value) => setIsSignUp(value === "signup")}>
              <TabsList className="grid w-full grid-cols-2 bg-teal-800/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-teal-700">Login</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-teal-700">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="m@example.com" required type="email" className="bg-teal-800/30 border-teal-600" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" required type="password" className="bg-teal-800/30 border-teal-600" />
                  </div>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">Log in</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="m@example.com" required type="email" className="bg-teal-800/30 border-teal-600" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" required type="password" className="bg-teal-800/30 border-teal-600" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input id="company" placeholder="Your Company Name" className="bg-teal-800/30 border-teal-600" />
                  </div>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">Sign up</Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-teal-400/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-teal-900/50 px-2 text-teal-300">Or continue with</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 justify-center gap-4">

                <Button variant="outline" className="border-teal-600 justify-center text-teal-300 hover:bg-teal-800/50 flex items-center justify-center col-span-2" onClick={handleGoogleLogin}>
                  <Mail className="mr-2 h-4 w-4" />
                  Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              <Link href="#" className="text-teal-400 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

