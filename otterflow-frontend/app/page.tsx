'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowRight, Brain, Cpu, BarChart, Database, Zap } from 'lucide-react'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '@/components/AnimatedBackground'
import { ToastContainer } from 'react-toastify' // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css' // Import Toastify CSS

export default function LandingPage() {
  const controls = useAnimation()
  const router = useRouter()
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    controls.start(i => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2 }
    }))
  }, [controls])

  const handleGetStarted = () => {
    router.push('/auth')
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={`flex flex-col min-h-screen bg-gradient-to-br from-teal-900 to-blue-900 text-white relative overflow-hidden ${darkMode ? 'dark' : ''}`}>
      <AnimatedBackground />
      <div className="relative z-10">
        <header className="px-4 lg:px-6 h-14 flex items-center bg-white/10 backdrop-blur-md">
          <Link className="flex items-center justify-center" href="#">
            <span className="text-xl font-bold text-white">OtterFlow</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 sm:gap-6">
            <Link className="text-sm font-medium hover:text-teal-400 transition-colors" href="#features">
              Features
            </Link>
            <Link className="text-sm font-medium hover:text-teal-400 transition-colors" href="#testimonials">
              Testimonials
            </Link>
            <Link className="text-sm font-medium hover:text-teal-400 transition-colors" href="#pricing">
              Pricing
            </Link>
            <Link className="text-sm font-medium hover:text-teal-400 transition-colors" href="/onboarding">
              Onboarding
            </Link>
            <Link href="/auth" passHref>
              <Button variant="ghost" className="text-sm font-medium hover:text-teal-400 transition-colors">
                Login
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="w-10 h-10 p-0">
              <Zap className="h-4 w-4" />
            </Button>
          </nav>
        </header>
        <main className="flex-1">
          <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
            <div className="container px-4 md:px-6 mx-auto"> {/* Added mx-auto */}
              <div className="flex flex-col items-center space-y-4 text-center">
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={controls}
                  custom={0}
                  className="space-y-2"
                >
                  <div className="flex justify-center mb-6">
                    <Image 
                      src="/images/otter-character.png"
                      alt="OtterFlow mascot" 
                      width={200} 
                      height={200} 
                      className="rounded-2xl"
                    />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    OtterFlow
                  </h1>
                  <p className="mx-auto max-w-[700px] text-teal-200 dark:text-teal-300 md:text-xl">
                    Routing Smarter, Saving Faster, Delivering Better
                  </p>
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0, y: 50 }}
                  animate={controls}
                  custom={1}
                  className="mx-auto max-w-[700px] text-gray-300 dark:text-gray-200 md:text-lg"
                >
                  Optimize your AI development with intelligent LLM routing and enhanced performance.
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={controls}
                  custom={2}
                  className="space-x-4"
                >
                  <Button variant="outline" className="bg-teal-600 text-white border-white hover:bg-white/20 dark:bg-teal-500 dark:hover:bg-teal-600" onClick={handleGetStarted}>
                    Get Started
                  </Button>
                  <Button variant="outline" className="bg-teal-600 text-white border-white hover:bg-white/20 dark:border-teal-400 dark:text-teal-400 dark:hover:bg-teal-400/20">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </section>
          <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-teal-800 to-blue-800 dark:from-teal-900 dark:to-blue-900 backdrop-blur-md">
            <div className="container px-4 md:px-6 mx-auto"> {/* Added mx-auto */}
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8">Key Features</h2>
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 justify-items-center"> {/* Added justify-items-center */}
                <FeatureCard
                  icon={<Brain className="h-10 w-10 text-teal-400" />}
                  title="Intelligent Model Routing"
                  description="Automatically selects the best LLM for each prompt, optimizing for cost, speed, and quality."
                />
                <FeatureCard
                  icon={<Cpu className="h-10 w-10 text-blue-400" />}
                  title="Algorithmic Enhancements"
                  description="Incorporates advanced techniques like Chain of Thought and Mixture of Agents to improve performance."
                />
                <FeatureCard
                  icon={<Database className="h-10 w-10 text-teal-400" />}
                  title="Local Model Utilization"
                  description="Deploy small, efficient models locally for fast and secure handling of prompts."
                />
                <FeatureCard
                  icon={<BarChart className="h-10 w-10 text-blue-400" />}
                  title="Benchmarking & Caching"
                  description="Ensures consistent, high-quality responses and reduces latency by reusing previous outputs."
                />
              </div>
            </div>
          </section>
          <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-blue-900/50 dark:bg-blue-950/50 backdrop-blur-md">
            <div className="container px-4 md:px-6 mx-auto"> {/* Added mx-auto */}
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8">What Our Users Say</h2>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 justify-items-center"> {/* Added justify-items-center */}
                <TestimonialCard
                  quote="OtterFlow has revolutionized our AI development process. We've seen a 40% reduction in costs and a significant boost in performance."
                  author="Jane Doe, CTO at TechCorp"
                />
                <TestimonialCard
                  quote="The flexibility and optimization provided by OtterFlow have allowed us to scale our AI operations efficiently."
                  author="John Smith, AI Lead at InnovateCo"
                />
                <TestimonialCard
                  quote="OtterFlow's intelligent routing and local model utilization have dramatically improved our response times and security."
                  author="Alice Johnson, Head of AI Research at DataDynamics"
                />
              </div>
            </div>
          </section>
          <section id="cta" className="w-full py-12 md:py-24 lg:py-32 bg-teal-800/50 dark:bg-teal-900/50 backdrop-blur-md">
            <div className="container px-4 md:px-6 mx-auto"> {/* Added mx-auto */}
              <div className="flex flex-col items-center space-y-4 text-center">
                <motion.h2 
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl"
                >
                  Ready to Optimize Your AI?
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mx-auto max-w-[600px] text-teal-100 dark:text-teal-200 md:text-xl"
                >
                  Join the growing number of companies leveraging OtterFlow to revolutionize their AI development process.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Button className="bg-white text-teal-800 hover:bg-teal-100 dark:bg-teal-200 dark:text-teal-900 dark:hover:bg-teal-300" onClick={handleGetStarted}>
                    Get Started Now
                  </Button>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
        <footer className="py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-teal-800/20 bg-teal-900/50 dark:bg-teal-950/50 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between mx-auto"> {/* Added justify-center and mx-auto */}
            <div className="flex items-center gap-2">
              <Image 
                src="/images/otter-character.png" 
                alt="OtterFlow mascot" 
                width={24} 
                height={24} 
                className="rounded-full"
              />
              <p className="text-xs text-teal-300 dark:text-teal-400">© 2024 OtterFlow. All rights reserved.</p>
            </div>
            <nav className="flex gap-4 sm:gap-6 mt-4 sm:mt-0">
              <Link className="text-xs hover:underline underline-offset-4 text-teal-300 hover:text-teal-100 dark:text-teal-400 dark:hover:text-teal-200" href="#">
                Terms of Service
              </Link>
              <Link className="text-xs hover:underline underline-offset-4 text-teal-300 hover:text-teal-100 dark:text-teal-400 dark:hover:text-teal-200" href="#">
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </div>
      {/* Include ToastContainer if not already included globally */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center p-4 bg-white/10 dark:bg-white/5 rounded-lg backdrop-blur-md"
    >
      <div className="mb-4 rounded-full bg-teal-500/20 dark:bg-teal-400/20 p-3">{icon}</div>
      <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
      <p className="text-sm text-teal-100 dark:text-teal-200">{description}</p>
    </motion.div>
  )
}

function TestimonialCard({ quote, author }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-teal-400/20 bg-teal-800/30 dark:bg-teal-900/30 p-6 backdrop-blur-md"
    >
      <p className="mb-4 text-teal-100 dark:text-teal-200">{quote}</p>
      <p className="font-semibold text-teal-300 dark:text-teal-400">{author}</p>
    </motion.div>
  )
}
