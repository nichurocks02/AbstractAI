'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button" // Ensure default export
import { Input } from "@/components/ui/input"   // Ensure default export
import { Label } from "@/components/ui/label"   // Ensure default export
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Ensure default exports
import { Github, Mail } from 'lucide-react'
import Link from 'next/link'
import AnimatedBackground from '@/components/AnimatedBackground'
import { toast, ToastContainer } from 'react-toastify' // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'
import { useRouter } from 'next/navigation' // Import Next.js router

console.log('Button:', Button);
console.log('Input:', Input);
console.log('Label:', Label);
console.log('Tabs:', Tabs);
console.log('TabsContent:', TabsContent);
console.log('TabsList:', TabsList);
console.log('TabsTrigger:', TabsTrigger);
console.log('AnimatedBackground:', AnimatedBackground);
console.log('ToastContainer:', ToastContainer);
export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(true)
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'verify_email' | 'forgot_password' | 'reset_password'>('form')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
  })
  const [otpData, setOtpData] = useState({
    email: '',
    otp: '',
    new_password: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    if (step === 'form') {
      setFormData(prev => ({ ...prev, [id]: value }))
    } else {
      setOtpData(prev => ({ ...prev, [id]: value }))
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          company: formData.company,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        setStep('verify_email')
        setOtpData(prev => ({ ...prev, email: formData.email }))
      } else {
        toast.error(data.detail || 'Signup failed')
      }
    } catch (error) {
      console.error('Error during signup:', error)
      toast.error('Something went wrong during signup.')
    }
  }

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpData.email,
          otp: otpData.otp,
        }),
        mode: 'cors',
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        setStep('form')
        setFormData({
          email: '',
          password: '',
          name: '',
          company: '',
        })
        setOtpData({
          email: '',
          otp: '',
          new_password: '',
        })
      } else {
        toast.error(data.detail || 'Email verification failed')
      }
    } catch (error) {
      console.error('Error during email verification:', error)
      toast.error('Something went wrong during email verification.')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Debugging: Log form data
    //console.log('Logging in with:', formData.email, formData.password)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in the request
        mode: 'cors',           // Ensure CORS mode
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })
      console.log('Cookies after login:', document.cookie)


      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Logged in successfully')
        // Redirect to dashboard
        const cookies = response.headers.get('set-cookie')
        console.log('Set-Cookie Header:', cookies)
        router.push('/dashboard')
      } else {
        // Attempt to parse error message
        let errorDetail = 'Login failed'
        try {
          const errorData = await response.json()
          errorDetail = errorData.detail || errorDetail
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        toast.error(errorDetail)
      }
    } catch (error) {
      console.error('Error during login:', error)
      toast.error('Something went wrong during login.')
    }
}
  

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        setStep('reset_password')
        setOtpData(prev => ({ ...prev, email: formData.email }))
      } else {
        toast.error(data.detail || 'Failed to send password reset OTP')
      }
    } catch (error) {
      console.error('Error during forgot password:', error)
      toast.error('Something went wrong during forgot password.')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpData.email,
          otp: otpData.otp,
          new_password: otpData.new_password,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        setStep('form')
        setFormData({
          email: '',
          password: '',
          name: '',
          company: '',
        })
        setOtpData({
          email: '',
          otp: '',
          new_password: '',
        })
      } else {
        toast.error(data.detail || 'Password reset failed')
      }
    } catch (error) {
      console.error('Error during password reset:', error)
      toast.error('Something went wrong during password reset.')
    }
  }

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
        toast.error('Failed to initiate Google login')
        return
      }

      const { url } = await response.json()
      window.location.href = url // Redirect to Google OAuth
    } catch (error) {
      console.error('Error during Google login:', error)
      toast.error('Something went wrong during login.')
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
            <Tabs
              defaultValue={isSignUp ? "signup" : "login"}
              className="w-full"
              onValueChange={(value) => {
                setIsSignUp(value === "signup")
                setStep('form') // Reset to form step when switching tabs
                setFormData({
                  email: '',
                  password: '',
                  name: '',
                  company: '',
                })
                setOtpData({
                  email: '',
                  otp: '',
                  new_password: '',
                })
              }}
            >
              <TabsList className="grid w-full grid-cols-2 bg-teal-800/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-teal-700">Login</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-teal-700">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                {step === 'form' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="m@example.com"
                        required
                        type="email"
                        className="bg-teal-800/30 border-teal-600"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        required
                        type="password"
                        className="bg-teal-800/30 border-teal-600"
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                    </div>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700">Log in</Button>
                  </form>
                )}
                {step === 'forgot_password' && (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="m@example.com"
                        required
                        type="email"
                        className="bg-teal-800/30 border-teal-600"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700">Send Reset OTP</Button>
                  </form>
                )}
              </TabsContent>
              <TabsContent value="signup">
                {step === 'form' && (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="m@example.com"
                        required
                        type="email"
                        className="bg-teal-800/30 border-teal-600"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        required
                        type="password"
                        className="bg-teal-800/30 border-teal-600"
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Your Full Name"
                        required
                        type="text"
                        className="bg-teal-800/30 border-teal-600"
                        value={formData.name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company (Optional)</Label>
                      <Input
                        id="company"
                        placeholder="Your Company Name"
                        className="bg-teal-800/30 border-teal-600"
                        value={formData.company}
                        onChange={handleInputChange}
                      />
                    </div>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700">Sign up</Button>
                  </form>
                )}
                {step === 'verify_email' && (
                  <form onSubmit={handleVerifyEmail} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        placeholder="123456"
                        required
                        type="text"
                        className="bg-teal-800/30 border-teal-600"
                        value={otpData.otp}
                        onChange={handleInputChange}
                      />
                      {/* Hidden input to retain the user's email */}
                      <input type="hidden" id="email" value={otpData.email} />
                    </div>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700">Verify Email</Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
            {/* Conditional Rendering for OTP and Password Reset Steps */}
            {step === 'reset_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter Reset OTP</Label>
                  <Input
                    id="otp"
                    placeholder="123456"
                    required
                    type="text"
                    className="bg-teal-800/30 border-teal-600"
                    value={otpData.otp}
                    onChange={handleInputChange}
                  />
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    placeholder="New Password"
                    required
                    type="password"
                    className="bg-teal-800/30 border-teal-600"
                    value={otpData.new_password}
                    onChange={handleInputChange}
                  />
                  {/* Hidden input to retain the user's email */}
                  <input type="hidden" id="email" value={otpData.email} />
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-700">Reset Password</Button>
              </form>
            )}
            {/* Google OAuth and Other Actions */}
            {step === 'form' && (
              <>
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
                    <Button
                      variant="outline"
                      className="border-teal-600 justify-center text-teal-300 hover:bg-teal-800/50 flex items-center justify-center col-span-2"
                      onClick={handleGoogleLogin}
                    >
                      <Mail className="mr-2 h-4 w-4" /> 
                      Google
                    </Button>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm">
                  {isSignUp ? (
                    <Link href="#" className="text-teal-400 hover:underline" onClick={() => setStep('form')}>
                      Already have an account? Login
                    </Link>
                  ) : (
                    <Link href="#" className="text-teal-400 hover:underline" onClick={() => setStep('forgot_password')}>
                      Forgot password?
                    </Link>
                  )}
                </div>
              </>
            )}
            {/* Conditional Rendering for Forgot Password and Back Links */}
            {step === 'forgot_password' && (
              <div className="mt-4 text-center text-sm">
                <Link href="#" className="text-teal-400 hover:underline" onClick={() => setStep('form')}>
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
      <ToastContainer /> {/* Add ToastContainer for react-toastify */}
    </div>
  )
}

